// SVG airport map — aeronautical chart style matching TSN reference.

import { airportGraph, SVG_WIDTH, SVG_HEIGHT } from '../data/airportGraph';
import { routeToEdges } from '../simulation/pathfinding';
import type { SimulationState } from '../types';

interface Props {
  state: SimulationState;
  onNodeClick?: (nodeId: string) => void;
}

const STAND_HEADINGS: Record<string, number> = {
  DOM_S1: 153, DOM_S2: 153, DOM_S3: 153, DOM_S4: 153, DOM_S5: 153,
  INTL_S1: 90, INTL_S2: 90, INTL_S3: 90, INTL_S4: 90,
};

// ── Palette — aeronautical chart style ───────────────────────────────────────
const ASPHALT   = '#1e1e1e';   // runway / taxiway surface
const BG_OUTER  = '#ffffff';   // white background (paper chart)
const BG_INFIELD = '#cdd9b0';  // grass infield between the two runways
const BG_APRON_DOM  = '#f5d0ba'; // DOM PAX apron fill (light salmon/pink)
const BG_VAECO  = '#f0ddd0';   // VAECO apron (far east)

const EDGE_STYLES: Record<string, { stroke: string; width: number }> = {
  runway:  { stroke: ASPHALT, width: 26 },
  taxiway: { stroke: ASPHALT, width: 9  },
  apron:   { stroke: ASPHALT, width: 7  },
  holding: { stroke: ASPHALT, width: 7  },
};

const NODE_COLORS: Record<string, string> = {
  gate:          '#c0a870',
  stand:         '#7a6e58',
  taxiway:       '#888',
  intersection:  '#888',
  holding_point: '#e8a800',
  runway_entry:  '#cc2222',
  runway_exit:   '#e06010',
  apron:         '#999',
};

// DOM PAX apron — angled north boundary follows M1 taxiway diagonal,
// right boundary reaches the DOM terminal building at x=880
// DOM apron — proportional from reference (1:1 scale). Right boundary x≈779 (ref x=820)
const DOM_APRON_POLY = '175,329 779,320 779,860 175,860';

// INTL area is white (background) — no fill polygon needed
// VAECO / east apron (far right, beyond INTL terminal)
const VAECO_APRON_POLY = '1122,395 1192,395 1192,700 1122,700';

