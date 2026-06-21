// Airport graph modelled after Tan Son Nhat International (VVTS/SGN) — simplified.
// NOT an operational chart — educational/demo only.
//
// Layout (SVG 1200×860, origin top-left, North=up).
// Node positions CALIBRATED to the chart background ref_full.png (1309×875 @ SVG 1200×860):
//   RWY 07L/25R (north runway): center y=98
//   RWY 07R/25L (south runway): center y=233
//   PARL TWY W11 lateral:       y=343
//   Apron top edge:             y≈356
//   M1 apron taxiway: diagonal black line x=658→566, y=398→600
//
// X is largely aligned to the chart already; the recalibration was primarily a
// piecewise-linear Y-stretch (73→98, 156→233, 186→343) plus the M1 diagonal X.

import type { AirportGraph } from '../types';

export const SVG_WIDTH  = 1200;
export const SVG_HEIGHT = 860;

export const airportGraph: AirportGraph = {
  nodes: [

    // ── Runway thresholds ────────────────────────────────────────────────────
    { id: 'RWY07L_THR', label: '07L', type: 'runway_entry', x: 65,   y: 98,  description: 'Runway 07L threshold' },
    { id: 'RWY25R_THR', label: '25R', type: 'runway_entry', x: 1010, y: 98,  description: 'Runway 25R threshold' },
    { id: 'RWY07R_THR', label: '07R', type: 'runway_entry', x: 62,   y: 233, description: 'Runway 07R threshold' },
    { id: 'RWY25L_THR', label: '25L', type: 'runway_entry', x: 1130, y: 233, description: 'Runway 25L threshold' },

    // Runway intermediate exit/entry points
    { id: 'R1_W4', label: '', type: 'runway_entry', x: 371, y: 98,  description: 'Top runway – W4 intersection' },
    { id: 'R1_NS', label: '', type: 'runway_entry', x: 605, y: 98,  description: 'Top runway – NS1 intersection (INT TKOF 25R)' },
    { id: 'R2_W7', label: '', type: 'runway_entry', x: 275,  y: 233, description: 'Bottom runway – W7 exit (INT TKOF 07R)' },
    { id: 'R2_W5', label: '', type: 'runway_entry', x: 492,  y: 233, description: 'Bottom runway – W5 intersection' },
    { id: 'R2_W3', label: '', type: 'runway_entry', x: 598,  y: 233, description: 'Bottom runway – W3 intersection' },
    { id: 'R2_E4', label: '', type: 'runway_entry', x: 1095, y: 233, description: 'Bottom runway – E4 intersection (INT TKOF 25L)' },

    // ── Holding points ───────────────────────────────────────────────────────
    { id: 'H07L', label: 'H-07L', type: 'holding_point', x: 62,  y: 115, description: 'Holding point RWY 07L (top of W6 curve)' },
    { id: 'H25R', label: 'H-25R', type: 'holding_point', x: 975, y: 120, description: 'Holding point RWY 25R' },
    { id: 'H07R', label: 'H-07R', type: 'holding_point', x: 262, y: 292, description: 'Holding point RWY 07R (on the W7 curve)' },
    { id: 'H25L', label: 'H-25L', type: 'holding_point', x: 1095, y: 258, description: 'Holding point RWY 25L (TWY E4)' },

    // ── PARL TWY W11 (below south runway, chart y=343) ───────────────────────
    { id: 'W11_W',    label: 'W11', type: 'intersection', x: 55,  y: 344, description: 'W11 west end' },
    { id: 'W11_W7',   label: '',    type: 'intersection', x: 280, y: 343, description: 'W11 at W7' },
    { id: 'W11_W4',   label: '',    type: 'intersection', x: 371, y: 343, description: 'W11 at W4' },
    { id: 'W11_W1',   label: '',    type: 'intersection', x: 498, y: 343, description: 'W11 at W1' },
    { id: 'W11_NS',   label: '',    type: 'intersection', x: 605, y: 343, description: 'W11 at NS' },
    { id: 'W11_E4',   label: '',    type: 'intersection', x: 724, y: 343, description: 'W11 at E4' },
    { id: 'W11_E_END',label: '',    type: 'intersection', x: 900, y: 343, description: 'W11 east end (near 25R/25L)' },

    // ── W9 (far-west vertical, x≈55) ─────────────────────────────────────────
    { id: 'W9_MID', label: 'W9', type: 'intersection', x: 55, y: 354, description: 'TWY W9 mid' },
    { id: 'W9_S',   label: '',   type: 'intersection', x: 55, y: 364, description: 'TWY W9 south' },

    // ── W11 west loop + W6 curve up to RWY 07L (leftmost black taxiway) ───────
    { id: 'W11_LOOP', label: '', type: 'intersection', x: 24, y: 340, description: 'W11 west end / base of leftmost vertical (loop)' },
    { id: 'W6_A',     label: '', type: 'intersection', x: 20, y: 255, description: 'Leftmost vertical taxiway (W6 lower)' },
    { id: 'W6_B',     label: '', type: 'intersection', x: 24, y: 185, description: 'W6 curve start (above 07R)' },
    { id: 'W6_C',     label: 'W6', type: 'intersection', x: 45, y: 140, description: 'W6 curve toward 07L threshold' },

    // ── W7 (x=280) ──────────────────────────────────────────────────────────
    { id: 'W7_N', label: 'W7', type: 'intersection', x: 280, y: 351, description: 'TWY W7 north junction (apron-top)' },
    { id: 'W7_S', label: '',   type: 'intersection', x: 280, y: 362, description: 'TWY W7 south junction (apron-top)' },

    // ── W7 curve: south runway 07R exit → W11 (joins W11 at x≈390) ───────────
    { id: 'W7J',  label: '', type: 'intersection', x: 390, y: 343, description: 'W7 curve junction with W11' },
    { id: 'W7_C', label: '', type: 'intersection', x: 330, y: 330, description: 'W7 curve sweep point' },

    // ── W5 curve: south runway → W11 (joins W11 at x≈455) ────────────────────
    { id: 'W5J',  label: '', type: 'intersection', x: 455, y: 343, description: 'W5 curve junction with W11' },
    { id: 'W5_C', label: '', type: 'intersection', x: 472, y: 290, description: 'W5 curve sweep point' },

    // ── W3 curve: south runway → W11 (joins W11 at x≈685) ────────────────────
    { id: 'W3J',  label: '', type: 'intersection', x: 685, y: 343, description: 'W3 curve junction with W11' },
    { id: 'W3_C', label: 'W3', type: 'intersection', x: 640, y: 290, description: 'W3 curve sweep point' },

    // ── W4 (x=371) ───────────────────────────────────────────────────────────
    { id: 'W4_N', label: 'W4', type: 'intersection', x: 371, y: 351, description: 'TWY W4 north junction' },
    { id: 'W4_S', label: '',   type: 'intersection', x: 371, y: 362, description: 'TWY W4 south junction' },

    // ── W1 / APN taxiway (x=498) ─────────────────────────────────────────────
    { id: 'W1_N', label: 'W1', type: 'intersection', x: 498, y: 351, description: 'TWY W1 north junction' },
    { id: 'W1_S', label: '',   type: 'intersection', x: 498, y: 362, description: 'TWY W1 south junction' },

    // ── NS north-south connector (x=605) ─────────────────────────────────────
    { id: 'NS_N', label: 'NS', type: 'intersection', x: 605, y: 351, description: 'TWY NS north junction' },
    { id: 'NS_S', label: '',   type: 'intersection', x: 605, y: 362, description: 'TWY NS south junction' },

    // ── E4 apron junction (x=724, near closed TWY W1) ────────────────────────
    { id: 'E4_N', label: '', type: 'intersection', x: 724, y: 343, description: 'INTL apron upper junction' },
    { id: 'E4_S', label: '',   type: 'intersection', x: 724, y: 362, description: 'INTL apron lower junction' },

    // ── East end: W11 extension + E4/E-curve access to 25L / 25R thresholds ───
    { id: 'W11_EE', label: '', type: 'intersection', x: 1090, y: 343, description: 'W11 far-east end (foot of TWY E4)' },
    { id: 'E4_RC',  label: 'E4', type: 'intersection', x: 1093, y: 295, description: 'TWY E4 curve toward 25L' },
    { id: 'E25R_C', label: '', type: 'intersection', x: 1035, y: 200, description: 'East taxiway crossing toward 25R threshold' },

    // ── M1 apron taxiway (diagonal SW edge of the DOM apron) ─────────────────
    // Positions trace the chart's black M1 centerline: x = 658.5 − 0.455·(y−396).
    { id: 'M1_P3',  label: '',   type: 'apron', x: 658, y: 398, description: 'M1 apron taxiway P3 level junction' },
    { id: 'M1_N',   label: 'M1', type: 'apron', x: 650, y: 415, description: 'M1 apron taxiway north junction (D5 level)' },
    { id: 'M1_P2',  label: '',   type: 'apron', x: 643, y: 430, description: 'M1 apron taxiway P2 level junction' },
    { id: 'M1_P1',  label: '',   type: 'apron', x: 634, y: 449, description: 'M1 apron taxiway P1 level junction' },
    { id: 'M1_1',   label: '',   type: 'apron', x: 624, y: 471, description: 'M1 apron taxiway D4 junction' },
    { id: 'M1_2',   label: '',   type: 'apron', x: 608, y: 507, description: 'M1 apron taxiway D3 junction' },
    { id: 'M1_3',   label: '',   type: 'apron', x: 589, y: 548, description: 'M1 apron taxiway D2 junction' },
    { id: 'M1_S',   label: '',   type: 'apron', x: 645, y: 580, description: 'M1 apron taxiway south end (D1 level, on the down-right elbow segment)' },

    // ── DOM PAX Terminal stands (east of M1) ─────────────────────────────────
    { id: 'DOM_S5', label: 'D5', type: 'stand', x: 729, y: 415, description: 'Domestic stand D5' },
    { id: 'DOM_S4', label: 'D4', type: 'stand', x: 694, y: 476, description: 'Domestic stand D4' },
    { id: 'DOM_S3', label: 'D3', type: 'stand', x: 682, y: 509, description: 'Domestic stand D3' },
    { id: 'DOM_S2', label: 'D2', type: 'stand', x: 666, y: 557, description: 'Domestic stand D2' },
    { id: 'DOM_S1', label: 'D1', type: 'stand', x: 662, y: 590, description: 'Domestic stand D1' },

    // ── Parking positions P1-P5 (upper-apron area) ───────────────────────────
    { id: 'P1', label: 'P1', type: 'stand', x: 770, y: 444, description: 'Parking position P1' },
    { id: 'P2', label: 'P2', type: 'stand', x: 751, y: 430, description: 'Parking position P2' },
    { id: 'P3', label: 'P3', type: 'stand', x: 719, y: 397, description: 'Parking position P3' },
    { id: 'P4', label: 'P4', type: 'stand', x: 678, y: 520, description: 'Parking position P4' },
    { id: 'P5', label: 'P5', type: 'stand', x: 663, y: 565, description: 'Parking position P5' },

    // ── INTL PAX Terminal (east area) ─────────────────────────────────────────
    { id: 'INTL_APN', label: '',   type: 'apron', x: 724, y: 362, description: 'INTL apron junction' },
    { id: 'INTL_S1',  label: 'I1', type: 'stand', x: 724, y: 336, description: 'International stand I1' },
    { id: 'INTL_S2',  label: 'I2', type: 'stand', x: 724, y: 350, description: 'International stand I2' },
    { id: 'INTL_S3',  label: 'I3', type: 'stand', x: 724, y: 360, description: 'International stand I3' },
    { id: 'INTL_S4',  label: 'I4', type: 'stand', x: 724, y: 374, description: 'International stand I4' },

    // ── HS hot-spots (the points aircraft can travel to/from) ────────────────
    // West (07R / W7 area)
    { id: 'HS15', label: 'HS15', type: 'hotspot', x: 110,  y: 258, description: 'Hot spot HS15 (07R / W11 west)' },
    { id: 'HS16', label: 'HS16', type: 'hotspot', x: 268,  y: 215, description: 'Hot spot HS16 (RWY 07R x TWY W7)' },
    // DOM apron
    { id: 'HS4',  label: 'HS4',  type: 'hotspot', x: 700,  y: 365, description: 'Hot spot HS4 (apron entry)' },
    { id: 'HS5',  label: 'HS5',  type: 'hotspot', x: 700,  y: 455, description: 'Hot spot HS5 (DOM apron)' },
    { id: 'HS3',  label: 'HS3',  type: 'hotspot', x: 655,  y: 562, description: 'Hot spot HS3 (M1 apron)' },
    // East interchange (E2/E4/E8/NS2 maze, between the runways)
    { id: 'HS7',  label: 'HS7',  type: 'hotspot', x: 917,  y: 200, description: 'Hot spot HS7' },
    { id: 'HS11', label: 'HS11', type: 'hotspot', x: 809,  y: 297, description: 'Hot spot HS11' },
    { id: 'HS17', label: 'HS17', type: 'hotspot', x: 845,  y: 320, description: 'Hot spot HS17' },
    { id: 'HS12', label: 'HS12', type: 'hotspot', x: 949,  y: 283, description: 'Hot spot HS12' },
    { id: 'HS6',  label: 'HS6',  type: 'hotspot', x: 916,  y: 392, description: 'Hot spot HS6' },
    { id: 'HS13', label: 'HS13', type: 'hotspot', x: 1062, y: 273, description: 'Hot spot HS13' },
    { id: 'HS9',  label: 'HS9',  type: 'hotspot', x: 1061, y: 314, description: 'Hot spot HS9' },
    { id: 'HS10', label: 'HS10', type: 'hotspot', x: 1145, y: 316, description: 'Hot spot HS10' },
    { id: 'HS8',  label: 'HS8',  type: 'hotspot', x: 1154, y: 383, description: 'Hot spot HS8' },
    { id: 'HS14', label: 'HS14', type: 'hotspot', x: 1185, y: 325, description: 'Hot spot HS14' },
  ],

  edges: [

    // ── RWY 07L/25R segments (top runway) ────────────────────────────────────
    { id: 'RWY1_SEG1', fromNodeId: 'RWY07L_THR', toNodeId: 'R1_W4',      lengthMeters: 1200, maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'RWY1_SEG2', fromNodeId: 'R1_W4',      toNodeId: 'R1_NS',       lengthMeters: 770,  maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'RWY1_SEG3', fromNodeId: 'R1_NS',      toNodeId: 'RWY25R_THR',  lengthMeters: 1600, maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },

    // ── RWY 07R/25L segments (bottom runway) ─────────────────────────────────
    { id: 'RWY2_SEG1', fromNodeId: 'RWY07R_THR', toNodeId: 'R2_W7',       lengthMeters: 800,  maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'RWY2_SEG2a', fromNodeId: 'R2_W7',     toNodeId: 'R2_W5',       lengthMeters: 740,  maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'RWY2_SEG2b', fromNodeId: 'R2_W5',     toNodeId: 'R2_W3',       lengthMeters: 360,  maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'RWY2_SEG2c', fromNodeId: 'R2_W3',     toNodeId: 'R2_E4',       lengthMeters: 1690, maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'RWY2_SEG3',  fromNodeId: 'R2_E4',     toNodeId: 'RWY25L_THR',  lengthMeters: 120,  maxSpeedKts: 130, type: 'runway', bidirectional: false, status: 'open', trafficLevel: 'low' },

    // ── Holding connectors ────────────────────────────────────────────────────
    { id: 'HOLD_07L', fromNodeId: 'H07L', toNodeId: 'RWY07L_THR', lengthMeters: 24, maxSpeedKts: 15, type: 'holding', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'HOLD_25R', fromNodeId: 'H25R', toNodeId: 'RWY25R_THR', lengthMeters: 42, maxSpeedKts: 15, type: 'holding', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'HOLD_07R', fromNodeId: 'H07R', toNodeId: 'R2_W7',       lengthMeters:  60, maxSpeedKts: 15, type: 'holding', bidirectional: false, status: 'open', trafficLevel: 'low' },
    { id: 'HOLD_25L', fromNodeId: 'H25L', toNodeId: 'RWY25L_THR', lengthMeters: 43, maxSpeedKts: 15, type: 'holding', bidirectional: false, status: 'open', trafficLevel: 'low' },

    // ── W11 lateral taxiway (below south runway) ──────────────────────────────
    { id: 'W11_A', fromNodeId: 'W11_W',    toNodeId: 'W11_W7',   lengthMeters: 225, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_B', fromNodeId: 'W11_W7',   toNodeId: 'W11_W4',   lengthMeters: 91, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_C',  fromNodeId: 'W11_W4',  toNodeId: 'W7J',      lengthMeters:  19, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_C2', fromNodeId: 'W7J',     toNodeId: 'W5J',      lengthMeters:  65, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_C3', fromNodeId: 'W5J',     toNodeId: 'W11_W1',   lengthMeters:  43, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_D', fromNodeId: 'W11_W1',   toNodeId: 'W11_NS',   lengthMeters: 107, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_E', fromNodeId: 'W11_NS',   toNodeId: 'W3J',      lengthMeters:  80, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_E2',fromNodeId: 'W3J',      toNodeId: 'W11_E4',   lengthMeters:  39, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_F', fromNodeId: 'W11_E4',   toNodeId: 'W11_E_END',lengthMeters: 176, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W11_G', fromNodeId: 'W11_E_END',toNodeId: 'W11_EE',   lengthMeters: 190, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // W5 / W3 curved connectors from W11 up to the south runway
    { id: 'W5_J_C', fromNodeId: 'W5J',  toNodeId: 'W5_C', lengthMeters: 56, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W5_C_R', fromNodeId: 'W5_C', toNodeId: 'R2_W5', lengthMeters: 61, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W3_J_C', fromNodeId: 'W3J',  toNodeId: 'W3_C', lengthMeters: 70, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W3_C_R', fromNodeId: 'W3_C', toNodeId: 'R2_W3', lengthMeters: 75, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // (Removed W11_RWY_W4 / W11_RWY_NS — the chart has NO central taxiway crossing the
    //  infield to the top runway. 07L is reached via the W6 curve (west); 25R via the east.)

    // W7 curve: 07R south-runway exit → W11 junction at x≈390
    { id: 'W7_J_C', fromNodeId: 'W7J',  toNodeId: 'W7_C', lengthMeters: 62, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W7_C_H', fromNodeId: 'W7_C', toNodeId: 'H07R', lengthMeters: 80, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // W11 connections to holding points
    // 07L approach via the leftmost W11 loop + W6 curve (replaces the old straight W11_W→H07L)
    { id: 'W11_LOOP_E', fromNodeId: 'W11_W',    toNodeId: 'W11_LOOP', lengthMeters:   31, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W6_S1',      fromNodeId: 'W11_LOOP', toNodeId: 'W6_A',     lengthMeters:   85, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W6_S2',      fromNodeId: 'W6_A',     toNodeId: 'W6_B',     lengthMeters:   70, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W6_S3',      fromNodeId: 'W6_B',     toNodeId: 'W6_C',     lengthMeters:   49, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W6_S4',      fromNodeId: 'W6_C',     toNodeId: 'H07L',     lengthMeters:   32, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    // 25L via TWY E4 (east end), 25R via the east taxiway crossing — both off W11_EE
    { id: 'E4_TX',    fromNodeId: 'W11_EE',  toNodeId: 'E4_RC',  lengthMeters: 49, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'E4_H25L',  fromNodeId: 'E4_RC',   toNodeId: 'H25L',   lengthMeters: 37, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'E4_R2',    fromNodeId: 'H25L',    toNodeId: 'R2_E4',  lengthMeters: 25, maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'E25R_TX',  fromNodeId: 'W11_EE',  toNodeId: 'E25R_C', lengthMeters: 153, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'E25R_H',   fromNodeId: 'E25R_C',  toNodeId: 'H25R',   lengthMeters: 102, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── W9 (far-west vertical, x=80) ─────────────────────────────────────────
    { id: 'W9_N', fromNodeId: 'W11_W',  toNodeId: 'W9_MID', lengthMeters: 10, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W9_S', fromNodeId: 'W9_MID', toNodeId: 'W9_S',   lengthMeters: 10, maxSpeedKts: 20, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── W7 column (x=280) ────────────────────────────────────────────────────
    { id: 'W7_N_SEG', fromNodeId: 'W11_W7', toNodeId: 'W7_N', lengthMeters:  10, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W7_MID',   fromNodeId: 'W7_N',   toNodeId: 'W7_S', lengthMeters: 11, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── W4 column (x=371) ────────────────────────────────────────────────────
    { id: 'W4_N_SEG', fromNodeId: 'W11_W4', toNodeId: 'W4_N', lengthMeters:  10, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W4_VERT',  fromNodeId: 'W4_N',   toNodeId: 'W4_S', lengthMeters: 11, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── W1 column (x=498) ────────────────────────────────────────────────────
    { id: 'W1_N_SEG', fromNodeId: 'W11_W1', toNodeId: 'W1_N', lengthMeters:  10, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'W1_VERT',  fromNodeId: 'W1_N',   toNodeId: 'W1_S', lengthMeters: 11, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── NS column (x=605) ────────────────────────────────────────────────────
    { id: 'NS_N_SEG', fromNodeId: 'W11_NS', toNodeId: 'NS_N', lengthMeters:  10, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'NS_VERT',  fromNodeId: 'NS_N',   toNodeId: 'NS_S', lengthMeters: 11, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'NS_S_M1',  fromNodeId: 'NS_S',   toNodeId: 'M1_P3', lengthMeters: 64, maxSpeedKts: 20, type: 'apron',   bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'M1_P3_N', fromNodeId: 'M1_P3', toNodeId: 'M1_N',  lengthMeters:  19, maxSpeedKts: 10, type: 'apron',   bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── E4 column (x=724) ────────────────────────────────────────────────────
    { id: 'E4_N_SEG',   fromNodeId: 'W11_E4',  toNodeId: 'E4_N',     lengthMeters:  10, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'E4_INTL',    fromNodeId: 'E4_N',    toNodeId: 'INTL_APN', lengthMeters:  19, maxSpeedKts: 15, type: 'apron',   bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'INTL_E4_S',  fromNodeId: 'INTL_APN', toNodeId: 'E4_S',   lengthMeters: 10, maxSpeedKts: 15, type: 'apron',   bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── Upper lateral connector (links W7_N–NS_N, PARL TWY W1) ───────────────
    { id: 'LAT_N_W7W4', fromNodeId: 'W7_N', toNodeId: 'W4_N', lengthMeters: 91, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_N_W4W1', fromNodeId: 'W4_N', toNodeId: 'W1_N', lengthMeters: 127, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_N_W1NS', fromNodeId: 'W1_N', toNodeId: 'NS_N', lengthMeters: 107, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_N_NSE4', fromNodeId: 'NS_N', toNodeId: 'E4_N', lengthMeters: 119, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── M1 apron taxiway spine ────────────────────────────────────────────────
    { id: 'M1_N_P2', fromNodeId: 'M1_N',   toNodeId: 'M1_P2',  lengthMeters:  17, maxSpeedKts: 10, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'M1_P2_P1',fromNodeId: 'M1_P2',  toNodeId: 'M1_P1',  lengthMeters:  21, maxSpeedKts: 10, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'M1_P1_1', fromNodeId: 'M1_P1',  toNodeId: 'M1_1',   lengthMeters:  24, maxSpeedKts: 10, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'M1_12',  fromNodeId: 'M1_1',   toNodeId: 'M1_2',   lengthMeters:  39, maxSpeedKts: 10, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'M1_23',  fromNodeId: 'M1_2',   toNodeId: 'M1_3',   lengthMeters:  45, maxSpeedKts: 10, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'M1_3S',  fromNodeId: 'M1_3',   toNodeId: 'M1_S',   lengthMeters: 64, maxSpeedKts: 10, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── Lower lateral (links W9_S–E4_S) ─────────────────────────────────────
    { id: 'LAT_S_W9W7', fromNodeId: 'W9_S', toNodeId: 'W7_S', lengthMeters: 225, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_S_W7W4', fromNodeId: 'W7_S', toNodeId: 'W4_S', lengthMeters: 91, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_S_W4W1', fromNodeId: 'W4_S', toNodeId: 'W1_S', lengthMeters: 127, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_S_W1NS', fromNodeId: 'W1_S', toNodeId: 'NS_S', lengthMeters: 107, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'LAT_S_NSE4', fromNodeId: 'NS_S', toNodeId: 'E4_S', lengthMeters: 119, maxSpeedKts: 25, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── DOM PAX Terminal stand connections (to M1 spine) ──────────────────────
    { id: 'DOM_S5_CONN', fromNodeId: 'DOM_S5', toNodeId: 'M1_N',   lengthMeters: 79, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'DOM_S4_CONN', fromNodeId: 'DOM_S4', toNodeId: 'M1_1',   lengthMeters: 70, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'DOM_S3_CONN', fromNodeId: 'DOM_S3', toNodeId: 'M1_2',   lengthMeters: 74, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'DOM_S2_CONN', fromNodeId: 'DOM_S2', toNodeId: 'M1_3',   lengthMeters: 78, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'DOM_S1_CONN', fromNodeId: 'DOM_S1', toNodeId: 'M1_S',   lengthMeters: 20, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── INTL PAX Terminal stand connections ───────────────────────────────────
    { id: 'INTL_S1_CONN', fromNodeId: 'INTL_S1', toNodeId: 'INTL_APN', lengthMeters:  26, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'INTL_S2_CONN', fromNodeId: 'INTL_S2', toNodeId: 'INTL_APN', lengthMeters:  12, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'INTL_S3_CONN', fromNodeId: 'INTL_S3', toNodeId: 'INTL_APN', lengthMeters:  10, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'INTL_S4_CONN', fromNodeId: 'INTL_S4', toNodeId: 'INTL_APN', lengthMeters:  12, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── Parking position connections ──────────────────────────────────────────
    { id: 'P1_CONN', fromNodeId: 'P1', toNodeId: 'M1_P1',  lengthMeters: 136, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'P2_CONN', fromNodeId: 'P2', toNodeId: 'M1_P2',  lengthMeters: 108, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'P3_CONN', fromNodeId: 'P3', toNodeId: 'M1_P3',  lengthMeters: 61, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'P4_CONN', fromNodeId: 'P4', toNodeId: 'M1_2',   lengthMeters: 71, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'P5_CONN', fromNodeId: 'P5', toNodeId: 'M1_3',   lengthMeters: 76, maxSpeedKts: 5, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },

    // ── HS hot-spot connectors (wire the hot-spots into the taxiway network) ──
    // West
    { id: 'HS16_R2W7', fromNodeId: 'HS16', toNodeId: 'R2_W7', lengthMeters: 19,  maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS16_H07R', fromNodeId: 'HS16', toNodeId: 'H07R', lengthMeters: 77,  maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS15_W6A',  fromNodeId: 'HS15', toNodeId: 'W6_A', lengthMeters: 90,  maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    // DOM apron (on / beside the M1 spine)
    { id: 'HS4_M1P3',  fromNodeId: 'HS4',  toNodeId: 'M1_P3', lengthMeters: 53, maxSpeedKts: 10, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS5_M1P1',  fromNodeId: 'HS5',  toNodeId: 'M1_P1', lengthMeters: 66, maxSpeedKts: 10, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS3_M1S',   fromNodeId: 'HS3',  toNodeId: 'M1_S',  lengthMeters: 21, maxSpeedKts: 10, type: 'apron', bidirectional: true, status: 'open', trafficLevel: 'low' },
    // East interchange (E8 horizontal spine + E4/E2 verticals + links to W11 / south runway)
    { id: 'E4_HS9',    fromNodeId: 'W11_EE', toNodeId: 'HS9',  lengthMeters: 41,  maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS9_HS13',  fromNodeId: 'HS9',  toNodeId: 'HS13',  lengthMeters: 41,  maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS13_R2E4', fromNodeId: 'HS13', toNodeId: 'R2_E4', lengthMeters: 52,  maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS9_HS10',  fromNodeId: 'HS9',  toNodeId: 'HS10',  lengthMeters: 84,  maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS10_HS14', fromNodeId: 'HS10', toNodeId: 'HS14',  lengthMeters: 41,  maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS10_HS8',  fromNodeId: 'HS10', toNodeId: 'HS8',   lengthMeters: 67,  maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS9_HS12',  fromNodeId: 'HS9',  toNodeId: 'HS12',  lengthMeters: 116, maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS12_HS11', fromNodeId: 'HS12', toNodeId: 'HS11',  lengthMeters: 141, maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS12_HS7',  fromNodeId: 'HS12', toNodeId: 'HS7',   lengthMeters: 89,  maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS11_HS17', fromNodeId: 'HS11', toNodeId: 'HS17',  lengthMeters: 43,  maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS17_W11EE',fromNodeId: 'HS17', toNodeId: 'W11_E_END', lengthMeters: 60, maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS6_W11EN', fromNodeId: 'HS6',  toNodeId: 'W11_E_END', lengthMeters: 52, maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
    { id: 'HS6_HS17',  fromNodeId: 'HS6',  toNodeId: 'HS17',  lengthMeters: 101, maxSpeedKts: 15, type: 'taxiway', bidirectional: true, status: 'open', trafficLevel: 'low' },
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

// Aircraft can only travel to/from the HS hot-spots and the four runway ends
// (thresholds). Hot-spots are the nodes; the taxiway edges are the allowed paths.
const RUNWAY_END_IDS = ['RWY07L_THR', 'RWY25R_THR', 'RWY07R_THR', 'RWY25L_THR'];

export const START_NODES = airportGraph.nodes.filter(n =>
  n.type === 'hotspot' || RUNWAY_END_IDS.includes(n.id)
);

export const DESTINATION_NODES = START_NODES;
