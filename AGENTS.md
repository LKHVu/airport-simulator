# AI Agent Instructions for airport-simulator

## Project overview

This is a small single-page React + TypeScript + Vite application that simulates airport surface movement. It is an educational demo with a simplified airport graph, taxiway/runway routing, and a visual SVG map.

The simulator is not a production aviation system. Keep reasoning and feature work within the educational scope.

## Key files and directories

- `src/App.tsx`
  - entry-point for app state, simulation loop, and UI layout
- `src/simulation/`
  - core domain logic for routing, speed/traffic/weather effects, and simulation ticks
- `src/types.ts`
  - shared model types for nodes, edges, aircraft, config, and state
- `src/data/airportGraph.ts`
  - airport graph definition, node/edge metadata, and graph helpers
- `src/components/`
  - UI components for the map, controls, status panel, scenario panel, and guide modal
- `src/main.tsx`
  - app bootstrap for React + Vite

## Build and validation

Use the repository scripts:

- `npm install`
- `npm run dev` to run locally
- `npm run build` to build for production
- `npm run lint` to validate code style

There are no automated test scripts in this repo at present.

## Conventions and guidance

- Use TypeScript and React function components.
- The app uses ESM modules (`type: module` in `package.json`).
- Styles are primarily Tailwind CSS utility classes.
- Keep UI text and comments consistent with the existing Vietnamese educational tone where appropriate.
- Domain logic belongs in `src/simulation`; UI belongs in `src/components`.
- `airportGraph` is the single source of truth for nodes, edges, and route geometry.
- Routing uses a graph search over edges and handles blocked edges with reroute logic.

## What agents should do first

When making code changes:

1. Identify whether the change is presentation/UI-only or domain/simulation logic.
2. Update `src/types.ts` for any new domain types or config values.
3. Keep the map renderer in `src/components/AirportMap.tsx` and the simulator logic in `src/simulation/` separate.
4. Preserve the current structure of `SimulationState` and `SimulationConfig` unless a feature clearly requires schema changes.

## Notes for AI coding agents

- No backend exists; all state and logic run in the browser.
- The simulation step is driven by `requestAnimationFrame` inside `App.tsx`.
- `SimulationState.lightStates` maps edge IDs to `green`, `red`, or `off` and controls the map visuals.
- `airportGraph.edges` may include bidirectional edges and closed/restricted edges.

## Future customization suggestions

- Add a custom skill for generating route-edge legends or incident scenarios.
- Add a hook for linting/fixing TypeScript and Tailwind class usage if the repo grows.
