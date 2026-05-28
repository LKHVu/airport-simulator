// SVG-based airport map renderer — high-fidelity visual matching TSN reference.

import { airportGraph, SVG_WIDTH, SVG_HEIGHT } from '../data/airportGraph';
import { routeToEdges } from '../simulation/pathfinding';
import type { SimulationState } from '../types';

interface Props {
  state: SimulationState;
  onNodeClick?: (nodeId: string) => void;
}

// Static parked aircraft: stand id → parking heading (nose direction)
const STAND_HEADINGS: Record<string, number> = {
  DOM_S1: 153, DOM_S2: 153, DOM_S3: 153, DOM_S4: 153, DOM_S5: 153,
  INTL_S1: 90, INTL_S2: 90, INTL_S3: 90, INTL_S4: 90,
};

// Approximate TSN taxiway designations overlaid on the grid
const TWY_LABELS = [
  { x: 200, y: 172, t: 'W11' },
  { x: 200, y: 338, t: 'W9'  },
  { x: 295, y: 240, t: 'W7'  },
  { x: 415, y: 240, t: 'W4'  },
  { x: 545, y: 240, t: 'W1'  },
  { x: 640, y: 240, t: 'NS'  },
  { x: 825, y: 240, t: 'E4'  },
  { x: 540, y: 378, t: 'M1'  },
];

// Taxiways/runways = DARK asphalt. Infield between them = LIGHT olive-gray.
// This matches the reference: dark strips on a light open-ground background.
const ASPHALT  = '#252e3c';
const EDGE_STYLES: Record<string, { stroke: string; width: number }> = {
  runway:  { stroke: ASPHALT, width: 32 },
  taxiway: { stroke: ASPHALT, width: 16 },
  apron:   { stroke: ASPHALT, width: 12 },
  holding: { stroke: ASPHALT, width: 12 },
};

