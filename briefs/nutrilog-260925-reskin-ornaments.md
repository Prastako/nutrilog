# nutrilog-260925-reskin-ornaments: Drawn ornaments with a faint chromatic split appear in the header, side columns, separators, primary button corners, meter end and active tab
priority: 2   depends on: nutrilog-260925-reskin-surfaces

## Why
The ornaments are the identity: tapered swashes, spiral hooks, dot clusters, rings and four-point stars in the style of the approved mock, rendered as a digital signal (a faint red and cyan split around the ink stroke, inside a soft glow). They are drawn shapes, not typed characters, so they look the same on every phone. No plant or flower shapes anywhere.

## Behavior (what must be true when done)
1. The ornament drawings are exactly the shapes in the reference file `ornaments.svg`: header (300 x 48 units), side column (20 x 272), separator (140 x 20), button corner (20 x 20), star (used as tab marker and meter end), medallion (200 x 200). No shape is redrawn or replaced; scale only.
2. Placement and size on screen: header ornament 262 x 34 px centred in the header slot from brief 2; side columns 18 x 256 px, vertically centred in the left and right margin columns, the right one rotated 180 degrees; separator 140 x 20 px in each separator slot; button corners 20 x 20 px in the four corners of every primary button (top-right mirrored horizontally, bottom-left mirrored vertically, bottom-right mirrored both ways); tab marker 12 x 12 px under the active tab label; meter end 14 x 14 px centred on the end of the filled part; medallion 220 x 220 px centred horizontally behind the header, its centre 40 px above the header's top edge, at 6 percent opacity, in ink colour.
3. Colour: ornaments use the look's "ornament" colour; tab marker and meter end use the accent. Every ornament (medallion excepted) has a soft glow: 2.5 px blur of glow strong plus 7 px blur of glow soft.
4. Chromatic split: every ornament (medallion excepted) is drawn three times: a copy in #FF5F5F shifted 0.55 px left and 0.1 px down, a copy in #4FD8FF shifted 0.55 px right and 0.1 px up, and the ink copy on top. The two colour copies are at 30 percent opacity with screen blending in dark themes, and at 25 percent with multiply blending in light themes, where their colours are #E0322F and #1E9EC4. Tab marker and meter end copies are at 22 percent.
5. Once every 7 seconds the split widens for a fraction of a second: the red copy moves to 1.6 px left, the cyan to 1.5 px right, then to 0.3 px the other way, then back; total 0.3 s. When the phone asks for reduced motion, the split stays fixed. No other ornament motion exists: no travelling light, no breathing, no fade.
6. Ornaments never take taps: touches pass through them to whatever is beneath. They are hidden from screen readers.
7. The Look tiles in Settings show a 60 x 16 px miniature (star, two ring-dots, two curls, from the reference file) in each look's own accent colour with its glow, above the three colour dots.
8. Performance: the whole ornament set on a screen adds no more than 12 drawn elements outside the definitions block, and scrolling the Log with 40 entries stays smooth on a mid-range Android phone (no dropped frames in the Chrome performance panel over a 3 s scroll). If the glow or split costs frames, reduce the blur radii, never the shapes.

## Acceptance rows (the supervisor turns these into hidden tests)
| situation | expected |
|---|---|
| Today, any look, dark | header shows the 262 px ornament centred; medallion visible at 6 percent behind it |
| Today, light theme | colour copies use #E0322F and #1E9EC4 with multiply blending |
| Primary button "New ideas from Claude" | four corner hooks, mirrored as stated, label unobstructed |
| Log with 40 entries, scroll 3 s | no dropped frames; ornament count outside definitions at most 12 |
| Screen reader on Today | no ornament is announced |
| Tap exactly on the left side column beside a meal row | the tap reaches the row (the row opens), not the ornament |
| Reduced motion on | split offset constant over 30 s |
| Reduced motion off, 30 s | the split widens 4 times, each within 0.3 s |
| Any screen, search for leaf, petal, flower, vine names in ornament ids | none present |
| English end-to-end test and accessibility check, 3 looks x light and dark | pass, no violations |

## Not in scope
- Colours, fonts, surfaces, slots (briefs 1 and 2).
- New ornament placements beyond the seven listed; cards stay clean.
- Any animation other than the 7 second split widening.

## Data and texts
- Data format changes: none.
- User-facing texts: none.

## Known constraints
- Reference files next to this brief in `work\briefs\nutrilog-260925-reskin-ref\`: `ornaments.svg` (the definitions block with every shape and ids: spark, spark2, dot, ring, ringdot, tail, hook, curl, vtail, stail, hdr-core, side-core, rule-core, corner-core, medal) and `nl4.css` (the mock stylesheet with the split, glow and placement rules under the class names orn, ca, orn-hdr, orn-side, orn-rule, orn-corner, orn-tab, meter-end, wm). Copy shapes and values from them.
- Files: supervisor decides; expected to be the shell markup (definitions block and slots), one stylesheet, and the tab bar and meter code that place the marker and the end star.
- The worker has a small context: the definitions block should be handed to it as an exact paste, not described.

## Open questions
- none
