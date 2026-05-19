// Core domain types for the airport surface movement simulator.
// This is an educational demo — not for real-world aviation use.

export type NodeType =
  | 'gate'
  | 'stand'
  | 'taxiway'
  | 'intersection'
  | 'holding_point'
  | 'runway_entry'
  | 'runway_exit'
  | 'apron';

export type EdgeType = 'taxiway' | 'runway' | 'apron' | 'holding';

export type EdgeStatus = 'open' | 'closed' | 'occupied' | 'restricted';

export type TrafficLevel = 'low' | 'medium' | 'high';

export type AircraftStatus =
  | 'waiting'
  | 'taxiing'
  | 'holding'
  | 'stopped'
  | 'arrived';

export type WeatherCondition = 'clear' | 'rain' | 'fog' | 'thunderstorm';

export type TimeOfDay = 'morning' | 'afternoon' | 'night';

export type IncidentType =
  | 'none'
  | 'blocked_taxiway'
  | 'vehicle_crossing'
  | 'runway_incursion'
  | 'low_visibility'
  | 'aircraft_stopped_ahead';

export interface AirportNode {
  id: string;
  label: string;
  type: NodeType;
  x: number; // SVG coordinate
  y: number; // SVG coordinate
  description?: string;
}

export interface AirportEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  lengthMeters: number;
  maxSpeedKts: number;
  type: EdgeType;
  bidirectional: boolean;
  status: EdgeStatus;
  trafficLevel: TrafficLevel;
}

export interface AirportGraph {
  nodes: AirportNode[];
  edges: AirportEdge[];
}

export interface Aircraft {
  id: string;
  callsign: string;
  currentNodeId: string;
  targetNodeId: string;
  currentEdgeId: string | null;
  progressOnEdge: number; // 0.0 to 1.0
  speedKts: number;
  status: AircraftStatus;
  assignedRoute: string[]; // ordered node IDs
  routeEdgeIndex: number;  // which edge in the route we're currently traversing
}

export interface SimulationConfig {
  startNodeId: string;
  destinationNodeId: string;
  weather: WeatherCondition;
  timeOfDay: TimeOfDay;
  trafficLevel: TrafficLevel;
  taxiSpeedKts: number;
  incident: IncidentType;
  incidentEdgeId: string | null; // which edge is affected by incident
  autoReroute: boolean;
}

export interface SimulationState {
  aircraft: Aircraft | null;
  config: SimulationConfig;
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  etaSeconds: number | null;
  warningMessage: string | null;
  // Light states: edge id -> 'green' | 'red' | 'off'
  lightStates: Record<string, 'green' | 'red' | 'off'>;
  // Edges blocked due to incidents
  blockedEdgeIds: Set<string>;
}