const NODE_COLORS: Record<string, string> = {
  gate:          '#c0a870',
  stand:         '#b8a068',
  taxiway:       '#a09060',
  intersection:  '#a09060',
  holding_point: '#f59e0b',
  runway_entry:  '#ef4444',
  runway_exit:   '#f97316',
  apron:         '#b8a870',
};

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

  return (
    <div className="relative w-full h-full bg-[#141820] rounded-xl overflow-hidden border border-[#2a3040]">
      {state.config.timeOfDay === 'night' && (
        <div className="absolute inset-0 bg-indigo-950/40 pointer-events-none z-10" />
      )}
      {(state.config.weather === 'fog' || state.config.weather === 'thunderstorm') && (
        <div className="absolute inset-0 bg-gray-400/20 backdrop-blur-sm pointer-events-none z-10" />
      )}

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-full"
        style={{ fontFamily: 'monospace' }}
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
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <style>{`
          @keyframes guidance-pulse {
            0%, 100% { opacity: 0.92; }
            50%       { opacity: 0.28; }
          }
          .guidance-dot { animation: guidance-pulse 1.6s ease-in-out infinite; }
        `}</style>

        {/* ── Terrain base ─────────────────────────────────────────── */}
        <rect x={0} y={0} width={SVG_WIDTH} height={SVG_HEIGHT} fill="#141820" />
        {/* Dark outer terrain north/south */}
        <rect x={0} y={0}   width={SVG_WIDTH} height={118} fill="#0e1318" />
        <rect x={0} y={572} width={SVG_WIDTH} height={128} fill="#0e1318" />
        {/* Infield — light sandy-gray open ground between the runways */}
        <rect x={0} y={118} width={SVG_WIDTH} height={454} fill="#b8b0a0" />

        {/* ── Infrastructure buildings (behind edges) ───────────────── */}
        <HangarBuilding x={88} y={248} width={98} height={165} />
        <TerminalBuilding x={415} y={480} width={320} height={50}
          rotate={-27}
          label="NHÀ GA NỘI ĐỊA" sublabel="Domestic Terminal" />
        <TerminalBuilding x={958} y={298} width={185} height={192}
          label="NHÀ GA QUỐC TẾ" sublabel="Int'l Terminal" />
        <ControlTower x={756} y={422} />

        {/* ── Runway surfaces ──────────────────────────────────────── */}
        <rect x={68} y={118} width={1078} height={28} fill={ASPHALT} />
        <rect x={68} y={548} width={1078} height={28} fill={ASPHALT} />

        {/* Runway edge lights */}
        <RunwayEdgeLights y={130} />
        <RunwayEdgeLights y={560} />

        {/* Threshold markings */}
        <RunwayThreshold x={80}   y={130} dir={1}  />
        <RunwayThreshold x={1120} y={130} dir={-1} />
        <RunwayThreshold x={80}   y={560} dir={1}  />
        <RunwayThreshold x={1120} y={560} dir={-1} />

        {/* Fixed-distance / touchdown-zone markers */}
        <FixedDistanceMarkers x={80}   y={130} dir={1}  />
        <FixedDistanceMarkers x={1120} y={130} dir={-1} />
        <FixedDistanceMarkers x={80}   y={560} dir={1}  />
        <FixedDistanceMarkers x={1120} y={560} dir={-1} />

        {/* Runway centerline dashes */}
        <RunwayCenterline x1={215} y1={130} x2={985} y2={130} />
        <RunwayCenterline x1={215} y1={560} x2={985} y2={560} />

        {/* ── Parked aircraft at stands ─────────────────────────────── */}
        {Object.entries(STAND_HEADINGS).map(([id, heading]) => {
          if (occupiedStands.has(id)) return null;
          const node = airportGraph.nodes.find(n => n.id === id);
          if (!node) return null;
          return <ParkedAircraft key={id} x={node.x} y={node.y} heading={heading} />;
        })}

        {/* ── Edges ─────────────────────────────────────────────────── */}
        {airportGraph.edges.map(edge => {
          const fromNode = airportGraph.nodes.find(n => n.id === edge.fromNodeId);
          const toNode   = airportGraph.nodes.find(n => n.id === edge.toNodeId);
          if (!fromNode || !toNode) return null;

          const lightState = lightStates[edge.id] ?? 'off';
          const isOnRoute  = routeEdgeIds.includes(edge.id);
          const style      = EDGE_STYLES[edge.type] ?? EDGE_STYLES.taxiway;

          let stroke = style.stroke;
          if (lightState === 'green') stroke = '#1a5e30';
          else if (lightState === 'red')  stroke = '#6a1414';
          else if (isOnRoute)             stroke = '#1e3a5c';

          return (
            <g key={edge.id}>
              <line
                x1={fromNode.x} y1={fromNode.y}
                x2={toNode.x}   y2={toNode.y}
                stroke={stroke}
                strokeWidth={style.width}
                strokeLinecap="butt"
                opacity={edge.status === 'closed' ? 0.35 : 1}
              />
              {/* Yellow centerline — dots on taxiways, dashes on apron */}
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
            </g>
          );
        })}

        {/* ── Taxiway name labels (TSN designations) ───────────────── */}
        {TWY_LABELS.map(({ x, y, t }) => (
          <text key={`${x}-${t}`} x={x} y={y}
            fill="#6a6050" fontSize={9} fontWeight="bold" textAnchor="middle" opacity={0.85}>
            {t}
          </text>
        ))}

        {/* ── Nodes ─────────────────────────────────────────────────── */}
        {airportGraph.nodes.map(node => {
          const color   = NODE_COLORS[node.type] ?? '#94a3b8';
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
                    r={isStart || isDest ? 9 : node.type === 'stand' ? 4 : 3}
                    fill={isStart ? '#e8920a' : isDest ? '#1aaa52' : color}
                    stroke={isStart || isDest ? '#fff' : ASPHALT}
                    strokeWidth={isStart || isDest ? 2 : 0.5}
                    opacity={isStart || isDest ? 1 : 0.55}
                  />
                  {(isStart || isDest) && node.label && (
                    <text x={node.x + 12} y={node.y + 4}
                      fill="#f1f5f9" fontSize={10} fontWeight="bold">
                      {node.label}
                    </text>
                  )}
                  {!isStart && !isDest && (node.type === 'stand' || node.type === 'gate') && node.label && (
                    <text x={node.x + 7} y={node.y + 3}
                      fill="#8899aa" fontSize={8} opacity={0.7}>
                      {node.label}
                    </text>
                  )}
                </>
              )}

              {node.type === 'runway_entry' && node.label && (
                <text
                  x={node.x} y={node.y + (node.y < 300 ? -19 : 25)}
                  fill="#fca5a5" fontSize={14} fontWeight="bold"
                  textAnchor="middle"
                >
                  {node.label}
                </text>
              )}

              {node.type === 'holding_point' && (
                <>
                  <line x1={node.x - 14} y1={node.y - 2}
                        x2={node.x + 14} y2={node.y - 2}
                        stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 3" />
                  <line x1={node.x - 14} y1={node.y + 4}
                        x2={node.x + 14} y2={node.y + 4}
                        stroke="#f59e0b" strokeWidth={1.5} />
                  <text x={node.x + 16} y={node.y + 4}
                        fill="#fbbf24" fontSize={9} fontWeight="bold">
                    {node.label}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* ── Active taxiing aircraft ───────────────────────────────── */}
        {aircraft && aircraftPos && (
          <AircraftIcon x={aircraftPos.x} y={aircraftPos.y} heading={aircraftPos.heading} />
        )}

        {/* ── Legend ────────────────────────────────────────────────── */}
        <MapLegend />
      </svg>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RunwayCenterline({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="white" strokeWidth={2} strokeDasharray="22 12" opacity={0.35} />
  );
}

function RunwayThreshold({ x, y, dir }: { x: number; y: number; dir: number }) {
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i}
          x1={x + dir * (8 + i * 9)} y1={y - 12}
          x2={x + dir * (8 + i * 9)} y2={y + 12}
          stroke="white" strokeWidth={4} opacity={0.7} strokeLinecap="round" />
      ))}
    </>
  );
}

