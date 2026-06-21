// Simulation tick logic: moves the aircraft along its route,
// updates light states, handles incidents and rerouting.

import type { Aircraft, AirportEdge, SimulationConfig, SimulationState } from '../types';
import { airportGraph } from '../data/airportGraph';
import { getAircraftSpec } from '../data/aircraftTypes';
import { findPath, routeToEdges, estimateTravelTimeSeconds } from './pathfinding';

const KNOTS_TO_MS = 0.5144;
// How many edges ahead to light green
const GREEN_LIGHT_LOOKAHEAD = 4;

/** Apply weather speed penalty (fraction of max speed to use) */
export function weatherSpeedFactor(config: SimulationConfig): number {
  switch (config.weather) {
    case 'fog':          return 0.45;
    case 'thunderstorm': return 0.35;
    case 'rain':         return 0.70;
    default:             return 1.00;
  }
}

/** Apply traffic speed penalty */
export function trafficSpeedFactor(config: SimulationConfig): number {
  switch (config.trafficLevel) {
    case 'high':   return 0.55;
    case 'medium': return 0.75;
    default:       return 1.00;
  }
}

/**
 * Effective taxi speed (kts) taking aircraft type, weather and traffic into
 * account. The selected aircraft type sets both a speed multiplier and a
 * per-type taxi-speed ceiling, so different types move (and arrive) differently.
 */
export function effectiveTaxiSpeedKts(config: SimulationConfig): number {
  const spec = getAircraftSpec(config.aircraftType);
  const baseSpeed = Math.min(config.taxiSpeedKts, spec.maxTaxiKts);
  return baseSpeed * spec.speedFactor * weatherSpeedFactor(config) * trafficSpeedFactor(config);
}

/** Build the initial set of blocked edge IDs from incident + edge statuses */
export function buildBlockedEdgeIds(
  config: SimulationConfig,
  edges: AirportEdge[]
): Set<string> {
  const blocked = new Set<string>();

  // Edges that are closed/restricted in the graph
  for (const e of edges) {
    if (e.status === 'closed' || e.status === 'restricted') {
      blocked.add(e.id);
    }
  }

  // Incident overlay
  if (config.incidentEdgeId && config.incident !== 'none') {
    blocked.add(config.incidentEdgeId);
  }

  return blocked;
}

/** Compute light states for all edges based on aircraft position and route */
export function computeLightStates(
  aircraft: Aircraft,
  blockedEdgeIds: Set<string>
): Record<string, 'green' | 'red' | 'off'> {
  const lights: Record<string, 'green' | 'red' | 'off'> = {};

  if (!aircraft.assignedRoute.length) return lights;

  const allEdges = airportGraph.edges;

  // Determine which edges are on the route ahead of the aircraft
  const routeEdgeIds = routeToEdges(aircraft.assignedRoute, allEdges) ?? [];

  for (const edge of allEdges) {
    if (blockedEdgeIds.has(edge.id)) {
      lights[edge.id] = 'red';
      continue;
    }

    const idxInRoute = routeEdgeIds.indexOf(edge.id);
    if (idxInRoute === -1) {
      lights[edge.id] = 'off';
      continue;
    }

    // Current edge index the aircraft is on
    const currentEdgeRouteIdx = aircraft.routeEdgeIndex;

    if (idxInRoute < currentEdgeRouteIdx) {
      // Behind aircraft — off
      lights[edge.id] = 'off';
    } else if (idxInRoute >= currentEdgeRouteIdx && idxInRoute < currentEdgeRouteIdx + GREEN_LIGHT_LOOKAHEAD) {
      // Ahead within lookahead window — green
      lights[edge.id] = 'green';
    } else {
      lights[edge.id] = 'off';
    }
  }

  return lights;
}

/**
 * Single simulation tick. dt is elapsed time in seconds.
 * Returns updated SimulationState (immutable-style).
 */
