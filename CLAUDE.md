# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server with hot reload
npm run build     # type-check (tsc -b) then bundle for production
npm run lint      # run ESLint across all source files
npm run preview   # serve the production build locally
```

There are no automated tests. Validate changes with `npm run lint` and `npm run build`.

## Architecture

This is a browser-only React + TypeScript + Vite single-page app. All logic runs client-side — no backend, no API calls.

### Data flow

```
User input (ControlPanel)
  → handleConfigChange() in App.tsx
  → initSimulation() → fresh SimulationState
  → requestAnimationFrame loop (TIME_SCALE = 8×)
  → simulationTick(state, dt) each frame
  → updated aircraft position, lightStates, warnings
  → re-render: AirportMap (SVG), StatusPanel
```

### Key modules

**`src/types.ts`** — Single source of truth for all domain types: `Aircraft`, `SimulationState`, `SimulationConfig`, `AirportNode`, `AirportEdge`, enums for node type, edge type, aircraft status, weather, incidents, etc. Update this first when adding new domain concepts.

**`src/data/airportGraph.ts`** — Static airport network (based on Tan Son Nhat International, simplified). Defines ~42 nodes and ~70 edges with lengths, max speeds, and bidirectional flags. `airportGraph` is the single source of truth for route geometry.

**`src/simulation/pathfinding.ts`** — Dijkstra's algorithm over the edge graph. `findPath()` returns an ordered node list respecting blocked edges; `routeToEdges()` converts this to edge IDs; `estimateTravelTimeSeconds()` computes ETA.

**`src/simulation/simulator.ts`** — Frame-by-frame tick logic. `simulationTick(state, dt)` advances aircraft position, applies weather/traffic speed penalties, handles edge blocking and auto-reroute, and computes `lightStates` (green on next 4 edges in route, red on blocked edges, off otherwise).

**`src/components/AirportMap.tsx`** — SVG map renderer. Draws edges (color-coded by type), nodes, light indicators (green guidance dots, red stop bars), aircraft icon with heading, and weather/time-of-day overlays.

**`src/App.tsx`** — Central state with `useState`/`useRef`/`useEffect`. Owns the `requestAnimationFrame` loop. Three-panel layout: map (left, flex-1), sidebar with ControlPanel + StatusPanel + ScenarioPanel (right, w-80), header.

### Separation rule

Domain logic belongs in `src/simulation/`; rendering belongs in `src/components/`. Keep `AirportMap.tsx` and simulator logic strictly separated. `SimulationState.lightStates` is the bridge — the simulator writes it, the map reads it.

### Speed penalties applied in simulator

| Condition | Speed multiplier |
|-----------|-----------------|
| Fog | 45% |
| Thunderstorm | 35% |
| Rain | 70% |
| High traffic | 55% |
| Medium traffic | 75% |

## Conventions

- TypeScript function components throughout; ESM modules (`type: module`).
- Tailwind CSS utility classes for all styling.
- UI text and comments may use Vietnamese (existing educational tone — keep consistent).
- Deployed to Vercel (see `vercel.json`).
