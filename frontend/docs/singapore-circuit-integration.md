# Singapore circuit animation

The next-race card uses the existing transparent white outline at
`src/assets/circuits/singapore-track-white.png`, following the Azerbaijan
image-overlay setup. The original white-track and labeled sector images are preserved.

`SINGAPORE_CENTERLINE_PATH` in `src/data/circuits.js` follows the actual PNG's
centerline with one closed cubic Bezier path. The trace was refined using
alpha-weighted white-pixel cross sections and fitted cubic curves.
Its native coordinate space and viewBox are `0 0 1672 941`.

`Home.jsx` selects `circuits.singapore` and the white PNG for race code `SG`.
The PNG supplies the visible white line; the SVG guide stays transparent.
The existing `AnimatedCircuit` supplies the same red ball, glow, and 4300 ms
loop as Azerbaijan, using `getTotalLength()` and `getPointAtLength()`.
The start point is on the right-hand straight and the path travels upward
toward the first corners.

`NextRaceCircuitCard` derives its image-overlay aspect ratio from the viewBox,
keeping the image and marker in the same coordinate space at desktop and mobile
widths. The Singapore image needs no vertical trimming. The calendar entry
now supplies Marina Bay Street Circuit as the card's venue.

## Verification

- Inspected a red debug overlay against the supplied transparent PNG.
- Sampled 3,800 points along the cubic path: all landed on opaque white track pixels.
- Production build passed, including the Singapore track asset.
- Frontend test suite passed (43 tests across 4 files).
- Debug paths remain disabled in the shipped UI.
- Live playback and desktop/mobile browser checks were unavailable because the
  in-app browser exposed no sessions. Pixel checks verify path alignment;
  jsdom's SVG geometry stubs do not verify live animation.
- Followed `azerbaijan-circuit-integration.md`, `chicane-circuit-workflow.txt`,
  and `circuit-integration-playbook.txt`.