export function simulationTick(
  state: SimulationState,
  dt: number
): SimulationState {
  if (!state.isRunning || state.isPaused) return state;
  const { aircraft, config } = state;
  if (!aircraft || aircraft.status === 'arrived' || aircraft.status === 'stopped') return state;

  const edges = airportGraph.edges;

  // Effective speed (depends on aircraft type, weather and traffic)
  const effectiveSpeed = effectiveTaxiSpeedKts(config);
  const effectiveSpeedMs = effectiveSpeed * KNOTS_TO_MS;

  // Current edge
  const routeEdgeIds = routeToEdges(aircraft.assignedRoute, edges) ?? [];
  if (aircraft.routeEdgeIndex >= routeEdgeIds.length) {
    // Arrived
    const arrived: Aircraft = {
      ...aircraft,
      status: 'arrived',
      currentNodeId: aircraft.assignedRoute[aircraft.assignedRoute.length - 1],
      progressOnEdge: 1,
    };
    return {
      ...state,
      aircraft: arrived,
      isRunning: false,
      elapsedSeconds: state.elapsedSeconds + dt,
      lightStates: computeLightStates(arrived, state.blockedEdgeIds),
    };
  }

  const currentEdgeId = routeEdgeIds[aircraft.routeEdgeIndex];

  // ── Dynamic (A-SMGCS / SMAN-style) handling ─────────────────────────────────
  // Each tick, re-evaluate the *remaining* route against live incidents. If any
  // edge ahead is blocked, re-run Dijkstra from the current position (without
  // resetting the aircraft to the start) — this is the live re-routing layer.
  const remainingEdgeIds = routeEdgeIds.slice(aircraft.routeEdgeIndex);
  const currentBlocked = state.blockedEdgeIds.has(currentEdgeId);
  const blockAhead = remainingEdgeIds.some(id => state.blockedEdgeIds.has(id));

  if (blockAhead) {
    const destinationId = aircraft.targetNodeId;

    if (config.autoReroute) {
      const fromNode = aircraft.assignedRoute[aircraft.routeEdgeIndex];          // start of current edge
      let rerouted: Aircraft | null = null;

      if (currentBlocked) {
        // The edge the aircraft is on is blocked → re-plan from this node.
        const path = findPath(airportGraph, fromNode, destinationId, state.blockedEdgeIds);
        if (path && path.length > 1) {
          rerouted = {
            ...aircraft,
            assignedRoute: path,
            routeEdgeIndex: 0,
            progressOnEdge: 0,
            currentNodeId: fromNode,
            currentEdgeId: null,
            status: 'taxiing',
          };
        }
      } else {
        // Current edge is clear; a block is further ahead → keep finishing the
        // current edge, then follow a fresh route from the next node.
        const nextNode = aircraft.assignedRoute[aircraft.routeEdgeIndex + 1];
        const path = findPath(airportGraph, nextNode, destinationId, state.blockedEdgeIds);
        if (path && path.length > 1) {
          rerouted = {
            ...aircraft,
            assignedRoute: [fromNode, ...path],   // keep current edge as edge 0
            routeEdgeIndex: 0,
            progressOnEdge: aircraft.progressOnEdge,
            currentNodeId: fromNode,
            status: 'taxiing',
          };
        }
      }

      if (rerouted) {
        const eta = estimateTravelTimeSeconds(
          rerouted.assignedRoute.slice(rerouted.routeEdgeIndex), edges, effectiveSpeed,
        );
        return {
          ...state,
          aircraft: rerouted,
          elapsedSeconds: state.elapsedSeconds + dt,
          etaSeconds: eta,
          warningMessage: 'Sự cố trên đường lăn — đã tự động tính lại lộ trình (Dijkstra).',
          lightStates: computeLightStates(rerouted, state.blockedEdgeIds),
        };
      }

      // No alternative path exists → stop.
      const stopped: Aircraft = { ...aircraft, status: 'stopped', speedKts: 0 };
      return {
        ...state,
        aircraft: stopped,
        isRunning: false,
        warningMessage: 'Không tìm được đường vòng. Máy bay dừng lại.',
        lightStates: computeLightStates(stopped, state.blockedEdgeIds),
      };
    }

    if (currentBlocked) {
      // Auto-reroute off and the edge underfoot is blocked → hold position.
      const holding: Aircraft = { ...aircraft, status: 'holding', speedKts: 0 };
      return {
        ...state,
        aircraft: holding,
        warningMessage: 'Đường lăn bị chặn. Máy bay giữ nguyên vị trí.',
        elapsedSeconds: state.elapsedSeconds + dt,
        lightStates: computeLightStates(holding, state.blockedEdgeIds),
      };
    }
    // Auto-reroute off but the block is only ahead → keep taxiing toward it.
  }

  // Advance along edge
  const currentEdge = edges.find(e => e.id === currentEdgeId)!;
  const edgeLengthMs = currentEdge.lengthMeters;
  const progressPerSecond = edgeLengthMs > 0 ? effectiveSpeedMs / edgeLengthMs : 1;

  let newProgress = aircraft.progressOnEdge + progressPerSecond * dt;
  let newEdgeIndex = aircraft.routeEdgeIndex;
  let newCurrentNodeId = aircraft.currentNodeId;

  // Advance through multiple edges if dt is large
  while (newProgress >= 1 && newEdgeIndex < routeEdgeIds.length) {
    newProgress -= 1;
    newEdgeIndex++;
    if (newEdgeIndex < routeEdgeIds.length) {
      // Move to next node
      newCurrentNodeId = aircraft.assignedRoute[newEdgeIndex];
    } else {
      newCurrentNodeId = aircraft.assignedRoute[aircraft.assignedRoute.length - 1];
      newProgress = 1;
    }
  }

  const updatedAircraft: Aircraft = {
    ...aircraft,
    routeEdgeIndex: newEdgeIndex,
    progressOnEdge: Math.min(newProgress, 1),
    currentNodeId: newCurrentNodeId,
    currentEdgeId: newEdgeIndex < routeEdgeIds.length ? routeEdgeIds[newEdgeIndex] : null,
    speedKts: effectiveSpeed,
    status: newEdgeIndex >= routeEdgeIds.length ? 'arrived' : 'taxiing',
  };

  const newEta = estimateTravelTimeSeconds(
    aircraft.assignedRoute.slice(newEdgeIndex),
    edges,
    effectiveSpeed
  );

  return {
    ...state,
    aircraft: updatedAircraft,
    elapsedSeconds: state.elapsedSeconds + dt,
    etaSeconds: Math.max(0, newEta),
    warningMessage: state.warningMessage,
    lightStates: computeLightStates(updatedAircraft, state.blockedEdgeIds),
    isRunning: updatedAircraft.status !== 'arrived',
  };
}

