// SVG-based airport map renderer.
// Draws runway/taxiway edges, nodes, green guidance lights, and the aircraft.

import { airportGraph, SVG_WIDTH, SVG_HEIGHT } from '../data/airportGraph';
import { routeToEdges } from '../simulation/pathfinding';
import type { SimulationState } from '../types';

interface Props {
  state: SimulationState;
  onNodeClick?: (nodeId: string) => void;
}

// Visual style lookup
const EDGE_STYLES: Record<string, { stroke: string; width: number }> = {
  runway:  { stroke: '#94a3b8', width: 20 },
  taxiway: { stroke: '#475569', width: 8 },
  apron:   { stroke: '#334155', width: 6 },
  holding: { stroke: '#7c3aed', width: 6 },
};

const NODE_COLORS: Record<string, string> = {
  gate:          '#3b82f6',
  stand:         '#22c55e',
  taxiway:       '#64748b',
  intersection:  '#94a3b8',
  holding_point: '#f59e0b',
  runway_entry:  '#ef4444',
  runway_exit:   '#f97316',
  apron:         '#0ea5e9',
};

export default function AirportMap({ state, onNodeClick }: Props) {
  const { aircraft, lightStates } = state;

  // Get route edge IDs for highlighting
  const routeEdgeIds = aircraft
    ? (routeToEdges(aircraft.assignedRoute, airportGraph.edges) ?? [])
    : [];

  // Compute aircraft SVG position
  const aircraftPos = getAircraftPosition(state);

  return (
    <div className="relative w-full h-full bg-gray-950 rounded-xl overflow-hidden border border-gray-700">
      {/* Night overlay */}
      {state.config.timeOfDay === 'night' && (
        <div className="absolute inset-0 bg-indigo-950/40 pointer-events-none z-10" />
      )}
      {/* Fog overlay */}
      {(state.config.weather === 'fog' || state.config.weather === 'thunderstorm') && (
        <div className="absolute inset-0 bg-gray-400/20 backdrop-blur-sm pointer-events-none z-10" />
      )}

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-full"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Airport surface background */}
        <rect x={0} y={0} width={SVG_WIDTH} height={SVG_HEIGHT} fill="#0f172a" />

        {/* Grass areas */}
        <rect x={0} y={0} width={SVG_WIDTH} height={100} fill="#14532d" opacity={0.3} />
        <rect x={0} y={600} width={SVG_WIDTH} height={100} fill="#14532d" opacity={0.3} />

        {/* Runway stripes (decorative centerlines) */}
        <RunwayCenterline x1={80} y1={130} x2={1120} y2={130} />
        <RunwayCenterline x1={80} y1={560} x2={1120} y2={560} />

        {/* Apron box */}
        <rect
          x={310} y={265} width={330} height={165}
          fill="#1e293b" stroke="#334155" strokeWidth={1} strokeDasharray="4 4"
          opacity={0.7}
        />
        <text x={316} y={258} fill="#64748b" fontSize={11}>Terminal Apron</text>

        {/* Edges */}
        {airportGraph.edges.map(edge => {
          const fromNode = airportGraph.nodes.find(n => n.id === edge.fromNodeId);
          const toNode   = airportGraph.nodes.find(n => n.id === edge.toNodeId);
          if (!fromNode || !toNode) return null;

          const lightState = lightStates[edge.id] ?? 'off';
          const isOnRoute  = routeEdgeIds.includes(edge.id);
          const style      = EDGE_STYLES[edge.type] ?? EDGE_STYLES.taxiway;

          let stroke = style.stroke;
          if (lightState === 'green') stroke = '#22c55e';
          else if (lightState === 'red') stroke = '#ef4444';
          else if (isOnRoute) stroke = '#a3e635';

          return (
            <g key={edge.id}>
              <line
                x1={fromNode.x} y1={fromNode.y}
                x2={toNode.x}   y2={toNode.y}
                stroke={stroke}
                strokeWidth={style.width}
                strokeLinecap="round"
                opacity={edge.status === 'closed' ? 0.3 : 1}
              />
              {/* Green guidance dots along lit edges */}
              {lightState === 'green' && (
                <GuidanceLights
                  x1={fromNode.x} y1={fromNode.y}
                  x2={toNode.x}   y2={toNode.y}
                />
              )}
              {/* Red stop bar on blocked edges */}
              {lightState === 'red' && (
                <StopBar
                  x1={fromNode.x} y1={fromNode.y}
                  x2={toNode.x}   y2={toNode.y}
                />
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {airportGraph.nodes.map(node => {
          const color   = NODE_COLORS[node.type] ?? '#94a3b8';
          const isStart = state.config.startNodeId === node.id;
          const isDest  = state.config.destinationNodeId === node.id;
          const showDot = node.type !== 'runway_entry'; // runway entries shown as labels only

          return (
            <g
              key={node.id}
              onClick={() => onNodeClick?.(node.id)}
              style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
            >
              {showDot && (
                <>
                  <circle
                    cx={node.x} cy={node.y}
                    r={isStart || isDest ? 9 : node.type === 'stand' ? 6 : 5}
                    fill={isStart ? '#f59e0b' : isDest ? '#22c55e' : color}
                    stroke={isStart || isDest ? 'white' : 'transparent'}
                    strokeWidth={2}
                  />
                  {node.label && (
                    <text
                      x={node.x + 8} y={node.y - 6}
                      fill="#e2e8f0" fontSize={10}
                      fontWeight="bold"
                    >
                      {node.label}
                    </text>
                  )}
                </>
              )}
              {node.type === 'runway_entry' && node.label && (
                <text
                  x={node.x} y={node.y + (node.y < 300 ? -14 : 20)}
                  fill="#f87171" fontSize={13} fontWeight="bold"
                  textAnchor="middle"
                >
                  {node.label}
                </text>
              )}
              {node.type === 'holding_point' && (
                <>
                  <line
                    x1={node.x - 10} y1={node.y}
                    x2={node.x + 10} y2={node.y}
                    stroke="#f59e0b" strokeWidth={3} strokeDasharray="4 2"
                  />
                  <text
                    x={node.x + 12} y={node.y + 4}
                    fill="#f59e0b" fontSize={9}
                  >
                    {node.label}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Aircraft */}
        {aircraft && aircraftPos && (
          <AircraftIcon x={aircraftPos.x} y={aircraftPos.y} heading={aircraftPos.heading} />
        )}

        {/* Legend */}
        <MapLegend />

        {/* Runway labels */}
        <text x={600} y={118} fill="#cbd5e1" fontSize={11} textAnchor="middle" opacity={0.7}>
          RWY 07L / 25R
        </text>
        <text x={600} y={580} fill="#cbd5e1" fontSize={11} textAnchor="middle" opacity={0.7}>
          RWY 07R / 25L
        </text>
      </svg>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RunwayCenterline({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="white" strokeWidth={1.5} strokeDasharray="20 10" opacity={0.4}
    />
  );
}

function GuidanceLights({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dots = [];
  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    dots.push(
      <circle
        key={i}
        cx={x1 + (x2 - x1) * t}
        cy={y1 + (y2 - y1) * t}
        r={3}
        fill="#22c55e"
        opacity={0.9}
      />
    );
  }
  return <>{dots}</>;
}

function StopBar({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular direction for stop bar
  const px = (-dy / len) * 12;
  const py = (dx / len) * 12;

  return (
    <line
      x1={mx - px} y1={my - py}
      x2={mx + px} y2={my + py}
      stroke="#ef4444" strokeWidth={4} strokeLinecap="round"
    />
  );
}

function AircraftIcon({ x, y, heading }: { x: number; y: number; heading: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${heading})`}>
      {/* Glow */}
      <circle cx={0} cy={0} r={14} fill="#fbbf24" opacity={0.2} />
      {/* Aircraft body (triangle pointing up = 0°) */}
      <polygon
        points="0,-12 7,8 0,4 -7,8"
        fill="#fbbf24"
        stroke="#92400e"
        strokeWidth={1.5}
      />
      {/* Wings */}
      <line x1={-10} y1={1} x2={10} y2={1} stroke="#fbbf24" strokeWidth={2.5} />
    </g>
  );
}

function MapLegend() {
  const items = [
    { color: '#22c55e', label: 'Green guidance lights' },
    { color: '#ef4444', label: 'Stop bar / blocked' },
    { color: '#f59e0b', label: 'Start / Holding point' },
    { color: '#fbbf24', label: 'Aircraft' },
  ];
  return (
    <g transform="translate(20, 620)">
      {items.map((item, i) => (
        <g key={item.label} transform={`translate(${i * 230}, 0)`}>
          <rect x={0} y={-8} width={12} height={12} fill={item.color} rx={2} />
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
    // At destination node
    const destNode = airportGraph.nodes.find(n => n.id === aircraft.targetNodeId);
    return destNode ? { x: destNode.x, y: destNode.y, heading: 0 } : null;
  }

  const edgeId = routeEdgeIds[aircraft.routeEdgeIndex];
  const edge = edges.find(e => e.id === edgeId);
  if (!edge) return null;

  const fromNode = airportGraph.nodes.find(n => n.id === edge.fromNodeId);
  const toNode   = airportGraph.nodes.find(n => n.id === edge.toNodeId);
  if (!fromNode || !toNode) return null;

  // Determine travel direction (may be reversed for bidirectional edges)
  const prevNodeId = aircraft.assignedRoute[aircraft.routeEdgeIndex];
  const isReversed = edge.bidirectional && edge.fromNodeId !== prevNodeId;

  const startNode = isReversed ? toNode   : fromNode;
  const endNode   = isReversed ? fromNode : toNode;

  const t = aircraft.progressOnEdge;
  const x = startNode.x + (endNode.x - startNode.x) * t;
  const y = startNode.y + (endNode.y - startNode.y) * t;

  const dx = endNode.x - startNode.x;
  const dy = endNode.y - startNode.y;
  // SVG rotation: 0° = up, atan2 gives angle from positive-x axis
  const heading = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

  return { x, y, heading };
}