export default function AirportMap({ state, onNodeClick }: Props) {
  const { aircraft, lightStates } = state;

  const routeEdgeIds = aircraft
    ? (routeToEdges(aircraft.assignedRoute, airportGraph.edges) ?? [])
    : [];

  const aircraftPos = getAircraftPosition(state);

  const occupiedStands = new Set([
    state.config.startNodeId,
    state.config.destinationNodeId,
  ]);

  const isNight = state.config.timeOfDay === 'night';
  const isFoggy = state.config.weather === 'fog' || state.config.weather === 'thunderstorm';

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-[#bbb]"
      style={{ background: BG_OUTER }}>
      {isNight && (
        <div className="absolute inset-0 bg-indigo-950/50 pointer-events-none z-10" />
      )}
      {isFoggy && (
        <div className="absolute inset-0 bg-gray-400/25 backdrop-blur-sm pointer-events-none z-10" />
      )}

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-full"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        <defs>
          <filter id="glow-green" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-aircraft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-red" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <style>{`
          @keyframes guidance-pulse {
            0%, 100% { opacity: 0.95; }
            50%       { opacity: 0.25; }
          }
          .guidance-dot { animation: guidance-pulse 1.4s ease-in-out infinite; }
          @keyframes rwy-flash {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.3; }
          }
          .rwy-edge-light { animation: rwy-flash 1.2s ease-in-out infinite; }
        `}</style>

        {/* ── Layer 1: base terrain ──────────────────────────────────────── */}
        <rect x={0} y={0} width={SVG_WIDTH} height={SVG_HEIGHT} fill={BG_OUTER} />

        {/* Grass infield between the two runways — spans the full staggered width */}
        <rect x={22} y={128} width={1153} height={99} fill={BG_INFIELD} />

        {/* INTL taxiway connector zone — same sage-green, RIGHT of DOM apron boundary only */}
        <rect x={779} y={253} width={411} height={145} fill={BG_INFIELD} opacity={0.7} />

        {/* DOM PAX apron area */}
        <polygon points={DOM_APRON_POLY} fill={BG_APRON_DOM} stroke="#c8b898" strokeWidth={1} />

        {/* INTL area is white background — no fill */}

        {/* VAECO apron far east */}
        <polygon points={VAECO_APRON_POLY} fill={BG_VAECO} stroke="#c8b898" strokeWidth={0.5} />

        {/* ── Layer 2: apron stand lines + buildings (behind taxiways) ─── */}
        <ApronStandLines />
        <HangarBuilding x={414} y={430} width={62} height={35} />
        <DomTerminalBuilding />
        <IntlTerminalBuilding />
        {/* Large dark building — starts right below INTL L-extension (y=477+52=529 end of L) */}
        <rect x={919} y={477} width={154} height={383} fill="#111" rx={1} />
        <ControlTower x={907} y={407} />

        {/* ── Layer 3: runway surfaces ───────────────────────────────────── */}
        {/*
          Real TSN layout — runways are staggered (different lengths, offset):
            07L/25R (north): extends further WEST  — x: 22 → 1135
            07R/25L (south): extends further EAST  — x: 62 → 1175
          The south runway also has a DTHR (Displaced Threshold) of 769m on the west end.
        */}

        {/* RWY 07L/25R — north (longer, extends further west) */}
        <rect x={22} y={102} width={1113} height={26} fill={ASPHALT} />

        {/* RWY 07R/25L — south (offset further east) */}
        <rect x={62} y={227} width={1113} height={26} fill={ASPHALT} />
        {/* DTHR area — displaced threshold on 07R west end (769m, hatched grey) */}
        <rect x={62} y={227} width={108} height={26} fill="#404040" />
        {Array.from({ length: 6 }, (_, i) => (
          <line key={i}
            x1={65 + i * 18} y1={227} x2={65 + i * 18 + 26} y2={253}
            stroke="#555" strokeWidth={2.5} opacity={0.7} />
        ))}
        {/* DTHR label */}
        <text x={116} y={222} fill="#888" fontSize={6} textAnchor="middle"
          fontWeight="bold">DTHR</text>

        {/* Runway centerlines */}
        <RunwayCenterline x1={60}  y1={115} x2={1120} y2={115} />
        <RunwayCenterline x1={170} y1={240} x2={1155} y2={240} />

        {/* Threshold markings */}
        <RunwayThreshold x={22}   y={115} dir={1}  />
        <RunwayThreshold x={1135} y={115} dir={-1} />
        <RunwayThreshold x={170}  y={240} dir={1}  />
        <RunwayThreshold x={1175} y={240} dir={-1} />

        {/* Fixed-distance markers */}
        <FixedDistanceMarkers x={22}   y={115} dir={1}  />
        <FixedDistanceMarkers x={1135} y={115} dir={-1} />
        <FixedDistanceMarkers x={170}  y={240} dir={1}  />
        <FixedDistanceMarkers x={1175} y={240} dir={-1} />

        {/* Runway edge lights (only animated at night) */}
        <RunwayEdgeLights y={115} xStart={26}  xEnd={1130} animate={isNight} />
        <RunwayEdgeLights y={240} xStart={170} xEnd={1170} animate={isNight} />

        {/* ── Layer 4: parked aircraft at stands ────────────────────────── */}
        {Object.entries(STAND_HEADINGS).map(([id, heading]) => {
          if (occupiedStands.has(id)) return null;
          const node = airportGraph.nodes.find(n => n.id === id);
          if (!node) return null;
          return <ParkedAircraft key={id} x={node.x} y={node.y} heading={heading} />;
        })}

        {/* ── Layer 5: taxiway / apron edges ────────────────────────────── */}
        {airportGraph.edges.map(edge => {
          if (edge.type === 'runway') return null; // runways drawn as rects above
          const fromNode = airportGraph.nodes.find(n => n.id === edge.fromNodeId);
          const toNode   = airportGraph.nodes.find(n => n.id === edge.toNodeId);
          if (!fromNode || !toNode) return null;

          const lightState = lightStates[edge.id] ?? 'off';
          const isOnRoute  = routeEdgeIds.includes(edge.id);
          const style      = EDGE_STYLES[edge.type] ?? EDGE_STYLES.taxiway;

          let stroke = style.stroke;
          if (lightState === 'green') stroke = '#1a6632';
          else if (lightState === 'red') stroke = '#881010';
          else if (isOnRoute)           stroke = '#1a4a8c';

          return (
            <g key={edge.id}>
              <line
                x1={fromNode.x} y1={fromNode.y}
                x2={toNode.x}   y2={toNode.y}
                stroke={stroke}
                strokeWidth={style.width}
                strokeLinecap="butt"
                opacity={edge.status === 'closed' ? 0.3 : 1}
              />
              {/* Yellow centerline on taxiways/apron when normal */}
              {(edge.type === 'taxiway' || edge.type === 'apron') &&
               lightState === 'off' && !isOnRoute && (
                <CenterlineDots
                  x1={fromNode.x} y1={fromNode.y}
                  x2={toNode.x}   y2={toNode.y}
                />
              )}
              {lightState === 'green' && (
                <GuidanceLights
                  x1={fromNode.x} y1={fromNode.y}
                  x2={toNode.x}   y2={toNode.y}
                />
              )}
              {lightState === 'red' && (
                <StopBar
                  x1={fromNode.x} y1={fromNode.y}
                  x2={toNode.x}   y2={toNode.y}
                />
              )}
              {/* Closed taxiway X markers */}
              {edge.status === 'closed' && (
                <ClosedMarker
                  x1={fromNode.x} y1={fromNode.y}
                  x2={toNode.x}   y2={toNode.y}
                />
              )}
            </g>
          );
        })}

        {/* ── Layer 6: visual-only E-series / NS-series taxiway lines ──── */}
        <ExtraTaxiwayLines />

        {/* ── Layer 7: taxiway name labels + all map annotations ────────── */}
        <TaxiwayLabels />
        <AreaLabels />
        <IntTkofAnnotations />
        <ClosedTaxiwayMarkers />
        <HoldingSpotMarkers />
        <ParkingPositionMarkers />

        {/* ── Layer 8: nodes ────────────────────────────────────────────── */}
        {airportGraph.nodes.map(node => {
          const color   = NODE_COLORS[node.type] ?? '#555';
          const isStart = state.config.startNodeId === node.id;
          const isDest  = state.config.destinationNodeId === node.id;

          if (node.type === 'intersection' && !isStart && !isDest) return null;

          return (
            <g
              key={node.id}
              onClick={() => onNodeClick?.(node.id)}
              style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
            >
              {node.type !== 'runway_entry' && node.type !== 'holding_point' && (
                <>
                  <circle
                    cx={node.x} cy={node.y}
                    r={isStart || isDest ? 8 : node.type === 'stand' ? 3.5 : 3}
                    fill={isStart ? '#e07800' : isDest ? '#1a8a44' : color}
                    stroke={isStart || isDest ? '#fff' : '#fff'}
                    strokeWidth={isStart || isDest ? 2 : 0.8}
                    opacity={isStart || isDest ? 1 : 0.75}
                  />
                  {(isStart || isDest) && node.label && (
                    <text x={node.x + 12} y={node.y + 4}
                      fill="#111" fontSize={11} fontWeight="bold">
                      {node.label}
                    </text>
                  )}
                  {!isStart && !isDest && (node.type === 'stand' || node.type === 'gate') && node.label && (
                    <text x={node.x + 6} y={node.y + 3}
                      fill="#555" fontSize={7.5} opacity={0.9}>
                      {node.label}
                    </text>
                  )}
                </>
              )}

              {node.type === 'runway_entry' && node.label && (
                <g>
                  {/* Runway designator box */}
                  <rect
                    x={node.x - 14} y={node.y + (node.y < 180 ? -32 : 16)}
                    width={28} height={16}
                    fill="#111" rx={2}
                  />
                  <text
                    x={node.x} y={node.y + (node.y < 180 ? -20 : 28)}
                    fill="white" fontSize={10} fontWeight="bold"
                    textAnchor="middle"
                  >
                    {node.label}
                  </text>
                </g>
              )}

              {node.type === 'holding_point' && (
                <>
                  <line x1={node.x - 12} y1={node.y - 2}
                        x2={node.x + 12} y2={node.y - 2}
                        stroke="#e8a800" strokeWidth={3} strokeDasharray="5 3" />
                  <line x1={node.x - 12} y1={node.y + 4}
                        x2={node.x + 12} y2={node.y + 4}
                        stroke="#e8a800" strokeWidth={1.5} />
                  {node.label && (
                    <text x={node.x + 14} y={node.y + 4}
                          fill="#b87800" fontSize={8} fontWeight="bold">
                      {node.label}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}

        {/* ── Layer 9: active aircraft ───────────────────────────────────── */}
        {aircraft && aircraftPos && (
          <AircraftIcon x={aircraftPos.x} y={aircraftPos.y} heading={aircraftPos.heading} />
        )}

        {/* ── Layer 10: compass rose + chart border ─────────────────────── */}
        <CompassRose x={1148} y={28} />

        {/* ── Layer 11: legend ──────────────────────────────────────────── */}
        <MapLegend />
      </svg>
    </div>
  );
}

// ── Building components ───────────────────────────────────────────────────────

// Parallel stand lines inside the DOM apron (matching TSN reference hatching)
function ApronStandLines() {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  // Lines run at ~-27° (same angle as M1 taxiway), spacing 22px
  const angleRad = (-27 * Math.PI) / 180;
  const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
  for (let i = -10; i < 35; i++) {
    const off = i * 22;
    const ox = 420 - off * sin;
    const oy = 640 + off * cos;
    lines.push({
      x1: ox - 650 * cos, y1: oy - 650 * sin,
      x2: ox + 650 * cos, y2: oy + 650 * sin,
    });
  }
  return (
    <g opacity={0.5}>
      <defs>
        <clipPath id="dom-apron-clip">
          <polygon points={DOM_APRON_POLY} />
        </clipPath>
      </defs>
      <g clipPath="url(#dom-apron-clip)">
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="white" strokeWidth={2} />
        ))}
      </g>
    </g>
  );
}

function DomTerminalBuilding() {
  // Solid black — right edge of DOM apron. Proportional: center at ~(814, 543).
  const cx = 814, cy = 543;
  return (
    <g transform={`rotate(-19, ${cx}, ${cy})`}>
      <rect x={cx - 40} y={cy - 150} width={80} height={300}
        fill="#111" strokeWidth={0} />
      <text x={cx} y={cy - 68} fill="white" fontSize={8} fontWeight="bold"
        textAnchor="middle">DOM PAX</text>
      <text x={cx} y={cy - 56} fill="white" fontSize={8} fontWeight="bold"
        textAnchor="middle">TERMINAL</text>
    </g>
  );
}

function IntlTerminalBuilding() {
  // Solid black — proportional position from reference: top at ~y=391, right side ~x=1073
  return (
    <g>
      <rect x={919} y={391} width={154} height={86} fill="#111" rx={1} />
      {/* Lower extension (L-shape) */}
      <rect x={919} y={477} width={95} height={52} fill="#111" rx={1} />
      <text x={996} y={428} fill="white" fontSize={8} fontWeight="bold"
        textAnchor="middle">INTL PAX</text>
      <text x={996} y={440} fill="white" fontSize={7}
        textAnchor="middle">TERMINAL</text>
    </g>
  );
}

function HangarBuilding({ x, y, width, height }: {
  x: number; y: number; width: number; height: number;
}) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#111" rx={1} />
      <text x={x + width / 2} y={y + height + 10}
        fill="#444" fontSize={7} fontWeight="bold" textAnchor="middle">HANGAR</text>
    </g>
  );
}

function ControlTower({ x, y }: { x: number; y: number }) {
  // Aeronautical chart TWR symbol: ⊕ circle with crosshair + TWR label
  return (
    <g>
      <circle cx={x} cy={y} r={7} fill="white" stroke="#333" strokeWidth={1.2} />
      <line x1={x - 7} y1={y} x2={x + 7} y2={y} stroke="#333" strokeWidth={1.2} />
      <line x1={x} y1={y - 7} x2={x} y2={y + 7} stroke="#333" strokeWidth={1.2} />
      <text x={x} y={y + 16} fill="#333" fontSize={7} textAnchor="middle" fontWeight="bold">TWR</text>
    </g>
  );
}

// ── Runway marking components ─────────────────────────────────────────────────

function RunwayCenterline({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="white" strokeWidth={1.8} strokeDasharray="20 10" opacity={0.5} />
  );
}

function RunwayThreshold({ x, y, dir }: { x: number; y: number; dir: number }) {
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i}
          x1={x + dir * (6 + i * 8)} y1={y - 11}
          x2={x + dir * (6 + i * 8)} y2={y + 11}
          stroke="white" strokeWidth={3.5} opacity={0.75} strokeLinecap="round" />
      ))}
    </>
  );
}

function FixedDistanceMarkers({ x, y, dir }: { x: number; y: number; dir: number }) {
  return (
    <>
      {[80, 160, 240].map(offset => {
        const sx = x + dir * offset;
        return (
          <g key={offset}>
            <line x1={sx} y1={y - 11} x2={sx} y2={y - 4}
              stroke="white" strokeWidth={3.5} strokeLinecap="round" opacity={0.5} />
            <line x1={sx} y1={y + 4}  x2={sx} y2={y + 11}
              stroke="white" strokeWidth={3.5} strokeLinecap="round" opacity={0.5} />
          </g>
        );
      })}
    </>
  );
}

function RunwayEdgeLights({ y, xStart = 100, xEnd = 1140, animate }: { y: number; xStart?: number; xEnd?: number; animate: boolean }) {
  const spacing = 40;
  const count = Math.floor((xEnd - xStart) / spacing);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const x = xStart + i * spacing;
        return (
          <g key={x} className={animate ? 'rwy-edge-light' : undefined}
            style={animate ? { animationDelay: `${(i * 0.04).toFixed(2)}s` } : undefined}>
            <circle cx={x} cy={y - 12} r={1.8} fill={animate ? '#ffe080' : 'white'} opacity={0.6} />
            <circle cx={x} cy={y + 12} r={1.8} fill={animate ? '#ffe080' : 'white'} opacity={0.6} />
          </g>
        );
      })}
    </>
  );
}

// ── Taxiway marking components ────────────────────────────────────────────────

function CenterlineDots({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1, dy = y2 - y1;
  const pixelLen = Math.sqrt(dx * dx + dy * dy);
  const count = Math.max(2, Math.round(pixelLen / 24));
  return (
    <>
      {Array.from({ length: count - 1 }, (_, i) => {
        const t = (i + 1) / count;
        return (
          <circle key={i}
            cx={x1 + dx * t} cy={y1 + dy * t}
            r={1.8} fill="#c8a020" opacity={0.85}
          />
        );
      })}
    </>
  );
}

function GuidanceLights({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1, dy = y2 - y1;
  const pixelLen = Math.sqrt(dx * dx + dy * dy);
  const count = Math.max(4, Math.round(pixelLen / 20));
  return (
    <>
      {Array.from({ length: count - 1 }, (_, i) => {
        const t = (i + 1) / count;
        return (
          <circle key={i}
            cx={x1 + dx * t} cy={y1 + dy * t}
            r={3.5} fill="#22c55e"
            filter="url(#glow-green)"
            className="guidance-dot"
            style={{ animationDelay: `${(i * 0.11).toFixed(2)}s` }}
          />
        );
      })}
    </>
  );
}

function StopBar({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = (-dy / len) * 12, py = (dx / len) * 12;
  return (
    <line x1={mx - px} y1={my - py} x2={mx + px} y2={my + py}
      stroke="#ef4444" strokeWidth={4.5} strokeLinecap="round"
      filter="url(#glow-red)" />
  );
}

function ClosedMarker({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = (-dy / len) * 10, py = (dx / len) * 10;
  return (
    <g opacity={0.85}>
      <line x1={mx - px - (dx / len) * 8} y1={my - py - (dy / len) * 8}
            x2={mx + px + (dx / len) * 8} y2={my + py + (dy / len) * 8}
            stroke="#ff8c00" strokeWidth={2.5} />
      <line x1={mx + px - (dx / len) * 8} y1={my - py + (dy / len) * 8}  /* This simplified cross won't look perfect but marks closed */
            x2={mx - px + (dx / len) * 8} y2={my + py - (dy / len) * 8}
            stroke="#ff8c00" strokeWidth={2.5} />
    </g>
  );
}

// ── Aircraft ──────────────────────────────────────────────────────────────────

function ParkedAircraft({ x, y, heading }: { x: number; y: number; heading: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${heading})`} opacity={0.8}>
      <ellipse cx={0} cy={0} rx={2} ry={9} fill="#dde4ec" />
      <polygon points="0,-1 11,5 7,7 0,4 -7,7 -11,5" fill="#c8d4e0" />
      <polygon points="0,7 4,10 0,9 -4,10" fill="#c8d4e0" />
    </g>
  );
}

