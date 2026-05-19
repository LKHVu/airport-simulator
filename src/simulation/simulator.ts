// Simulation tick logic: moves the aircraft along its route,
// updates light states, handles incidents and rerouting.

import type { Aircraft, AirportEdge, SimulationConfig, SimulationState } from '../types';
import { airportGraph } from '../data/airportGraph';
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

  // Effective speed
  const baseSpeed = Math.min(config.taxiSpeedKts, 30); // cap at 30kts for taxiing
  const effectiveSpeed = baseSpeed * weatherSpeedFactor(config) * trafficSpeedFactor(config);
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

  // Check if current edge is now blocked (incident happened)
  if (state.blockedEdgeIds.has(currentEdgeId)) {
    if (config.autoReroute) {
      // Reroute from current position
      const currentNodeId = aircraft.assignedRoute[aircraft.routeEdgeIndex];
      const destinationId = aircraft.targetNodeId;
      const newRoute = findPath(airportGraph, currentNodeId, destinationId, state.blockedEdgeIds);

      if (newRoute) {
        const rerouted: Aircraft = {
          ...aircraft,
          assignedRoute: newRoute,
          routeEdgeIndex: 0,
          progressOnEdge: 0,
          currentNodeId,
          currentEdgeId: null,
          status: 'taxiing',
        };
        const eta = estimateTravelTimeSeconds(newRoute, edges, effectiveSpeed);
        return {
          ...state,
          aircraft: rerouted,
          elapsedSeconds: state.elapsedSeconds + dt,
          etaSeconds: eta,
          warningMessage: 'Tuyến đường bị chặn — đã tìm đường vòng tự động.',
          lightStates: computeLightStates(rerouted, state.blockedEdgeIds),
        };
      } else {
        const stopped: Aircraft = { ...aircraft, status: 'stopped', speedKts: 0 };
        return {
          ...state,
          aircraft: stopped,
          isRunning: false,
          warningMessage: 'Không tìm được đường. Máy bay dừng lại.',
          lightStates: computeLightStates(stopped, state.blockedEdgeIds),
        };
      }
    } else {
      // Hold — can't proceed
      const holding: Aircraft = { ...aircraft, status: 'holding', speedKts: 0 };
      return {
        ...state,
        aircraft: holding,
        warningMessage: 'Đường lăn bị chặn. Máy bay giữ nguyên vị trí.',
        elapsedSeconds: state.elapsedSeconds + dt,
        lightStates: computeLightStates(holding, state.blockedEdgeIds),
      };
    }
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
      elapsedSeconds: 0,
      etaSeconds: null,
      warningMessage: 'Không tìm thấy tuyến đường hợp lệ giữa hai điểm đã chọn.',
      lightStates: {},
      blockedEdgeIds,
    };
  }

  const aircraft: Aircraft = {
    id: 'AC001',
    callsign: 'VN001',
    currentNodeId: config.startNodeId,
    targetNodeId: config.destinationNodeId,
    currentEdgeId: null,
    progressOnEdge: 0,
    speedKts: 0,
    status: 'waiting',
    assignedRoute: route,
    routeEdgeIndex: 0,
  };

  const effectiveSpeed = config.taxiSpeedKts * weatherSpeedFactor(config) * trafficSpeedFactor(config);
  const eta = estimateTravelTimeSeconds(route, airportGraph.edges, effectiveSpeed);

  return {
    aircraft,
    config,
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0,
    etaSeconds: eta,
    warningMessage: null,
    lightStates: computeLightStates(aircraft, blockedEdgeIds),
    blockedEdgeIds,
  };
}