/** Initialize a fresh simulation state from config */
export function initSimulation(config: SimulationConfig): SimulationState {
  const blockedEdgeIds = buildBlockedEdgeIds(config, airportGraph.edges);

  const route = findPath(airportGraph, config.startNodeId, config.destinationNodeId, blockedEdgeIds);

  if (!route) {
    return {
      aircraft: null,
      config,
      isRunning: false,
      isPaused: false,
      routeStatus: 'pending',
      elapsedSeconds: 0,
      etaSeconds: null,
      warningMessage: 'Không tìm thấy tuyến đường hợp lệ giữa hai điểm đã chọn.',
      lightStates: {},
      blockedEdgeIds,
    };
  }

  const aircraft: Aircraft = {
    id: 'AC001',
    callsign: config.callsign,
    currentNodeId: config.startNodeId,
    targetNodeId: config.destinationNodeId,
    currentEdgeId: null,
    progressOnEdge: 0,
    speedKts: 0,
    status: 'waiting',
    assignedRoute: route,
    routeEdgeIndex: 0,
  };

  const effectiveSpeed = effectiveTaxiSpeedKts(config);
  const eta = estimateTravelTimeSeconds(route, airportGraph.edges, effectiveSpeed);

  return {
    aircraft,
    config,
    isRunning: false,
    isPaused: false,
    routeStatus: 'pending',
    elapsedSeconds: 0,
    etaSeconds: eta,
    warningMessage: null,
    lightStates: {},
    blockedEdgeIds,
  };
}

/** Activate lights after controller accepts the proposed route */
export function acceptRoute(state: SimulationState): SimulationState {
  if (!state.aircraft) return state;
  return {
    ...state,
    routeStatus: 'accepted',
    lightStates: computeLightStates(state.aircraft, state.blockedEdgeIds),
  };
}

// ── Live incident layer (dynamic, applied mid-taxi without resetting) ──────────

/** Block or unblock a taxiway edge live. The next tick re-routes if needed. */
export function setIncidentEdge(
  state: SimulationState,
  edgeId: string,
  blocked: boolean,
): SimulationState {
  const next = new Set(state.blockedEdgeIds);
  if (blocked) next.add(edgeId);
  else next.delete(edgeId);
  return {
    ...state,
    blockedEdgeIds: next,
    warningMessage: blocked
      ? 'Sự cố mới trên đường lăn — đang tính lại lộ trình…'
      : state.warningMessage,
    lightStates: state.aircraft
      ? computeLightStates(state.aircraft, next)
      : state.lightStates,
  };
}

/** Clear all live incidents (keeps statically closed/restricted edges). */
export function clearIncidents(state: SimulationState): SimulationState {
  const next = new Set<string>();
  for (const e of airportGraph.edges) {
    if (e.status === 'closed' || e.status === 'restricted') next.add(e.id);
  }
  return {
    ...state,
    blockedEdgeIds: next,
    warningMessage: null,
    lightStates: state.aircraft ? computeLightStates(state.aircraft, next) : {},
  };
}

/**
 * Pick a random edge strictly AHEAD of the aircraft on its current route
 * (not the edge underfoot, not already blocked) — a candidate for a live
 * incident the aircraft can still re-route around.
 */
export function randomIncidentEdge(state: SimulationState): string | null {
  const ac = state.aircraft;
  if (!ac) return null;
  const routeEdgeIds = routeToEdges(ac.assignedRoute, airportGraph.edges) ?? [];
  const ahead = routeEdgeIds
    .slice(ac.routeEdgeIndex + 1)
    .filter(id => !state.blockedEdgeIds.has(id));
  if (!ahead.length) return null;

  // Prefer an edge that still leaves a valid detour (so the aircraft re-routes
  // rather than dead-ends). Fall back to any edge ahead if none has an alternative.
  const fromNode = ac.assignedRoute[ac.routeEdgeIndex + 1];
  const reroutable = ahead.filter(id => {
    const test = new Set(state.blockedEdgeIds);
    test.add(id);
    const p = findPath(airportGraph, fromNode, ac.targetNodeId, test);
    return p !== null && p.length > 1;
  });
  const pool = reroutable.length ? reroutable : ahead;
  return pool[Math.floor(Math.random() * pool.length)];
}
