# nutrilog-260928-btn-corners: Every secondary button carries its four corner ornaments around its own label; no ornaments pile up at the page corners
priority: 1   depends on: none

## Pipeline
- Batch `defects-260928`. One worker task (CSS only). No push, no rebuild until the batch ends.

## Why
Run 2 defect D1 and D2: the corner ornaments of quiet and ghost buttons are positioned against the page (or the sheet footer) instead of the button, so on Settings about twenty buttons stack their hooks into two glowing blobs at the top corners, and the buttons themselves are bare grey text with no affordance. Cause noted in the report: only primary buttons are positioned relatively (app.css rule at line 251); quiet and ghost are not.

## Behavior (what must be true when done)
1. Every button with class btn, on every screen and in every sheet, in every look and theme, at 360, 390 and 1280 px: its four corner ornaments lie inside the button's own bounding box, at the offsets already defined (top 7 px, bottom 7 px, left 8 px, right 8 px), one in each corner.
2. Quiet and ghost buttons keep the open-edge style (no fill, no border, ink2 label, ornaments at 70 percent) and get enough horizontal padding that the label never overlaps an ornament: at least 36 px on each side, as primary buttons have today.
3. Danger buttons still show no corner ornaments. Primary buttons unchanged.
4. No corner ornament anywhere on the page is positioned relative to main, a card, a sheet or a sheet footer.
5. Quick mode: no corner ornaments (as today).
6. Nothing else in the CSS changes (colours, sizes, glow, tab bar).

## Acceptance rows (the supervisor turns these into hidden tests; Playwright, bounding boxes)
| situation | expected |
|---|---|
| Settings, phone 390 px, Ash light | every .o-corner's box is inside its parent .btn's box; nothing with class o-corner has a top within 100 px of the header |
| Recipes, Suggestions tab | the corners of "New ideas" and "Suggest meal prep" surround those labels |
| Edit entry sheet | corners of "Log again today" sit at that button's corners, not at the footer's corners |
| Log screen | "Copy previous day" has four corners at its own box |
| Review | "Ask Claude" button corners at its own box |
| all 8 screens and the 12 sheets, 3 looks x 2 themes, 360 and 1280 px | rule 1 holds for every .btn; count of .o-corner equals 4 times the count of non-danger .btn |
| a quiet button with a long label at 360 px | label and ornaments do not overlap (label box within the button box minus 30 px on each side) |
| Quick mode | zero .o-corner rendered |
| style_diff.py against the previous build | the only changed computed properties are position, padding-left and padding-right on quiet and ghost buttons and the positions of their corners |

## Not in scope
- The selection-state system, motion, glow and fonts (design chat in progress).
- Which buttons are primary.

## Data and texts
- Data format changes: none.
- User-facing texts: none.

## Known constraints
- Files: src/app.css (the .btn rules around lines 251 to 256 and the open-edge button block). Nothing in JS.

## Open questions
- none
