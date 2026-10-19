# United States circuit animation

The next-race card uses the existing transparent white outline at
`src/assets/circuits/united-states-track-white.png`, following the Singapore
and Azerbaijan PNG-overlay setup.

`UNITED_STATES_CENTERLINE_PATH` in `src/data/circuits.js` traces the supplied
PNG with one closed cubic Bezier path in its native `0 0 1584 993` coordinate
space. The trace was refined using alpha-weighted white-pixel cross sections
and fitted cubic curves. It starts on the main straight, moving toward turn 1.

`Home.jsx` selects `circuits.unitedStates` and the white PNG using the calendar
entry's `circuitId: 'united-states'`. Miami and Las Vegas also use country code
`US`, so the country code alone cannot identify the Austin circuit. The calendar
entry also supplies Circuit of the Americas as the venue and Austin as the city.

The PNG supplies the visible track; the SVG guide remains transparent. The
existing `AnimatedCircuit` supplies the red marker, glow, and 4300 ms loop using
`getTotalLength()` and `getPointAtLength()`. `NextRaceCircuitCard` derives the
overlay aspect ratio from the viewBox so the image and marker scale together.
No vertical trimming is needed.

## Verification

- Inspected a red debug overlay against the supplied PNG.
- Sampled 3,800 points along the cubic path; all landed on opaque white track
  pixels (alpha at least 128 and red channel at least 200).
- Production build passed and included the United States track asset.
- Frontend tests passed: 60 tests across 9 files with `npm test -- --maxWorkers=1`.
  The initial parallel run timed out in the existing home prediction-animation
  test; the single-worker run passed without changing that test.
- Live playback and desktop/mobile browser checks could not be completed because
  the browser tool exposed no sessions. Pixel checks verify path alignment;
  jsdom SVG geometry stubs do not verify live animation.
- Debug paths remain disabled in the shipped UI.
- Followed `singapore-circuit-integration.md`,
  `azerbaijan-circuit-integration.md`, `chicane-circuit-workflow.txt`, and
  `circuit-integration-playbook.txt`.
