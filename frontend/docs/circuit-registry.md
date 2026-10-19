# Circuit registry

Start at `src/data/circuits.js`. Each registered circuit keeps its PNG import,
animation path, viewBox, duration, render mode, and optional image trimming
together. PNG files remain in `src/assets/circuits/`.

`src/data/races.js` assigns a stable `circuitId` to each race. `Home.jsx` selects
`circuits[currentRace.circuitId]` and passes its settings to the shared
`NextRaceCircuitCard` and `AnimatedCircuit` components.

## Add an animation

1. Put the track PNG in `src/assets/circuits/`.
2. Trace and verify its path using the circuit integration playbook.
3. Import the PNG and add an entry to `src/data/circuits.js`:

   ```js
   'united-states': {
     id: 'united-states',
     name: 'Circuit of the Americas',
     image: unitedStatesTrack,
     path: UNITED_STATES_CENTERLINE_PATH,
     viewBox: '0 0 1584 993',
     duration: 4300,
     renderMode: 'image-overlay',
   },
   ```

4. Set the race's `circuitId` to the registry key. No circuit-specific changes
   are needed in `Home.jsx`.

Use `image-overlay` when the PNG supplies the visible track and its viewBox
matches the image canvas. Use `svg` when the path supplies the visible track.
Canada and Miami currently use SVG rendering; the other registered circuits
use PNG overlays. Azerbaijan also uses `imageVerticalTrim`.

Every calendar race has an ID, including tracks whose animations have not yet
been registered. Those races render without a circuit animation until an entry
is added. Miami, United States, and Las Vegas have separate IDs, as do Barcelona
and the Spanish GP.

## Reuse next season

Update the season calendar and keep the same circuit IDs for unchanged tracks.
The registry contains no season dates. Recheck the trace if a layout or PNG
changes. The older per-circuit integration notes describe the original work;
this guide describes the current registry and selection system.
