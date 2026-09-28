# nutrilog-260928-btn-plain: Secondary buttons are plain text with no corner ornaments; no ornaments pile up at the page corners
priority: 1   depends on: nutrilog-260928-btn-corners (supersedes it)

Supersedes nutrilog-260928-btn-corners, which was queued to the worker at 2026-09-28 20:09 while the design session was deciding the opposite. Decision Jan 2026-09-28 20:08: keep secondary buttons as plain text ("the ornaments shouldn't clutter the UI") instead of anchoring four corners to each button. If the btn-corners task has already merged, this brief undoes it: the corners it anchored are removed again and the padding it added is reverted. If it has not run yet, drop it from the queue and run this one instead.

## Pipeline
- Batch `defects-260928`. One worker task (CSS plus one line of JS). No push, no rebuild until the batch ends.

## Why
Run 2 defect D1: the corner ornaments of quiet and ghost buttons are positioned against the page (or the sheet footer) instead of the button, so on Settings about twenty buttons stack their hooks into two glowing blobs at the top corners. Decision: secondary buttons carry no corner ornaments at all; the blobs disappear because the ornaments are no longer created. Defect D2 (secondary actions read as labels) is accepted as the intended quiet style and is closed without change.

## Behavior (what must be true when done)
1. Quiet and ghost buttons (`.btn.quiet`, `.btn.ghost`) have no corner ornaments: none are inserted into them and none are rendered for them, on every screen and in every sheet, in every look and theme, at 360, 390 and 1280 px.
2. Their look is exactly that of build 0.2.7: no fill, no border, ink2 label, body font, 44 px minimum height, the 0.2.7 padding (11 px 18 px). Nothing about them changes except the absence of the ornaments; the wider padding and `position: relative` from btn-corners, if merged, are reverted.
3. Primary (filled) buttons keep their four corner ornaments as today, inside their own box. Danger buttons keep none.
4. No `.o-corner` element anywhere on the page is positioned relative to main, a card, a sheet or a sheet footer; on Settings there is nothing drawn within 100 px of the header's bottom edge at the left and right page corners except the side thread.
5. Quick mode: no corner ornaments (as today).
6. Nothing else in the CSS changes (colours, sizes, glow, tab bar, primary buttons).

## Acceptance rows (the supervisor turns these into hidden tests; Playwright, bounding boxes)
| situation | expected |
|---|---|
| Settings, phone 390 px, Ash light | count of `.o-corner` inside `.btn.quiet` and `.btn.ghost` is 0; no `.o-corner` has a top within 100 px of the header |
| Recipes, Suggestions tab; Log; Review; Edit entry sheet | "New ideas", "Copy previous day", "Ask Claude", "Log again today" render as plain ink2 text with no ornament in their box or anywhere else |
| all 8 screens and the 12 sheets, 3 looks x 2 themes, 360 and 1280 px | count of `.o-corner` equals 4 times the count of primary buttons on screen; each lies inside its parent primary button's box |
| Quick mode | zero `.o-corner` rendered |
| style_diff.py against build 0.2.7 | no changed computed property on any quiet or ghost button; the only difference is the missing `.o-corner` nodes |

## Not in scope
- The selection-state system, motion and fonts (own briefs).
- Which buttons are primary.

## Data and texts
- Data format changes: none.
- User-facing texts: none.

## Known constraints
- Files: src/ornaments.js (`decorateOrnaments`: the selector that adds corners to `.btn:not(.danger)` becomes primary buttons only, that is `.btn:not(.danger):not(.quiet):not(.ghost)`), src/app.css (remove any quiet or ghost corner rule and any padding or `position: relative` that btn-corners added to quiet and ghost; the primary button rules at line 251 to 256 stay).

## Open questions
- none
