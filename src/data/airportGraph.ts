// Airport graph modelled after Tan Son Nhat International (VVTS/SGN) — simplified.
// NOT an operational chart — educational/demo only.
//
// Layout (SVG 1200×860, origin top-left, North=up):
//   RWY 07L/25R (north runway): center y=73, x=20..1120
//   RWY 07R/25L (south runway): center y=156, x=62..1177
//   Infield (green): y=84..145
//   W11 lateral taxiway (below south runway): y=186
//   Upper W lateral (PARL TWY W1): y=200
//   E-series upper lateral: y=186
//   E-series mid lateral: y=202
//   Lower lateral: y=220
//   DOM apron: y=220..760 (large salmon parallelogram)

import type { AirportGraph } from '../types';

export const SVG_WIDTH  = 1200;
export const SVG_HEIGHT = 860;

export const airportGraph: AirportGraph = {
  nodes: [

    // ── Runway thresholds ────────────────────────────────────────────────────
    { id: 'RWY07L_THR', label: '07L', type: 'runway_entry', x: 20,   y: 73,  description: 'Runway 07L threshold' },
    { id: 'RWY25R_THR', label: '25R', type: 'runway_entry', x: 1120, y: 73,  description: 'Runway 25R threshold' },
    { id: 'RWY07R_THR', label: '07R', type: 'runway_entry', x: 62,   y: 156, description: 'Runway 07R threshold' },
    { id: 'RWY25L_THR', label: '25L', type: 'runway_entry', x: 1177, y: 156, description: 'Runway 25L threshold' },

    // Runway intermediate exit/entry points
    { id: 'R1_W4', label: '', type: 'runway_entry', x: 371, y: 73,  description: 'Top runway – W4 intersection' },
    { id: 'R1_NS', label: '', type: 'runway_entry', x: 605, y: 73,  description: 'Top runway – NS1 intersection (INT TKOF 25R)' },
    { id: 'R2_W7', label: '', type: 'runway_entry', x: 280, y: 156, description: 'Bottom runway – W7 intersection (INT TKOF 07R)' },
    { id: 'R2_E4', label: '', type: 'runway_entry', x: 724, y: 156, description: 'Bottom runway – E4 intersection (INT TKOF 25L)' },

    // ── Holding points ───────────────────────────────────────────────────────
    { id: 'H07L', label: 'H-07L', type: 'holding_point', x: 80,  y: 96,  description: 'Holding point RWY 07L' },
    { id: 'H25R', label: 'H-25R', type: 'holding_point', x: 900, y: 96,  description: 'Holding point RWY 25R' },
    { id: 'H07R', label: 'H-07R', type: 'holding_point', x: 280, y: 176, description: 'Holding point RWY 07R (TWY W7)' },
    { id: 'H25L', label: 'H-25L', type: 'holding_point', x: 900, y: 193, description: 'Holding point RWY 25L' },

    // ── W11 taxiway (below south runway, y=186) ──────────────────────────────
    { id: 'W11_W',    label: 'W11', type: 'intersection', x: 80,  y: 186, description: 'W11 west end' },
    { id: 'W11_W7',   label: '',    type: 'intersection', x: 280, y: 186, description: 'W11 at W7' },
    { id: 'W11_W4',   label: '',    type: 'intersection', x: 371, y: 186, description: 'W11 at W4' },
    { id: 'W11_W1',   label: '',    type: 'intersection', x: 498, y: 186, description: 'W11 at W1' },
    { id: 'W11_NS',   label: '',    type: 'intersection', x: 605, y: 186, description: 'W11 at NS' },
    { id: 'W11_E4',   label: '',    type: 'intersection', x: 724, y: 186, description: 'W11 at E4' },
    { id: 'W11_E_END',label: '',    type: 'intersection', x: 900, y: 186, description: 'W11 east end (near 25R/25L)' },

    // ── W9 (far-west vertical, x=80) ─────────────────────────────────────────
    { id: 'W9_MID', label: 'W9', type: 'intersection', x: 80, y: 202, description: 'TWY W9 mid' },
    { id: 'W9_S',   label: '',   type: 'intersection', x: 80, y: 220, description: 'TWY W9 south' },

    // ── W7 (x=280) ──────────────────────────────────────────────────────────
    { id: 'W7_N', label: 'W7', type: 'intersection', x: 280, y: 200, description: 'TWY W7 north junction' },
    { id: 'W7_S', label: '',   type: 'intersection', x: 280, y: 220, description: 'TWY W7 south junction' },

    // ── W4 (x=371) ───────────────────────────────────────────────────────────
    { id: 'W4_N', label: 'W4', type: 'intersection', x: 371, y: 200, description: 'TWY W4 north junction' },
    { id: 'W4_S', label: '',   type: 'intersection', x: 371, y: 220, description: 'TWY W4 south junction' },

    // ── W1 / APN taxiway (x=498) ─────────────────────────────────────────────
    { id: 'W1_N', label: 'W1', type: 'intersection', x: 498, y: 200, description: 'TWY W1 north junction' },
    { id: 'W1_S', label: '',   type: 'intersection', x: 498, y: 220, description: 'TWY W1 south junction' },

    // ── NS north-south connector (x=605) ─────────────────────────────────────
    { id: 'NS_N', label: 'NS', type: 'intersection', x: 605, y: 200, description: 'TWY NS north junction' },
    { id: 'NS_S', label: '',   type: 'intersection', x: 605, y: 220, description: 'TWY NS south junction' },

    // ── E4 (x=724) ──────────────────────────────────────────────────────────
    { id: 'E4_N', label: 'E4', type: 'intersection', x: 724, y: 186, description: 'TWY E4 north junction (E upper lateral)' },
    { id: 'E4_S', label: '',   type: 'intersection', x: 724, y: 220, description: 'TWY E4 south junction' },

    // ── M1 apron taxiway (angled ~-27°, serves DOM PAX Terminal) ─────────────
    { id: 'M1_W', label: 'M1', type: 'apron', x: 250, y: 460, description: 'M1 apron taxiway west' },
    { id: 'M1_C', label: '',   type: 'apron', x: 390, y: 405, description: 'M1 apron taxiway central' },
    { id: 'M1_E', label: '',   type: 'apron', x: 585, y: 220, description: 'M1 apron taxiway east' },

    // ── DOM PAX Terminal stands ───────────────────────────────────────────────
    { id: 'DOM_S1', label: 'D1', type: 'stand', x: 265, y: 485, description: 'Domestic stand D1' },
    { id: 'DOM_S2', label: 'D2', type: 'stand', x: 325, y: 440, description: 'Domestic stand D2' },
    { id: 'DOM_S3', label: 'D3', type: 'stand', x: 385, y: 405, description: 'Domestic stand D3' },
    { id: 'DOM_S4', label: 'D4', type: 'stand', x: 445, y: 377, description: 'Domestic stand D4' },
    { id: 'DOM_S5', label: 'D5', type: 'stand', x: 510, y: 347, description: 'Domestic stand D5' },

    // ── Parking positions P1-P5 ───────────────────────────────────────────────
    { id: 'P1', label: 'P1', type: 'stand', x: 690, y: 285, description: 'Parking position P1' },
    { id: 'P2', label: 'P2', type: 'stand', x: 625, y: 220, description: 'Parking position P2' },
    { id: 'P3', label: 'P3', type: 'stand', x: 465, y: 452, description: 'Parking position P3' },
    { id: 'P4', label: 'P4', type: 'stand', x: 440, y: 422, description: 'Parking position P4' },
    { id: 'P5', label: 'P5', type: 'stand', x: 408, y: 443, description: 'Parking position P5' },

    // ── INTL PAX Terminal (east area) ─────────────────────────────────────────
    { id: 'INTL_APN', label: '',   type: 'apron', x: 724, y: 220, description: 'INTL apron junction' },
    { id: 'INTL_S1',  label: 'I1', type: 'stand', x: 724, y: 184, description: 'International stand I1' },
    { id: 'INTL_S2',  label: 'I2', type: 'stand', x: 724, y: 199, description: 'International stand I2' },
    { id: 'INTL_S3',  label: 'I3', type: 'stand', x: 724, y: 216, description: 'International stand I3' },
    { id: 'INTL_S4',  label: 'I4', type: 'stand', x: 724, y: 237, description: 'International stand I4' },
  ],

  edges: [

    // ── RWY 07L/25R segments (top runway) ────────────────────────────────────
    { id: 'RWY1_SEG1', fromNodeId: 'RWY07L_THR', toNodeId: 'R1_W4',      lengthMeters: 1200, maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'RWY1_SEG2', fromNodeId: 'R1_W4',      toNodeId: 'R1_NS',       lengthMeters: 770,  maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'RWY1_SEG3', fromNodeId: 'R1_NS',      toNodeId: 'RWY25R_THR',  lengthMeters: 1600, maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },

    // ── RWY 07R/25L segments (bottom runway) ─────────────────────────────────
    { id: 'RWY2_SEG1', fromNodeId: 'RWY07R_THR', toNodeId: 'R2_W7',       lengthMeters: 800,  maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'RWY2_SEG2', fromNodeId: 'R2_W7',      toNodeId: 'R2_E4',        lengthMeters: 1800, maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'RWY2_SEG3', fromNodeId: 'R2_E4',      toNodeId: 'RWY25L_THR',  lengthMeters: 970,  maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },

    // ── Holding connectors ────────────────────────────────────────────────────
    { id: 'HOLD_07L', fromNodeId: 'H07L', toNodeId: 'RWY07L_THR', lengthMeters: 120, maxSpeedKts: 15, type: 'holding', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'HOLD_25R', fromNodeId: 'H25R', toNodeId: 'RWY25R_THR', lengthMeters: 120, maxSpeedKts: 15, type: 'holding', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'HOLD_07R', fromNodeId: 'H07R', toNodeId: 'R2_W7',       lengthMeters:  80, maxSpeedKts: 15, type: 'holding', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'HOLD_25L', fromNodeId: 'H25L', toNodeId: 'RWY25L_THR', lengthMeters: 120, maxSpeedKts: 15, type: 'holding', bidirectional: false, status: 'open', trafficLevel: 'low' },

    // ── W11 lateral taxiway (below south runway) ──────────────────────────────
    { id: 'W11_A', fromNodeId: 'W11_W',    toNodeId: 'W11_W7',   lengthMeters: 190, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_B', fromNodeId: 'W11_W7',   toNodeId: 'W11_W4',   lengthMeters: 240, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_C', fromNodeId: 'W11_W4',   toNodeId: 'W11_W1',   lengthMeters: 260, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_D', fromNodeId: 'W11_W1',   toNodeId: 'W11_NS',   lengthMeters: 190, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_E', fromNodeId: 'W11_NS',   toNodeId: 'W11_E4',   lengthMeters: 370, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_F', fromNodeId: 'W11_E4',   toNodeId: 'W11_E_END',lengthMeters: 340, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // W11 connectors to runway exits
    { id: 'W11_RWY_W4', fromNodeId: 'W11_W4', toNodeId: 'R1_W4', lengthMeters: 55, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_RWY_NS', fromNodeId: 'W11_NS', toNodeId: 'R1_NS', lengthMeters: 55, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // W11 connections to holding points
    { id: 'W11_H07L', fromNodeId: 'H07L',      toNodeId: 'W11_W',    lengthMeters:  40, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_H25R', fromNodeId: 'W11_E_END', toNodeId: 'H25R',     lengthMeters:  40, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_H25L', fromNodeId: 'W11_E_END', toNodeId: 'H25L',     lengthMeters:  95, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── W9 (far-west vertical, x=80) ─────────────────────────────────────────
    { id: 'W9_N', fromNodeId: 'W11_W',  toNodeId: 'W9_MID', lengthMeters: 280, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W9_S', fromNodeId: 'W9_MID', toNodeId: 'W9_S',   lengthMeters: 240, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── W7 column (x=280) ────────────────────────────────────────────────────
    { id: 'W7_N_SEG', fromNodeId: 'W11_W7', toNodeId: 'W7_N', lengthMeters:  60, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W7_MID',   fromNodeId: 'W7_N',   toNodeId: 'W7_S', lengthMeters: 490, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W7_HOLD',  fromNodeId: 'W7_S',   toNodeId: 'H07R', lengthMeters:  80, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── W4 column (x=371) ────────────────────────────────────────────────────
    { id: 'W4_N_SEG', fromNodeId: 'W11_W4', toNodeId: 'W4_N', lengthMeters:  60, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W4_VERT',  fromNodeId: 'W4_N',   toNodeId: 'W4_S', lengthMeters: 280, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W4_S_M1',  fromNodeId: 'W4_S',   toNodeId: 'M1_W', lengthMeters: 220, maxSpeedKts: 20, type: 'apron',   bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── W1 column (x=498) ────────────────────────────────────────────────────
    { id: 'W1_N_SEG', fromNodeId: 'W11_W1', toNodeId: 'W1_N', lengthMeters:  60, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W1_VERT',  fromNodeId: 'W1_N',   toNodeId: 'W1_S', lengthMeters: 280, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W1_S_M1',  fromNodeId: 'W1_S',   toNodeId: 'M1_C', lengthMeters: 120, maxSpeedKts: 20, type: 'apron',   bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── NS column (x=605) ────────────────────────────────────────────────────
    { id: 'NS_N_SEG', fromNodeId: 'W11_NS', toNodeId: 'NS_N', lengthMeters:  60, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'NS_VERT',  fromNodeId: 'NS_N',   toNodeId: 'NS_S', lengthMeters: 280, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'NS_S_M1',  fromNodeId: 'NS_S',   toNodeId: 'M1_E', lengthMeters:  50, maxSpeedKts: 20, type: 'apron',   bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── E4 column (x=724) ────────────────────────────────────────────────────
    { id: 'E4_N_SEG',   fromNodeId: 'W11_E4',  toNodeId: 'E4_N',     lengthMeters:  65, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'E4_INTL',    fromNodeId: 'E4_N',    toNodeId: 'INTL_APN', lengthMeters:  65, maxSpeedKts: 15, type: 'apron',   bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'INTL_E4_S',  fromNodeId: 'INTL_APN', toNodeId: 'E4_S',   lengthMeters: 135, maxSpeedKts: 15, type: 'apron',   bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'E4_RWY',     fromNodeId: 'E4_S',    toNodeId: 'R2_E4',   lengthMeters: 140, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── Upper lateral connector (links W7_N–NS_N, PARL TWY W1) ───────────────
    { id: 'LAT_N_W7W4', fromNodeId: 'W7_N', toNodeId: 'W4_N', lengthMeters: 245, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_N_W4W1', fromNodeId: 'W4_N', toNodeId: 'W1_N', lengthMeters: 260, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_N_W1NS', fromNodeId: 'W1_N', toNodeId: 'NS_N', lengthMeters: 190, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_N_NSE4', fromNodeId: 'NS_N', toNodeId: 'E4_N', lengthMeters: 370, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── M1 apron taxiway ─────────────────────────────────────────────────────
    { id: 'M1_WC', fromNodeId: 'M1_W', toNodeId: 'M1_C', lengthMeters: 250, maxSpeedKts: 10, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'M1_CE', fromNodeId: 'M1_C', toNodeId: 'M1_E', lengthMeters: 200, maxSpeedKts: 10, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── Lower lateral (links W9_S–E4_S) ─────────────────────────────────────
    { id: 'LAT_S_W9W7', fromNodeId: 'W9_S', toNodeId: 'W7_S', lengthMeters: 190, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_S_W7W4', fromNodeId: 'W7_S', toNodeId: 'W4_S', lengthMeters: 245, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_S_W4W1', fromNodeId: 'W4_S', toNodeId: 'W1_S', lengthMeters: 260, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_S_W1NS', fromNodeId: 'W1_S', toNodeId: 'NS_S', lengthMeters: 190, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_S_NSE4', fromNodeId: 'NS_S', toNodeId: 'E4_S', lengthMeters: 370, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── DOM PAX Terminal stand connections ───────────────────────────────────
    { id: 'DOM_S1_CONN', fromNodeId: 'DOM_S1', toNodeId: 'M1_W', lengthMeters: 90,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'DOM_S2_CONN', fromNodeId: 'DOM_S2', toNodeId: 'M1_C', lengthMeters: 95,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'DOM_S3_CONN', fromNodeId: 'DOM_S3', toNodeId: 'M1_C', lengthMeters: 70,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'DOM_S4_CONN', fromNodeId: 'DOM_S4', toNodeId: 'M1_C', lengthMeters: 95,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'DOM_S5_CONN', fromNodeId: 'DOM_S5', toNodeId: 'M1_E', lengthMeters: 80,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── INTL PAX Terminal stand connections ───────────────────────────────────
    { id: 'INTL_S1_CONN', fromNodeId: 'INTL_S1', toNodeId: 'INTL_APN', lengthMeters:  50, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'INTL_S2_CONN', fromNodeId: 'INTL_S2', toNodeId: 'INTL_APN', lengthMeters:  20, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'INTL_S3_CONN', fromNodeId: 'INTL_S3', toNodeId: 'INTL_APN', lengthMeters:  20, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'INTL_S4_CONN', fromNodeId: 'INTL_S4', toNodeId: 'INTL_APN', lengthMeters:  50, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── Parking position connections ──────────────────────────────────────────
    { id: 'P1_CONN', fromNodeId: 'P1', toNodeId: 'M1_E', lengthMeters: 110, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'P2_CONN', fromNodeId: 'P2', toNodeId: 'M1_E', lengthMeters: 85,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'P3_CONN', fromNodeId: 'P3', toNodeId: 'M1_C', lengthMeters: 30,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'P4_CONN', fromNodeId: 'P4', toNodeId: 'M1_C', lengthMeters: 25,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'P5_CONN', fromNodeId: 'P5', toNodeId: 'M1_C', lengthMeters: 60,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
  ],
};

export function getNode(id: string) {
  return airportGraph.nodes.find(n => n.id === id);
}

export function getAdjacentEdges(nodeId: string, edges: typeof airportGraph.edges) {
  return edges.filter(e =>
    e.fromNodeId === nodeId || (e.bidirectional && e.toNodeId === nodeId)
  );
}

export const START_NODES = airportGraph.nodes.filter(n =>
  ['stand', 'gate', 'holding_point', 'runway_entry'].includes(n.type)
);

export const DESTINATION_NODES = airportGraph.nodes.filter(n =>
  ['holding_point', 'runway_entry', 'stand', 'gate'].includes(n.type)
);
