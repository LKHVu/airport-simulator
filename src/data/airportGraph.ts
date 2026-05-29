// Airport graph modelled after Tan Son Nhat International (VVTS/SGN) — simplified.
// NOT an operational chart — educational/demo only.
//
// Layout (SVG 1200×700, origin top-left, North=up):
//   RWY 07L/25R (north runway): y=115, x=60..1140
//   RWY 07R/25L (south runway): y=240, x=60..1140
//   GROUND 1 infield: between y=115 and y=240
//   GROUND 2 apron/terminal: south of y=240
//   W11 parallel taxiway between runways: y≈158
//   N-S taxiways: W9(x=200), W7(x=315), W4(x=430), W1(x=550), NS(x=650), E4(x=800)
//   M1 apron taxiway (angled ~-27°): serves DOM PAX Terminal stands

import type { AirportGraph } from '../types';

export const SVG_WIDTH  = 1200;
export const SVG_HEIGHT = 860;

export const airportGraph: AirportGraph = {
  nodes: [

    // ── Runway thresholds ────────────────────────────────────────────────────
    { id: 'RWY07L_THR', label: '07L', type: 'runway_entry', x: 60,   y: 115, description: 'Runway 07L threshold' },
    { id: 'RWY25R_THR', label: '25R', type: 'runway_entry', x: 1140, y: 115, description: 'Runway 25R threshold' },
    { id: 'RWY07R_THR', label: '07R', type: 'runway_entry', x: 60,   y: 240, description: 'Runway 07R threshold' },
    { id: 'RWY25L_THR', label: '25L', type: 'runway_entry', x: 1140, y: 240, description: 'Runway 25L threshold' },

    // Runway intermediate exit/entry points
    { id: 'R1_W4', label: '', type: 'runway_entry', x: 430, y: 115, description: 'Top runway – W4 intersection' },
    { id: 'R1_NS', label: '', type: 'runway_entry', x: 650, y: 115, description: 'Top runway – NS1 intersection (INT TKOF 25R)' },
    { id: 'R2_W7', label: '', type: 'runway_entry', x: 315, y: 240, description: 'Bottom runway – W7 intersection (INT TKOF 07R)' },
    { id: 'R2_E4', label: '', type: 'runway_entry', x: 800, y: 240, description: 'Bottom runway – E4 intersection (INT TKOF 25L)' },

    // ── Holding points ───────────────────────────────────────────────────────
    { id: 'H07L', label: 'H-07L', type: 'holding_point', x: 200,  y: 140, description: 'Holding point RWY 07L' },
    { id: 'H25R', label: 'H-25R', type: 'holding_point', x: 975,  y: 127, description: 'Holding point RWY 25R' },
    { id: 'H07R', label: 'H-07R', type: 'holding_point', x: 315,  y: 218, description: 'Holding point RWY 07R (TWY W7)' },
    { id: 'H25L', label: 'H-25L', type: 'holding_point', x: 975,  y: 255, description: 'Holding point RWY 25L' },

    // ── W11 parallel taxiway (between runways, y≈158–163) ──────────────────
    { id: 'W11_W',    label: 'W11', type: 'intersection', x: 200, y: 158, description: 'W11 west end' },
    { id: 'W11_W7',   label: '',    type: 'intersection', x: 315, y: 160, description: 'W11 at W7' },
    { id: 'W11_W4',   label: '',    type: 'intersection', x: 430, y: 162, description: 'W11 at W4' },
    { id: 'W11_W1',   label: '',    type: 'intersection', x: 550, y: 163, description: 'W11 at W1' },
    { id: 'W11_NS',   label: '',    type: 'intersection', x: 650, y: 163, description: 'W11 at NS' },
    { id: 'W11_E4',   label: '',    type: 'intersection', x: 800, y: 160, description: 'W11 at E4' },
    { id: 'W11_E_END',label: '',    type: 'intersection', x: 975, y: 160, description: 'W11 east end (near 25R/25L)' },

    // ── W9 (far-west vertical, x=200) ────────────────────────────────────────
    { id: 'W9_MID', label: 'W9', type: 'intersection', x: 200, y: 330, description: 'TWY W9 mid' },
    { id: 'W9_S',   label: '',   type: 'intersection', x: 200, y: 470, description: 'TWY W9 south' },

    // ── W7 (x=315, serves INT TKOF RWY 07R) ──────────────────────────────────
    { id: 'W7_N', label: 'W7', type: 'intersection', x: 315, y: 285, description: 'TWY W7 north junction' },
    { id: 'W7_S', label: '',   type: 'intersection', x: 315, y: 470, description: 'TWY W7 south junction' },

    // ── W4 (x=430) ───────────────────────────────────────────────────────────
    { id: 'W4_N', label: 'W4', type: 'intersection', x: 430, y: 285, description: 'TWY W4 north junction' },
    { id: 'W4_S', label: '',   type: 'intersection', x: 430, y: 470, description: 'TWY W4 south junction' },

    // ── W1 / APN taxiway (x=550) ─────────────────────────────────────────────
    { id: 'W1_N', label: 'W1', type: 'intersection', x: 550, y: 285, description: 'TWY W1 north junction' },
    { id: 'W1_S', label: '',   type: 'intersection', x: 550, y: 470, description: 'TWY W1 south junction' },

    // ── NS north-south connector (x=650) ─────────────────────────────────────
    { id: 'NS_N', label: 'NS', type: 'intersection', x: 650, y: 285, description: 'TWY NS north junction' },
    { id: 'NS_S', label: '',   type: 'intersection', x: 650, y: 470, description: 'TWY NS south junction' },

    // ── E4 (x=800, serves INT TKOF 25R/25L) ─────────────────────────────────
    { id: 'E4_N', label: 'E4', type: 'intersection', x: 800, y: 285, description: 'TWY E4 north junction' },
    { id: 'E4_S', label: '',   type: 'intersection', x: 800, y: 470, description: 'TWY E4 south junction' },

    // ── M1 apron taxiway (angled ~-27°, serves DOM PAX Terminal) ─────────────
    { id: 'M1_W', label: 'M1', type: 'apron', x: 345, y: 525, description: 'M1 apron taxiway west' },
    { id: 'M1_C', label: '',   type: 'apron', x: 510, y: 468, description: 'M1 apron taxiway central' },
    { id: 'M1_E', label: '',   type: 'apron', x: 655, y: 415, description: 'M1 apron taxiway east' },

    // ── DOM PAX Terminal stands (angled NW→SE, matching real TSN geometry) ───
    { id: 'DOM_S1', label: 'D1', type: 'stand', x: 390, y: 512, description: 'Domestic stand D1' },
    { id: 'DOM_S2', label: 'D2', type: 'stand', x: 445, y: 490, description: 'Domestic stand D2' },
    { id: 'DOM_S3', label: 'D3', type: 'stand', x: 500, y: 468, description: 'Domestic stand D3' },
    { id: 'DOM_S4', label: 'D4', type: 'stand', x: 555, y: 448, description: 'Domestic stand D4' },
    { id: 'DOM_S5', label: 'D5', type: 'stand', x: 605, y: 428, description: 'Domestic stand D5' },

    // ── Parking positions P1-P5 (Ground 2 / DOM apron positions) ─────────────
    { id: 'P1', label: 'P1', type: 'stand', x: 680, y: 380, description: 'Parking position P1' },
    { id: 'P2', label: 'P2', type: 'stand', x: 628, y: 358, description: 'Parking position P2' },
    { id: 'P3', label: 'P3', type: 'stand', x: 520, y: 490, description: 'Parking position P3' },
    { id: 'P4', label: 'P4', type: 'stand', x: 540, y: 472, description: 'Parking position P4' },
    { id: 'P5', label: 'P5', type: 'stand', x: 380, y: 512, description: 'Parking position P5' },

    // ── INTL PAX Terminal (east area) ────────────────────────────────────────
    { id: 'INTL_APN', label: '',   type: 'apron', x: 878, y: 375, description: 'INTL apron junction' },
    { id: 'INTL_S1',  label: 'I1', type: 'stand', x: 960, y: 305, description: 'International stand I1' },
    { id: 'INTL_S2',  label: 'I2', type: 'stand', x: 960, y: 355, description: 'International stand I2' },
    { id: 'INTL_S3',  label: 'I3', type: 'stand', x: 960, y: 412, description: 'International stand I3' },
    { id: 'INTL_S4',  label: 'I4', type: 'stand', x: 960, y: 462, description: 'International stand I4' },
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

    // ── W11 parallel taxiway ──────────────────────────────────────────────────
    { id: 'W11_A', fromNodeId: 'W11_W',    toNodeId: 'W11_W7',   lengthMeters: 190, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_B', fromNodeId: 'W11_W7',   toNodeId: 'W11_W4',   lengthMeters: 240, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_C', fromNodeId: 'W11_W4',   toNodeId: 'W11_W1',   lengthMeters: 260, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_D', fromNodeId: 'W11_W1',   toNodeId: 'W11_NS',   lengthMeters: 190, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_E', fromNodeId: 'W11_NS',   toNodeId: 'W11_E4',   lengthMeters: 370, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    // W11 extension east toward runway ends (creates the Y-branch in reference)
    { id: 'W11_F', fromNodeId: 'W11_E4',   toNodeId: 'W11_E_END',lengthMeters: 340, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // W11 connectors to runway exits
    { id: 'W11_RWY_W4', fromNodeId: 'W11_W4', toNodeId: 'R1_W4', lengthMeters: 55, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_RWY_NS', fromNodeId: 'W11_NS', toNodeId: 'R1_NS', lengthMeters: 55, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // W11 Y-branch connections to holding points at east runway ends
    { id: 'W11_H07L', fromNodeId: 'H07L',      toNodeId: 'W11_W',    lengthMeters:  40, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_H25R', fromNodeId: 'W11_E_END', toNodeId: 'H25R',     lengthMeters:  40, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_H25L', fromNodeId: 'W11_E_END', toNodeId: 'H25L',     lengthMeters:  95, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── W9 (far-west vertical) ────────────────────────────────────────────────
    { id: 'W9_N', fromNodeId: 'W11_W',  toNodeId: 'W9_MID', lengthMeters: 280, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W9_S', fromNodeId: 'W9_MID', toNodeId: 'W9_S',   lengthMeters: 240, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── W7 column (x=315) ────────────────────────────────────────────────────
    { id: 'W7_N_SEG', fromNodeId: 'W11_W7', toNodeId: 'W7_N', lengthMeters:  60, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W7_MID',   fromNodeId: 'W7_N',   toNodeId: 'W7_S', lengthMeters: 490, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W7_HOLD',  fromNodeId: 'W7_S',   toNodeId: 'H07R', lengthMeters:  80, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── W4 column (x=430) ────────────────────────────────────────────────────
    { id: 'W4_N_SEG', fromNodeId: 'W11_W4', toNodeId: 'W4_N', lengthMeters:  60, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W4_M1',    fromNodeId: 'W4_N',   toNodeId: 'M1_W', lengthMeters: 300, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W4_S_SEG', fromNodeId: 'M1_W',   toNodeId: 'W4_S', lengthMeters: 180, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── W1 column (x=550) ────────────────────────────────────────────────────
    { id: 'W1_N_SEG', fromNodeId: 'W11_W1', toNodeId: 'W1_N', lengthMeters:  60, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W1_M1',    fromNodeId: 'W1_N',   toNodeId: 'M1_C', lengthMeters: 300, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W1_S_SEG', fromNodeId: 'M1_C',   toNodeId: 'W1_S', lengthMeters: 150, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── NS column (x=650) ────────────────────────────────────────────────────
    { id: 'NS_N_SEG', fromNodeId: 'W11_NS', toNodeId: 'NS_N', lengthMeters:  60, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'NS_M1',    fromNodeId: 'NS_N',   toNodeId: 'M1_E', lengthMeters: 300, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'NS_S_SEG', fromNodeId: 'M1_E',   toNodeId: 'NS_S', lengthMeters: 140, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── E4 column (x=800) ────────────────────────────────────────────────────
    { id: 'E4_N_SEG',   fromNodeId: 'W11_E4',  toNodeId: 'E4_N',     lengthMeters:  65, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'E4_INTL',    fromNodeId: 'E4_N',    toNodeId: 'INTL_APN', lengthMeters: 200, maxSpeedKts: 15, type: 'apron',   bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'INTL_E4_S',  fromNodeId: 'INTL_APN', toNodeId: 'E4_S',   lengthMeters: 200, maxSpeedKts: 15, type: 'apron',   bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'E4_RWY',     fromNodeId: 'E4_S',    toNodeId: 'R2_E4',   lengthMeters: 140, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── Upper lateral connector (links W7_N–E4_N) ────────────────────────────
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
    { id: 'INTL_S1_CONN', fromNodeId: 'INTL_S1', toNodeId: 'INTL_APN', lengthMeters: 140, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'INTL_S2_CONN', fromNodeId: 'INTL_S2', toNodeId: 'INTL_APN', lengthMeters: 130, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'INTL_S3_CONN', fromNodeId: 'INTL_S3', toNodeId: 'INTL_APN', lengthMeters: 120, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'INTL_S4_CONN', fromNodeId: 'INTL_S4', toNodeId: 'INTL_APN', lengthMeters: 140, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── Parking position connections ──────────────────────────────────────────
    { id: 'P1_CONN', fromNodeId: 'P1', toNodeId: 'M1_E', lengthMeters: 75,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'P2_CONN', fromNodeId: 'P2', toNodeId: 'M1_E', lengthMeters: 85,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'P3_CONN', fromNodeId: 'P3', toNodeId: 'M1_C', lengthMeters: 60,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'P4_CONN', fromNodeId: 'P4', toNodeId: 'M1_C', lengthMeters: 50,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'P5_CONN', fromNodeId: 'P5', toNodeId: 'M1_W', lengthMeters: 55,  maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
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
