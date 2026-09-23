# Azerbaijan circuit animation

The next-race card uses the supplied `public/azerbaijan-circuit.png` outline,
cleaned into `src/assets/circuits/azerbaijan-track-white.png` (1448 × 1086,
transparent background). The labeled sector map in `src/assets/circuits/azerbaijan-circuit.png`
is preserved.

`AZERBAIJAN_CENTERLINE_PATH` in `src/data/circuits.js` traces the cleaned PNG
with one closed cubic Bézier path. `Home.jsx` imports the PNG and selects
`circuits.azerbaijan` for race code `AZ`. The existing `AnimatedCircuit` uses
`getTotalLength()` and `getPointAtLength()` for its looping red marker.
The visible track remains the PNG; the SVG guide is transparent.

`NextRaceCircuitCard` derives its image-overlay aspect ratio from the viewBox,
so the PNG and marker use the same coordinate space at any card width.
The Azerbaijan viewBox is `0 0 1448 1086`; the lap duration is 4300 ms.
The card removes 150 source pixels of transparent space above the track and 100
below it using width-relative negative margins. The PNG and SVG keep their full
canvas and original scale; only the surrounding panel becomes shorter.

## Verification

- Inspected a red debug overlay against the PNG.
- Sampled 3,000 points along the cubic path: all landed on opaque white track pixels.
- Production build passed.
- Frontend test suite passed (2 tests).
- Page tests use SVG geometry stubs because jsdom does not implement path-length APIs;
  those stubs do not serve as evidence of animation or path accuracy.
- Live playback and desktop/mobile browser checks could not be completed because
  the in-app browser had no available session.
- Debug paths are disabled in the shipped UI.
- Followed `canadian-gp-prompt.txt`, `chicane-circuit-workflow.txt`, and
  `circuit-integration-playbook.txt`. The conditional Monaco fix was not needed.

## Asset cleanup

Used the built-in image generation tool in edit mode, with the supplied public PNG
as the edit target. Saved the result in the asset path above without replacing
either original image. Final prompt:

> Use case: background-extraction. Edit target: the supplied white circuit outline PNG. Create a clean transparent PNG for a web circuit animation. Remove ONLY scattered stray white pixels, mottled white noise outside the continuous circuit line, and any background. Keep the single continuous white track outline, its exact silhouette, orientation, bends and proportions unchanged. Smooth anti-aliased edges, consistent original line weight, pure white, no glow. Background must be genuinely transparent including inside the loop. Do not redesign, rotate, add corners, simplify the silhouette, add labels or invent another circuit. Preserve source framing and aspect ratio as closely as possible. This is precise cleanup of the existing bitmap, not a new track design.