function RunwayEdgeLights({ y }: { y: number }) {
  return (
    <>
      {Array.from({ length: 28 }, (_, i) => {
        const x = 95 + i * 38;
        return (
          <g key={x}>
            <circle cx={x} cy={y - 13} r={2} fill="white" opacity={0.5} />
            <circle cx={x} cy={y + 13} r={2} fill="white" opacity={0.5} />
          </g>
        );
      })}
    </>
  );
}

function FixedDistanceMarkers({ x, y, dir }: { x: number; y: number; dir: number }) {
  return (
    <>
      {[90, 185, 280].map(offset => {
        const sx = x + dir * offset;
        return (
          <g key={offset}>
            <line x1={sx} y1={y - 13} x2={sx} y2={y - 5}
              stroke="white" strokeWidth={4} strokeLinecap="round" opacity={0.45} />
            <line x1={sx} y1={y + 5}  x2={sx} y2={y + 13}
              stroke="white" strokeWidth={4} strokeLinecap="round" opacity={0.45} />
          </g>
        );
      })}
    </>
  );
}

function CenterlineDots({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const pixelLen = Math.sqrt(dx * dx + dy * dy);
  const count = Math.max(2, Math.round(pixelLen / 26));
  return (
    <>
      {Array.from({ length: count - 1 }, (_, i) => {
        const t = (i + 1) / count;
        return (
          <circle key={i}
            cx={x1 + dx * t} cy={y1 + dy * t}
            r={2.2} fill="#c8a020" opacity={0.75}
          />
        );
      })}
    </>
  );
}

function GuidanceLights({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const pixelLen = Math.sqrt(dx * dx + dy * dy);
  const count = Math.max(4, Math.round(pixelLen / 22));

  return (
    <>
      {Array.from({ length: count - 1 }, (_, i) => {
        const t = (i + 1) / count;
        return (
          <circle key={i}
            cx={x1 + dx * t} cy={y1 + dy * t}
            r={4} fill="#22c55e"
            filter="url(#glow-green)"
            className="guidance-dot"
            style={{ animationDelay: `${(i * 0.12).toFixed(2)}s` }}
          />
        );
      })}
    </>
  );
}

function StopBar({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = (-dy / len) * 14;
  const py = (dx  / len) * 14;
  return (
    <line x1={mx - px} y1={my - py} x2={mx + px} y2={my + py}
      stroke="#ef4444" strokeWidth={5} strokeLinecap="round" />
  );
}

function ParkedAircraft({ x, y, heading }: { x: number; y: number; heading: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${heading})`} opacity={0.75}>
      {/* Fuselage */}
      <ellipse cx={0} cy={0} rx={2.5} ry={11} fill="#dde4ec" />
      {/* Main wings */}
      <polygon points="0,-1 13,6 8,8 0,5 -8,8 -13,6" fill="#c8d4e0" />
      {/* Tailplane */}
      <polygon points="0,8 5,12 0,10 -5,12" fill="#c8d4e0" />
    </g>
  );
}

function AircraftIcon({ x, y, heading }: { x: number; y: number; heading: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${heading})`} filter="url(#glow-aircraft)">
      {/* Amber halo */}
      <circle cx={0} cy={0} r={17} fill="#fbbf24" opacity={0.22} />
      {/* White fuselage */}
      <ellipse cx={0} cy={0} rx={3.5} ry={14} fill="#f1f5f9" />
      {/* Wings */}
      <polygon points="0,-1 14,7 8,9 0,5 -8,9 -14,7" fill="#e2e8f0" />
      {/* Tail */}
      <polygon points="0,10 5,14 0,12 -5,14" fill="#e2e8f0" />
    </g>
  );
}

function TerminalBuilding({ x, y, width, height, label, sublabel, rotate = 0 }: {
  x: number; y: number; width: number; height: number;
  label: string; sublabel: string; rotate?: number;
}) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  return (
    <g transform={rotate ? `rotate(${rotate}, ${cx}, ${cy})` : undefined}>
      <rect x={x + 4} y={y + 4} width={width} height={height} fill="#000" opacity={0.25} rx={3} />
      <rect x={x} y={y} width={width} height={height}
        fill="#c4b99a" stroke="#a09278" strokeWidth={1} rx={3} opacity={0.95} />
      {/* Gate canopy strips */}
      <rect x={x + 6} y={y + 6}           width={width - 12} height={6} fill="#b0a586" opacity={0.6} />
      <rect x={x + 6} y={y + height - 12} width={width - 12} height={6} fill="#b0a586" opacity={0.6} />
      {/* Gate dots */}
      {Array.from({ length: Math.floor((width - 20) / 18) }, (_, i) => (
        <circle key={i} cx={x + 16 + i * 18} cy={cy} r={2.5} fill="#7a6e58" opacity={0.7} />
      ))}
      <text x={cx} y={cy - 6}
        fill="#2e2318" fontSize={9} fontWeight="bold" textAnchor="middle">{label}</text>
      <text x={cx} y={cy + 7}
        fill="#4a3a28" fontSize={8} textAnchor="middle">{sublabel}</text>
    </g>
  );
}

