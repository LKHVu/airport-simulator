// Simplified fictionalized airport graph inspired by Tan Son Nhat International Airport.
// NOT an operational chart — educational/demo use only.
//
// Layout overview (SVG coords, origin top-left):
//   Runways run horizontally. Two parallel runways: 07L/25R (top) and 07R/25L (bottom).
//   Apron/gates are in the center-left area.
//   Taxiways connect apron to runway holding points.

import type { AirportGraph } from '../types';

// SVG viewport: 1200 x 700
export const SVG_WIDTH = 1200;
export const SVG_HEIGHT = 700;

export const airportGraph: AirportGraph = {
  nodes: [
    // ── Runway 07L/25R (top runway) ──────────────────────────────
    { id: 'RWY07L_THR', label: '07L', type: 'runway_entry', x: 80,  y: 130, description: 'Runway 07L Threshold' },
    { id: 'RWY25R_THR', label: '25R', type: 'runway_entry', x: 1120, y: 130, description: 'Runway 25R Threshold' },

    // Runway 07L/25R intermediate points for smooth path
    { id: 'R1_A',       label: '',    type: 'runway_entry', x: 350,  y: 130 },
    { id: 'R1_B',       label: '',    type: 'runway_entry', x: 750,  y: 130 },

    // Holding points for 07L/25R
    { id: 'RWY07L_HOLD', label: 'H-07L', type: 'holding_point', x: 200,  y: 160, description: 'Holding Point for RWY 07L' },
    { id: 'RWY25R_HOLD', label: 'H-25R', type: 'holding_point', x: 1000, y: 160, description: 'Holding Point for RWY 25R' },

    // ── Runway 07R/25L (bottom runway) ──────────────────────────
    { id: 'RWY07R_THR', label: '07R', type: 'runway_entry', x: 80,  y: 560, description: 'Runway 07R Threshold' },
    { id: 'RWY25L_THR', label: '25L', type: 'runway_entry', x: 1120, y: 560, description: 'Runway 25L Threshold' },

    { id: 'R2_A',       label: '',    type: 'runway_entry', x: 350,  y: 560 },
    { id: 'R2_B',       label: '',    type: 'runway_entry', x: 750,  y: 560 },

    // Holding points for 07R/25L
    { id: 'RWY07R_HOLD', label: 'H-07R', type: 'holding_point', x: 200,  y: 530, description: 'Holding Point for RWY 07R' },
    { id: 'RWY25L_HOLD', label: 'H-25L', type: 'holding_point', x: 1000, y: 530, description: 'Holding Point for RWY 25L' },

    // ── Taxiway A (runs parallel between runways, west side) ─────
    { id: 'A1', label: 'A1', type: 'intersection', x: 200, y: 230, description: 'Taxiway A, Point 1' },
    { id: 'A2', label: 'A2', type: 'intersection', x: 200, y: 460, description: 'Taxiway A, Point 2' },
    { id: 'A3', label: 'A3', type: 'intersection', x: 200, y: 345, description: 'Taxiway A midpoint' },

    // ── Taxiway B (central north-south connector) ─────────────────
    { id: 'B1', label: 'B1', type: 'intersection', x: 450, y: 200, description: 'Taxiway B, north junction' },
    { id: 'B2', label: 'B2', type: 'intersection', x: 450, y: 490, description: 'Taxiway B, south junction' },
    { id: 'B3', label: 'B3', type: 'intersection', x: 450, y: 345, description: 'Taxiway B midpoint' },

    // ── Taxiway C (central connector) ────────────────────────────
    { id: 'C1', label: 'C1', type: 'intersection', x: 680, y: 200, description: 'Taxiway C, north junction' },
    { id: 'C2', label: 'C2', type: 'intersection', x: 680, y: 490, description: 'Taxiway C, south junction' },
    { id: 'C3', label: 'C3', type: 'intersection', x: 680, y: 345, description: 'Taxiway C midpoint' },

    // ── Taxiway D (east side) ────────────────────────────────────
    { id: 'D1', label: 'D1', type: 'intersection', x: 900, y: 200, description: 'Taxiway D, north junction' },
    { id: 'D2', label: 'D2', type: 'intersection', x: 900, y: 490, description: 'Taxiway D, south junction' },
    { id: 'D3', label: 'D3', type: 'intersection', x: 900, y: 345, description: 'Taxiway D midpoint' },

    // ── Apron and Gate area ───────────────────────────────────────
    { id: 'APRON_N',  label: 'Apron N', type: 'apron', x: 450, y: 280, description: 'North Apron entrance' },
    { id: 'APRON_S',  label: 'Apron S', type: 'apron', x: 450, y: 410, description: 'South Apron entrance' },
    { id: 'APRON_C',  label: 'Apron C', type: 'apron', x: 580, y: 345, description: 'Central Apron' },

    // Gates / Stands
    { id: 'STAND_1', label: 'S1', type: 'stand', x: 350, y: 290, description: 'Stand 1' },
    { id: 'STAND_2', label: 'S2', type: 'stand', x: 350, y: 345, description: 'Stand 2' },
    { id: 'STAND_3', label: 'S3', type: 'stand', x: 350, y: 400, description: 'Stand 3' },
    { id: 'STAND_4', label: 'S4', type: 'stand', x: 480, y: 290, description: 'Stand 4' },
    { id: 'STAND_5', label: 'S5', type: 'stand', x: 480, y: 400, description: 'Stand 5' },
    { id: 'STAND_6', label: 'S6', type: 'stand', x: 610, y: 290, description: 'Stand 6' },
    { id: 'STAND_7', label: 'S7', type: 'stand', x: 610, y: 345, description: 'Stand 7' },
    { id: 'STAND_8', label: 'S8', type: 'stand', x: 610, y: 400, description: 'Stand 8' },
  ],

  edges: [
    // ── Runway 07L/25R segments ───────────────────────────────────
    {
      id: 'RWY1_SEG1', fromNodeId: 'RWY07L_THR', toNodeId: 'R1_A',
      lengthMeters: 600, maxSpeedKts: 130, type: 'runway', bidirectional: false,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'RWY1_SEG2', fromNodeId: 'R1_A', toNodeId: 'R1_B',
      lengthMeters: 800, maxSpeedKts: 130, type: 'runway', bidirectional: false,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'RWY1_SEG3', fromNodeId: 'R1_B', toNodeId: 'RWY25R_THR',
      lengthMeters: 600, maxSpeedKts: 130, type: 'runway', bidirectional: false,
      status: 'open', trafficLevel: 'low',
    },

    // ── Runway 07R/25L segments ───────────────────────────────────
    {
      id: 'RWY2_SEG1', fromNodeId: 'RWY07R_THR', toNodeId: 'R2_A',
      lengthMeters: 600, maxSpeedKts: 130, type: 'runway', bidirectional: false,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'RWY2_SEG2', fromNodeId: 'R2_A', toNodeId: 'R2_B',
      lengthMeters: 800, maxSpeedKts: 130, type: 'runway', bidirectional: false,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'RWY2_SEG3', fromNodeId: 'R2_B', toNodeId: 'RWY25L_THR',
      lengthMeters: 600, maxSpeedKts: 130, type: 'runway', bidirectional: false,
      status: 'open', trafficLevel: 'low',
    },

    // ── Holding point connectors to runway ───────────────────────
    {
      id: 'HOLD_07L', fromNodeId: 'RWY07L_HOLD', toNodeId: 'RWY07L_THR',
      lengthMeters: 100, maxSpeedKts: 15, type: 'holding', bidirectional: false,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'HOLD_25R', fromNodeId: 'RWY25R_HOLD', toNodeId: 'RWY25R_THR',
      lengthMeters: 100, maxSpeedKts: 15, type: 'holding', bidirectional: false,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'HOLD_07R', fromNodeId: 'RWY07R_HOLD', toNodeId: 'RWY07R_THR',
      lengthMeters: 100, maxSpeedKts: 15, type: 'holding', bidirectional: false,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'HOLD_25L', fromNodeId: 'RWY25L_HOLD', toNodeId: 'RWY25L_THR',
      lengthMeters: 100, maxSpeedKts: 15, type: 'holding', bidirectional: false,
      status: 'open', trafficLevel: 'low',
    },

    // ── Taxiway A (vertical, west side) ──────────────────────────
    {
      id: 'TWY_A_HOLD07L', fromNodeId: 'A1', toNodeId: 'RWY07L_HOLD',
      lengthMeters: 80, maxSpeedKts: 20, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_A_13', fromNodeId: 'A1', toNodeId: 'A3',
      lengthMeters: 230, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_A_32', fromNodeId: 'A3', toNodeId: 'A2',
      lengthMeters: 230, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_A_HOLD07R', fromNodeId: 'A2', toNodeId: 'RWY07R_HOLD',
      lengthMeters: 80, maxSpeedKts: 20, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },

    // ── Taxiway B (vertical, central-west) ──────────────────────
    {
      id: 'TWY_B_N_RWY', fromNodeId: 'B1', toNodeId: 'R1_A',
      lengthMeters: 80, maxSpeedKts: 20, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_B_13', fromNodeId: 'B1', toNodeId: 'B3',
      lengthMeters: 230, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_B_32', fromNodeId: 'B3', toNodeId: 'B2',
      lengthMeters: 230, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_B_S_RWY', fromNodeId: 'B2', toNodeId: 'R2_A',
      lengthMeters: 80, maxSpeedKts: 20, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },

    // ── Taxiway C (vertical, central-east) ───────────────────────
    {
      id: 'TWY_C_N_RWY', fromNodeId: 'C1', toNodeId: 'R1_B',
      lengthMeters: 80, maxSpeedKts: 20, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_C_13', fromNodeId: 'C1', toNodeId: 'C3',
      lengthMeters: 230, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_C_32', fromNodeId: 'C3', toNodeId: 'C2',
      lengthMeters: 230, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_C_S_RWY', fromNodeId: 'C2', toNodeId: 'R2_B',
      lengthMeters: 80, maxSpeedKts: 20, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },

    // ── Taxiway D (vertical, east side) ──────────────────────────
    {
      id: 'TWY_D_N_RWY', fromNodeId: 'D1', toNodeId: 'RWY25R_HOLD',
      lengthMeters: 80, maxSpeedKts: 20, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_D_13', fromNodeId: 'D1', toNodeId: 'D3',
      lengthMeters: 230, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_D_32', fromNodeId: 'D3', toNodeId: 'D2',
      lengthMeters: 230, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_D_S_RWY', fromNodeId: 'D2', toNodeId: 'RWY25L_HOLD',
      lengthMeters: 80, maxSpeedKts: 20, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },

    // ── East-West taxiway connectors (horizontal) ─────────────────
    // North lateral: A1 - B1 - C1 - D1
    {
      id: 'TWY_N_A1B1', fromNodeId: 'A1', toNodeId: 'B1',
      lengthMeters: 500, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_N_B1C1', fromNodeId: 'B1', toNodeId: 'C1',
      lengthMeters: 460, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_N_C1D1', fromNodeId: 'C1', toNodeId: 'D1',
      lengthMeters: 440, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },

    // South lateral: A2 - B2 - C2 - D2
    {
      id: 'TWY_S_A2B2', fromNodeId: 'A2', toNodeId: 'B2',
      lengthMeters: 500, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_S_B2C2', fromNodeId: 'B2', toNodeId: 'C2',
      lengthMeters: 460, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_S_C2D2', fromNodeId: 'C2', toNodeId: 'D2',
      lengthMeters: 440, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },

    // Mid lateral: A3 - B3 - C3 - D3 (central taxiway)
    {
      id: 'TWY_M_A3B3', fromNodeId: 'A3', toNodeId: 'B3',
      lengthMeters: 500, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_M_B3C3', fromNodeId: 'B3', toNodeId: 'C3',
      lengthMeters: 460, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'TWY_M_C3D3', fromNodeId: 'C3', toNodeId: 'D3',
      lengthMeters: 440, maxSpeedKts: 25, type: 'taxiway', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },

    // ── Apron connections ─────────────────────────────────────────
    {
      id: 'APRON_B3_N', fromNodeId: 'B3', toNodeId: 'APRON_N',
      lengthMeters: 80, maxSpeedKts: 10, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'APRON_B3_S', fromNodeId: 'B3', toNodeId: 'APRON_S',
      lengthMeters: 80, maxSpeedKts: 10, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'APRON_N_C', fromNodeId: 'APRON_N', toNodeId: 'APRON_C',
      lengthMeters: 130, maxSpeedKts: 10, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'APRON_S_C', fromNodeId: 'APRON_S', toNodeId: 'APRON_C',
      lengthMeters: 130, maxSpeedKts: 10, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'APRON_C_C3', fromNodeId: 'APRON_C', toNodeId: 'C3',
      lengthMeters: 100, maxSpeedKts: 10, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },

    // Stand connections to apron
    {
      id: 'STAND1_APRON', fromNodeId: 'STAND_1', toNodeId: 'APRON_N',
      lengthMeters: 100, maxSpeedKts: 5, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'STAND2_APRON', fromNodeId: 'STAND_2', toNodeId: 'APRON_N',
      lengthMeters: 100, maxSpeedKts: 5, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'STAND3_APRON', fromNodeId: 'STAND_3', toNodeId: 'APRON_S',
      lengthMeters: 100, maxSpeedKts: 5, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'STAND4_APRON', fromNodeId: 'STAND_4', toNodeId: 'APRON_N',
      lengthMeters: 60, maxSpeedKts: 5, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'STAND5_APRON', fromNodeId: 'STAND_5', toNodeId: 'APRON_S',
      lengthMeters: 60, maxSpeedKts: 5, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'STAND6_APRON', fromNodeId: 'STAND_6', toNodeId: 'APRON_C',
      lengthMeters: 60, maxSpeedKts: 5, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'STAND7_APRON', fromNodeId: 'STAND_7', toNodeId: 'APRON_C',
      lengthMeters: 60, maxSpeedKts: 5, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
    {
      id: 'STAND8_APRON', fromNodeId: 'STAND_8', toNodeId: 'APRON_C',
      lengthMeters: 60, maxSpeedKts: 5, type: 'apron', bidirectional: true,
      status: 'open', trafficLevel: 'low',
    },
  ],
};

// Helper: get node by id
export function getNode(id: string) {
  return airportGraph.nodes.find(n => n.id === id);
}

// Helper: get all edges adjacent to a node (respecting direction)
export function getAdjacentEdges(nodeId: string, edges: typeof airportGraph.edges) {
  return edges.filter(e =>
    e.fromNodeId === nodeId || (e.bidirectional && e.toNodeId === nodeId)
  );
}

// Selectable start/destination nodes for the control panel
export const START_NODES = airportGraph.nodes.filter(n =>
  ['stand', 'gate', 'holding_point', 'runway_entry'].includes(n.type)
);

export const DESTINATION_NODES = airportGraph.nodes.filter(n =>
  ['holding_point', 'runway_entry', 'stand', 'gate'].includes(n.type)
);
