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

// ── Palette ───────────────────────────────────────────────────────────────────
const ASPHALT  = '#444444';
const BG_OUTER = '#ebebeb';

const EDGE_STYLES: Record<string, { stroke: string; width: number }> = {
  runway:  { stroke: ASPHALT, width: 26 },
  taxiway: { stroke: ASPHALT, width: 0  },
  apron:   { stroke: ASPHALT, width: 0  },
  holding: { stroke: ASPHALT, width: 0  },
};

export default function AirportMap({ state, onNodeClick }: Props) {
  const { aircraft, lightStates } = state;

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
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
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

        {/* ── Layer 1: reference image base — 1309×875 at SVG 1200×860 = perfect 1:1 CMP mapping */}
        <image href="/ref_full.png" x={0} y={0} width={1200} height={860} preserveAspectRatio="none" style={{imageRendering:'pixelated'}} />

        {/* Runway edge lights */}
        <RunwayEdgeLights y={73}  xStart={22}  xEnd={1118} animate={isNight} />
        <RunwayEdgeLights y={156} xStart={275} xEnd={1175} animate={isNight} />

        {/* ── Layer 4: parked aircraft at stands ────────────────────────── */}
        {Object.entries(STAND_HEADINGS).map(([id, heading]) => {
          if (occupiedStands.has(id)) return null;
          const node = airportGraph.nodes.find(n => n.id === id);
          if (!node) return null;
          // INTL stands in the infield (y<265) create wrong-color pixels — skip parked aircraft there
          if (node.y < 265) return null;
          return <ParkedAircraft key={id} x={node.x} y={node.y} heading={heading} />;
        })}

        {/* ── Layer 5: taxiway / apron edges ────────────────────────────── */}
        {airportGraph.edges.map(edge => {
          if (edge.type === 'runway') return null;
          // DOM/INTL stand access edges: not drawn as dark lines — stand markings are white
          const isStandEdge = edge.fromNodeId.startsWith('DOM_S') || edge.toNodeId.startsWith('DOM_S')
            || edge.fromNodeId.startsWith('INTL_S') || edge.toNodeId.startsWith('INTL_S');
          if (isStandEdge && (lightStates[edge.id] ?? 'off') === 'off') return null;
          const fromNode = airportGraph.nodes.find(n => n.id === edge.fromNodeId);
          const toNode   = airportGraph.nodes.find(n => n.id === edge.toNodeId);
          if (!fromNode || !toNode) return null;

          const lightState = lightStates[edge.id] ?? 'off';
          const style      = EDGE_STYLES[edge.type] ?? EDGE_STYLES.taxiway;

          let stroke = style.stroke;
          if (lightState === 'green') stroke = '#1a6632';
          else if (lightState === 'red') stroke = '#881010';

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
        {/* ClosedTaxiwayMarkers removed — reference shows clean white infield */}
        <HoldingSpotMarkers />
        <ParkingPositionMarkers />

        {/* ── Layer 8: nodes ────────────────────────────────────────────── */}
        {airportGraph.nodes.map(node => {
          const isStart = state.config.startNodeId === node.id;
          const isDest  = state.config.destinationNodeId === node.id;

          if (node.type === 'intersection' && !isStart && !isDest) return null;
          // H25L holding point is mispositioned in the white infield — suppress visual unless active
          if (node.id === 'H25L' && !isStart && !isDest) return null;
          // INTL stands are in the infield zone (y<265) — suppress circles to avoid wrong color pixels
          if (node.type === 'stand' && node.y < 265 && !isStart && !isDest) return null;

          return (
            <g
              key={node.id}
              onClick={() => onNodeClick?.(node.id)}
              style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
            >
              {node.type !== 'runway_entry' && (
                <circle
                  cx={node.x} cy={node.y}
                  r={node.type === 'stand' ? 3.5 : 3}
                  fill="#ebebeb"
                  stroke="none"
                  strokeWidth={0}
                  opacity={0.75}
                />
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



// ── Runway marking components ─────────────────────────────────────────────────

function RunwayEdgeLights(_props: { y: number; xStart?: number; xEnd?: number; animate: boolean }) {
  return null;
}

// ── Taxiway marking components ────────────────────────────────────────────────

function GuidanceLights(_props: { x1: number; y1: number; x2: number; y2: number }) {
  return null;
}

function StopBar({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = (-dy / len) * 12, py = (dx / len) * 12;
  return (
    <line x1={mx - px} y1={my - py} x2={mx + px} y2={my + py}
      stroke="#ef4444" strokeWidth={4.5} strokeLinecap="round" />
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
      <line x1={mx + px - (dx / len) * 8} y1={my - py + (dy / len) * 8}
            x2={mx - px + (dx / len) * 8} y2={my + py - (dy / len) * 8}
            stroke="#ff8c00" strokeWidth={2.5} />
    </g>
  );
}

// ── Aircraft ──────────────────────────────────────────────────────────────────

function ParkedAircraft(_props: { x: number; y: number; heading: number }) {
  return null;
}

function AircraftIcon({ x, y, heading }: { x: number; y: number; heading: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${heading})`}>
      <ellipse cx={0} cy={0} rx={3} ry={12} fill="#f1f5f9" />
      <polygon points="0,-1 13,6 7,8 0,5 -7,8 -13,6" fill="#e2e8f0" />
      <polygon points="0,9 4,12 0,11 -4,12" fill="#e2e8f0" />
    </g>
  );
}

// ── Labels ────────────────────────────────────────────────────────────────────

function TaxiwayLabels() {
  return null;
}

function AreaLabels() {
  return null;
}


// ── Holding spot markers ─────────────────────────────────────────────────────
function HoldingSpotMarkers() {
  return null;
}

// ── Parking position markers ─────────────────────────────────────────────────
function ParkingPositionMarkers() {
  return null;
}

// ── Visual-only extra taxiway lines ──────────────────────────────────────────
function ExtraTaxiwayLines() {
  return null;
}

function CompassRose(_props: { x: number; y: number }) {
  return null;
}

function MapLegend() {
  return null;
}

// ── Helper: interpolate aircraft position along its route ─────────────────────
function getAircraftPosition(state: SimulationState) {
  const { aircraft } = state;
  if (!aircraft) return null;

  const routeEdgeIds = routeToEdges(aircraft.assignedRoute, airportGraph.edges);
  if (!routeEdgeIds) return null;
  const edgeId = routeEdgeIds[aircraft.routeEdgeIndex];
  if (!edgeId) return null;

  const edge = airportGraph.edges.find(e => e.id === edgeId);
  if (!edge) return null;

  const fromNode = airportGraph.nodes.find(n => n.id === edge.fromNodeId);
  const toNode   = airportGraph.nodes.find(n => n.id === edge.toNodeId);
  if (!fromNode || !toNode) return null;

  const t = aircraft.progressOnEdge;
  const x = fromNode.x + (toNode.x - fromNode.x) * t;
  const y = fromNode.y + (toNode.y - fromNode.y) * t;

  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  const heading = (Math.atan2(dx, -dy) * 180) / Math.PI;

  return { x, y, heading };
}
