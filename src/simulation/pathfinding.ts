// Dijkstra pathfinding over the airport graph.
// Returns an ordered list of node IDs representing the shortest valid taxi route.

import type { AirportEdge, AirportGraph } from '../types';

interface DijkstraNode {
  id: string;
  cost: number;
  prev: string | null;
}

/**
 * Find shortest path from startNodeId to endNodeId.
 * Edges in blockedEdgeIds are treated as impassable.
 * Returns null if no path exists.
 */
export function findPath(
  graph: AirportGraph,
  startNodeId: string,
  endNodeId: string,
  blockedEdgeIds: Set<string>
): string[] | null {
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visited = new Set<string>();

  for (const node of graph.nodes) {
    dist[node.id] = Infinity;
    prev[node.id] = null;
  }
  dist[startNodeId] = 0;

  // Simple priority queue using a sorted array (fine for small graphs)
  const queue: DijkstraNode[] = [{ id: startNodeId, cost: 0, prev: null }];

  while (queue.length > 0) {
    // Extract minimum cost node
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (current.id === endNodeId) break;

    // Explore neighbors via valid edges
    for (const edge of getTraversableEdges(current.id, graph.edges, blockedEdgeIds)) {
      const neighborId = getOtherEnd(edge, current.id);
      if (visited.has(neighborId)) continue;

      // Cost is edge length (could weight by speed limits in future)
      const newCost = dist[current.id] + edge.lengthMeters;
      if (newCost < dist[neighborId]) {
        dist[neighborId] = newCost;
        prev[neighborId] = current.id;
        queue.push({ id: neighborId, cost: newCost, prev: current.id });
      }
    }
  }

  if (dist[endNodeId] === Infinity) return null;

  // Reconstruct path
  const path: string[] = [];
  let cur: string | null = endNodeId;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return path;
}

/** Get edges the aircraft can use from a given node */
function getTraversableEdges(
  nodeId: string,
  edges: AirportEdge[],
  blockedEdgeIds: Set<string>
): AirportEdge[] {
  return edges.filter(e => {
    if (blockedEdgeIds.has(e.id)) return false;
    if (e.status === 'closed' || e.status === 'restricted') return false;
    if (e.fromNodeId === nodeId) return true;
    if (e.bidirectional && e.toNodeId === nodeId) return true;
    return false;
  });
}

function getOtherEnd(edge: AirportEdge, fromNodeId: string): string {
  return edge.fromNodeId === fromNodeId ? edge.toNodeId : edge.fromNodeId;
}

/**
 * Given an ordered route (array of node IDs), return the ordered edge IDs.
 * Returns null if any consecutive pair has no connecting edge.
 */
export function routeToEdges(route: string[], edges: AirportEdge[]): string[] | null {
  const edgeIds: string[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const from = route[i];
    const to = route[i + 1];
    const edge = edges.find(e =>
      (e.fromNodeId === from && e.toNodeId === to) ||
      (e.bidirectional && e.fromNodeId === to && e.toNodeId === from)
    );
    if (!edge) return null;
    edgeIds.push(edge.id);
  }
  return edgeIds;
}

/**
 * Estimate travel time in seconds for a route given speed in knots.
 * 1 knot = 1 nautical mile/hour = 1852 m/3600 s = 0.5144 m/s
 */
export function estimateTravelTimeSeconds(
  route: string[],
  edges: AirportEdge[],
  speedKts: number
): number {
  const edgeIds = routeToEdges(route, edges);
  if (!edgeIds) return 0;

  let totalMeters = 0;
  for (const edgeId of edgeIds) {
    const edge = edges.find(e => e.id === edgeId);
    if (edge) totalMeters += edge.lengthMeters;
  }

  const speedMs = speedKts * 0.5144;
  return speedMs > 0 ? totalMeters / speedMs : 0;
}
