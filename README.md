# Airport Surface Movement Simulator

A small educational React + TypeScript + Vite app that simulates taxiway movement and runway routing for aircraft on a simplified airport surface.

## What it does

- Visualizes an airport graph with taxiways, runways, and parking positions
- Simulates aircraft movement along routes with traffic and speed control
- Shows route planning, edge restrictions, and basic light control
- Includes interactive controls, scenario selection, and status monitoring

## Key features

- Browser-based simulation with `requestAnimationFrame`
- Graph-driven routing using airport nodes and edges
- Traffic-aware aircraft state updates
- SVG map rendering with real-time path highlighting
- Scenario presets and user controls for starting/stopping simulation

## Project structure

- `src/App.tsx` – main app state, simulation loop, and layout
- `src/simulation/` – core simulation and pathfinding logic
- `src/components/` – UI components for map, controls, status, scenarios, and guide
- `src/data/airportGraph.ts` – airport network definition and graph helpers
- `src/types.ts` – shared model types for nodes, edges, aircraft, and simulation state

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open the app in your browser using the local URL shown by Vite.

## Build for production

```bash
npm run build
```

## Notes

- This is a client-only demo app; there is no backend.
- Simulation logic belongs in `src/simulation`, while UI rendering is handled in `src/components`.
- The app is intended as an educational demonstration, not an operational aviation tool.

## Useful files

- `src/components/AirportMap.tsx` – renders the airport map and route visuals
- `src/components/ControlPanel.tsx` – simulator controls and speed toggles
- `src/components/ScenarioPanel.tsx` – scenario selection and reset actions
- `src/components/StatusPanel.tsx` – current aircraft and traffic status
- `src/simulation/simulator.ts` – aircraft movement and state update logic
- `src/simulation/pathfinding.ts` – route search and blocked-edge handling

## License

Feel free to use and extend this simulator for learning and classroom demos.