function AircraftIcon({ x, y, heading }: { x: number; y: number; heading: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${heading})`} filter="url(#glow-aircraft)">
      <circle cx={0} cy={0} r={16} fill="#fbbf24" opacity={0.28} />
      <ellipse cx={0} cy={0} rx={3} ry={12} fill="#f1f5f9" />
      <polygon points="0,-1 13,6 7,8 0,5 -7,8 -13,6" fill="#e2e8f0" />
      <polygon points="0,9 4,12 0,11 -4,12" fill="#e2e8f0" />
    </g>
  );
}

// ── Labels ────────────────────────────────────────────────────────────────────

function TaxiwayLabels() {
  // Each entry: position + text + optional rotation
  const labels: Array<{ x: number; y: number; t: string; size?: number; rot?: number }> = [
    // W-series (vertical taxiways / infield parallel)
    { x: 86, y: 281, t: 'W11' },
    { x: 86, y: 316, t: 'W9'  },
    { x: 300, y: 278, t: 'W7'  },
    { x: 415, y: 278, t: 'W4'  },
    { x: 535, y: 278, t: 'W1'  },
    // E-series (east side)
    { x: 782, y: 278, t: 'E2'  },
    { x: 848, y: 278, t: 'E4'  },
    { x: 920, y: 278, t: 'E6'  },
    { x: 960, y: 278, t: 'E8'  },
    // NS connectors
    { x: 638, y: 278, t: 'NS'  },
    { x: 688, y: 152, t: 'NS1', size: 6.5 },
    // M1 apron taxiway label
    { x: 543, y: 545, t: 'M1'  },
    // PARL TWY W1 (parallel taxiway label between runways)
    { x: 490, y: 175, t: 'PARL TWY W1', size: 6 },
    // APN TWY W15 (far-left margin label)
    { x: 95, y: 360, t: 'APN TWY', size: 6 },
    { x: 95, y: 368, t: 'W15',     size: 6 },
    // APRON VAECO (far east)
    { x: 1155, y: 375, t: 'APRON', size: 6.5 },
    { x: 1155, y: 385, t: 'VAECO', size: 6.5 },
    // DTHR annotation — in the infield, just above south runway
    { x: 116, y: 214, t: 'ELEV 7.2M', size: 5.5 },
    { x: 116, y: 222, t: 'DTHR (769M)', size: 5.5 },
    // ROAD81 (road crossing east apron)
    { x: 824, y: 407, t: 'ROAD81', size: 5.5 },
  ];
  return (
    <>
      {labels.map((l, i) => (
        <text key={i} x={l.x} y={l.y}
          fill="#444" fontSize={l.size ?? 7.5} fontWeight="bold"
          textAnchor="middle" opacity={0.9}
          transform={l.rot ? `rotate(${l.rot},${l.x},${l.y})` : undefined}>
          {l.t}
        </text>
      ))}
    </>
  );
}

function AreaLabels() {
  return (
    <>
      {/* GROUND 1 label — between runways, red bordered box */}
      <rect x={427} y={169} width={128} height={26} fill="white"
        stroke="#cc0000" strokeWidth={1.5} rx={2} />
      <text x={491} y={183} fill="#cc0000" fontSize={8} fontWeight="bold"
        textAnchor="middle">TAN SON NHAT</text>
      <text x={491} y={193} fill="#cc0000" fontSize={8} fontWeight="bold"
        textAnchor="middle">GROUND 1</text>

      {/* GROUND 2 label — DOM apron center, proportional y≈570 from reference */}
      <rect x={576} y={556} width={128} height={26} fill="white"
        stroke="#cc0000" strokeWidth={1.5} rx={2} />
      <text x={640} y={570} fill="#cc0000" fontSize={8} fontWeight="bold"
        textAnchor="middle">TAN SON NHAT</text>
      <text x={640} y={580} fill="#cc0000" fontSize={8} fontWeight="bold"
        textAnchor="middle">GROUND 2</text>

      {/* Runway numbers at visual threshold ends */}
      <text x={26}   y={100} fill="#222" fontSize={9} fontWeight="bold">07</text>
      <text x={1118} y={100} fill="#222" fontSize={9} fontWeight="bold">25</text>
      <text x={174}  y={225} fill="#222" fontSize={9} fontWeight="bold">07</text>
      <text x={1158} y={225} fill="#222" fontSize={9} fontWeight="bold">25</text>

      {/* Chart note */}
      <text x={1140} y={68} fill="#888" fontSize={6.5} textAnchor="end" fontStyle="italic">
        NOT TO SCALE
      </text>
    </>
  );
}

// ── INT TKOF annotations ──────────────────────────────────────────────────────
function IntTkofAnnotations() {
  // Renders the "INT TKOF RWY xxx – TWY yyy" labels in standard chart style
  const annotations = [
    // Above north runway, far right — INT TKOF 25R via NS1
    { x: 958, y: 42,  lines: ['INT TKOF', 'RWY 25R - TWY NS1'] },
    // Between runways, left — INT TKOF 07R via W7
    { x: 320, y: 200, lines: ['INT TKOF', 'RWY 07R - TWY W7'] },
    // Between runways, far right — INT TKOF 25L via E4
    { x: 1095, y: 200, lines: ['INT TKOF', 'RWY 25L - TWY E4'] },
  ];
  return (
    <>
      {annotations.map((a, i) => (
        <g key={i}>
          {a.lines.map((line, j) => (
            <text key={j} x={a.x} y={a.y + j * 8}
              fill="#333" fontSize={6} fontWeight="bold" textAnchor="middle" opacity={0.85}>
              {line}
            </text>
          ))}
        </g>
      ))}
    </>
  );
}

// ── Closed taxiway markers (TWY W2 and W1 J/S CLOSED) ────────────────────────
function ClosedTaxiwayMarkers() {
  // TWY W2 J/S — between NS and E4, between the two runways
  const markers = [
    { x: 730, y1: 115, y2: 240, label: 'TWY W2 J/S', labelY: 145 },
    { x: 570, y1: 115, y2: 240, label: 'TWY W1 J/S', labelY: 155 },
  ];
  return (
    <>
      {markers.map((m, i) => (
        <g key={i} opacity={0.75}>
          {/* Dashed closed taxiway line */}
          <line x1={m.x} y1={m.y1} x2={m.x} y2={m.y2}
            stroke="#888" strokeWidth={6} strokeDasharray="8 5" />
          {/* X markers */}
          {[0.3, 0.7].map(t => {
            const cy = m.y1 + (m.y2 - m.y1) * t;
            return (
              <g key={t}>
                <line x1={m.x - 7} y1={cy - 7} x2={m.x + 7} y2={cy + 7}
                  stroke="#555" strokeWidth={2} strokeLinecap="round" />
                <line x1={m.x + 7} y1={cy - 7} x2={m.x - 7} y2={cy + 7}
                  stroke="#555" strokeWidth={2} strokeLinecap="round" />
              </g>
            );
          })}
          {/* CLOSED label */}
          <text x={m.x} y={m.labelY} fill="#555" fontSize={5.5} fontWeight="bold"
            textAnchor="middle">{m.label}</text>
          <text x={m.x} y={m.labelY + 7} fill="#555" fontSize={5.5} fontWeight="bold"
            textAnchor="middle">CLOSED</text>
        </g>
      ))}
    </>
  );
}

// ── Holding spot markers (HS series) ─────────────────────────────────────────
// Rendered as small labelled rectangles matching the reference chart style
function HoldingSpotMarkers() {
  const spots = [
    // Infield between runways (west side)
    { id: 'HS16', x: 210, y: 183 },
    // South of south runway — west side
    { id: 'HS15', x: 128, y: 292 },
    // South of south runway — east side (INTL apron area)
    { id: 'HS7',  x: 962, y: 290 },
    { id: 'HS17', x: 862, y: 314 },
    { id: 'HS11', x: 826, y: 322 },
    { id: 'HS12', x: 886, y: 314 },
    { id: 'HS9',  x: 1022, y: 302 },
    { id: 'HS10', x: 1072, y: 310 },
    { id: 'HS13', x: 990, y: 305 },
    { id: 'HS14', x: 1055, y: 300 },
    // DOM/INTL apron boundary area
    { id: 'HS4',  x: 623, y: 347 },
    { id: 'HS5',  x: 667, y: 392 },
    { id: 'HS8',  x: 714, y: 369 },
    { id: 'HS6',  x: 1110, y: 390 },
    // DOM apron lower area
    { id: 'HS3',  x: 519, y: 505 },
    { id: 'HS2',  x: 470, y: 606 },
    { id: 'HS1',  x: 421, y: 657 },
  ];
  return (
    <>
      {spots.map(s => (
        <g key={s.id}>
          <rect x={s.x - 9} y={s.y - 5} width={18} height={10}
            fill="white" stroke="#555" strokeWidth={0.8} opacity={0.95} />
          <text x={s.x} y={s.y + 3}
            fill="#333" fontSize={5.5} fontWeight="bold" textAnchor="middle">
            {s.id}
          </text>
        </g>
      ))}
    </>
  );
}

// ── Parking position markers (P1-P5, red outlined boxes) ─────────────────────
function ParkingPositionMarkers() {
  const positions = [
    { id: 'P1', x: 762, y: 394 },
    { id: 'P2', x: 614, y: 345 },
    { id: 'P3', x: 519, y: 505 },
    { id: 'P4', x: 552, y: 484 },
    { id: 'P5', x: 503, y: 488 },
  ];
  return (
    <>
      {positions.map(p => (
        <g key={p.id}>
          <rect x={p.x - 9} y={p.y - 5} width={18} height={10}
            fill="white" stroke="#cc2222" strokeWidth={1} opacity={0.95} />
          <text x={p.x} y={p.y + 3}
            fill="#cc2222" fontSize={6} fontWeight="bold" textAnchor="middle">
            {p.id}
          </text>
        </g>
      ))}
    </>
  );
}

// ── Visual-only extra taxiway lines (E-series, NS1 not in graph) ──────────────
function ExtraTaxiwayLines() {
  const ASPH = '#1e1e1e';
  return (
    <g opacity={0.9}>
      {/* E2 taxiway (x=782) */}
      <line x1={782} y1={162} x2={782} y2={470}
        stroke={ASPH} strokeWidth={9} strokeLinecap="butt" />
      <CenterlineDots x1={782} y1={162} x2={782} y2={470} />

      {/* E4 taxiway (x=848) */}
      <line x1={848} y1={162} x2={848} y2={470}
        stroke={ASPH} strokeWidth={9} strokeLinecap="butt" />
      <CenterlineDots x1={848} y1={162} x2={848} y2={470} />

      {/* E6 taxiway (x=920) */}
      <line x1={920} y1={163} x2={920} y2={470}
        stroke={ASPH} strokeWidth={9} strokeLinecap="butt" />
      <CenterlineDots x1={920} y1={163} x2={920} y2={470} />

      {/* E8 taxiway (x=960) */}
      <line x1={960} y1={163} x2={960} y2={470}
        stroke={ASPH} strokeWidth={9} strokeLinecap="butt" />
      <CenterlineDots x1={932} y1={163} x2={932} y2={470} />

      {/* Lateral connectors between E-series */}
      <line x1={718} y1={470} x2={782} y2={470}
        stroke={ASPH} strokeWidth={9} strokeLinecap="butt" />
      <line x1={782} y1={470} x2={848} y2={470}
        stroke={ASPH} strokeWidth={9} strokeLinecap="butt" />
      <line x1={848} y1={470} x2={920} y2={470}
        stroke={ASPH} strokeWidth={9} strokeLinecap="butt" />
      <line x1={920} y1={470} x2={960} y2={470}
        stroke={ASPH} strokeWidth={9} strokeLinecap="butt" />

      {/* Lateral connector at south-runway level (y=285) */}
      <line x1={800} y1={285} x2={960} y2={285}
        stroke={ASPH} strokeWidth={9} strokeLinecap="butt" />

      {/* NS1 connector (x=688): short link between north runway and W11 */}
      <line x1={688} y1={115} x2={688} y2={162}
        stroke={ASPH} strokeWidth={9} strokeLinecap="butt" />

      {/* E2 top connector — from NS1 area to E2 */}
      <line x1={718} y1={163} x2={782} y2={162}
        stroke={ASPH} strokeWidth={9} strokeLinecap="butt" />
      <CenterlineDots x1={718} y1={163} x2={782} y2={162} />
    </g>
  );
}

function CompassRose({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* N arrow */}
      <polygon points="0,-14 4,-4 0,-7 -4,-4" fill="#222" />
      <polygon points="0,-4 4,-14 0,-11 -4,-14" fill="white" stroke="#222" strokeWidth={0.5} />
      <text x={0} y={-16} fill="#222" fontSize={8} fontWeight="bold" textAnchor="middle">N</text>
      {/* Circle */}
      <circle cx={0} cy={0} r={16} fill="none" stroke="#555" strokeWidth={0.8} />
      {/* Cardinal ticks */}
      <line x1={0} y1={-16} x2={0} y2={-20} stroke="#555" strokeWidth={1} />
      <line x1={0} y1={16}  x2={0} y2={20}  stroke="#555" strokeWidth={1} />
      <line x1={-16} y1={0} x2={-20} y2={0} stroke="#555" strokeWidth={1} />
      <line x1={16}  y1={0} x2={20}  y2={0} stroke="#555" strokeWidth={1} />
      {/* VAR label */}
      <text x={0} y={30} fill="#666" fontSize={5.5} textAnchor="middle">VAR 1°W</text>
    </g>
  );
}

function MapLegend() {
  const items = [
    { color: '#22c55e', label: 'Đèn dẫn đường (xanh)' },
    { color: '#ef4444', label: 'Thanh dừng (đỏ)' },
    { color: '#e8a800', label: 'Điểm giữ / Đầu đường' },
    { color: '#f1f5f9', label: 'Máy bay đang lăn' },
  ];
  return (
    <g transform="translate(14, 820)">
      <rect x={-6} y={-14} width={760} height={22} fill="white" opacity={0.85} rx={3}
        stroke="#ccc" strokeWidth={0.5} />
      {items.map((item, i) => (
        <g key={item.label} transform={`translate(${i * 188}, 0)`}>
          <circle cx={6} cy={-3} r={5} fill={item.color} />
          <text x={16} y={2} fill="#333" fontSize={8.5}>{item.label}</text>
        </g>
      ))}
    </g>
  );
}

// ── Position helpers ──────────────────────────────────────────────────────────

function getAircraftPosition(state: SimulationState): { x: number; y: number; heading: number } | null {
  const { aircraft } = state;
  if (!aircraft) return null;

  const edges = airportGraph.edges;
  const routeEdgeIds = routeToEdges(aircraft.assignedRoute, edges) ?? [];

  if (aircraft.routeEdgeIndex >= routeEdgeIds.length) {
    const destNode = airportGraph.nodes.find(n => n.id === aircraft.targetNodeId);
    return destNode ? { x: destNode.x, y: destNode.y, heading: 0 } : null;
  }

  const edgeId = routeEdgeIds[aircraft.routeEdgeIndex];
  const edge = edges.find(e => e.id === edgeId);
  if (!edge) return null;

  const fromNode = airportGraph.nodes.find(n => n.id === edge.fromNodeId);
  const toNode   = airportGraph.nodes.find(n => n.id === edge.toNodeId);
  if (!fromNode || !toNode) return null;

  const prevNodeId = aircraft.assignedRoute[aircraft.routeEdgeIndex];
  const isReversed = edge.bidirectional && edge.fromNodeId !== prevNodeId;

  const startNode = isReversed ? toNode   : fromNode;
  const endNode   = isReversed ? fromNode : toNode;

  const t = aircraft.progressOnEdge;
  const x = startNode.x + (endNode.x - startNode.x) * t;
  const y = startNode.y + (endNode.y - startNode.y) * t;

  const dx = endNode.x - startNode.x;
  const dy = endNode.y - startNode.y;
  const heading = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

  return { x, y, heading };
}