function HangarBuilding({ x, y, width, height }: {
  x: number; y: number; width: number; height: number;
}) {
  const dw = width - 16;
  return (
    <g>
      <rect x={x + 3} y={y + 3} width={width} height={height} fill="#000" opacity={0.25} rx={2} />
      <rect x={x} y={y} width={width} height={height}
        fill="#888e98" stroke="#6a7080" strokeWidth={1} rx={2} opacity={0.85} />
      <rect x={x + 8} y={y + height - 48} width={dw} height={44}
        fill="#6e7480" stroke="#5a6070" strokeWidth={0.5} />
      <line x1={x + 8 + dw / 3}     y1={y + height - 48} x2={x + 8 + dw / 3}     y2={y + height} stroke="#5a6070" strokeWidth={0.8} />
      <line x1={x + 8 + 2 * dw / 3} y1={y + height - 48} x2={x + 8 + 2 * dw / 3} y2={y + height} stroke="#5a6070" strokeWidth={0.8} />
      <text x={x + width / 2} y={y + height / 2 - 8}
        fill="#2e3038" fontSize={8} fontWeight="bold" textAnchor="middle">HANGAR</text>
    </g>
  );
}

function ControlTower({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 3} y={y - 6}   width={6}  height={14} fill="#4a5260" />
      <rect x={x - 9} y={y + 8}   width={18} height={8}  fill="#3a4252" stroke="#525e70" strokeWidth={1} rx={1} />
      <rect x={x - 10} y={y - 12} width={20} height={11} fill="#c4b99a" stroke="#a09278" strokeWidth={1.2} rx={2} />
      <rect x={x - 8}  y={y - 11} width={16} height={8}  fill="#b0a586" opacity={0.6} rx={1} />
      <text x={x} y={y + 26} fill="#6a7888" fontSize={8} textAnchor="middle">TWR</text>
    </g>
  );
}

function MapLegend() {
  const items = [
    { color: '#22c55e', label: 'Đèn dẫn đường xanh' },
    { color: '#ef4444', label: 'Thanh dừng đỏ' },
    { color: '#f59e0b', label: 'Điểm giữ / Điểm đầu' },
    { color: '#f1f5f9', label: 'Máy bay đang lăn' },
  ];
  return (
    <g transform="translate(16, 622)">
      <rect x={-6} y={-14} width={970} height={24} fill="#141820" opacity={0.95} rx={3} />
      {items.map((item, i) => (
        <g key={item.label} transform={`translate(${i * 238}, 0)`}>
          <circle cx={6} cy={-3} r={5} fill={item.color} />
          <text x={16} y={2} fill="#94a3b8" fontSize={9}>{item.label}</text>
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
