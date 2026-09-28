# nutrilog-260928-select-comet: One selection mark for every kind of choice: the comet
priority: 2   depends on: none (merge before nutrilog-260928-motion and nutrilog-260928-type-sets)

## Pipeline
- Batch `defects-260928`. One worker task for CSS plus the small JS changes listed under Known constraints. No push, no rebuild until the batch ends.
- Reference: the "Comet" column of the design page (design chat 2026-09-28); the geometry below is exact.

## Why
Design decision Jan 2026-09-28 (question 1 of the v0.2.7 design session). Today a chosen radio row shows a filled circle and accent text, a chosen chip an accent underline, a chosen look tile an outline with a corner dot, a chosen portion preset nothing at all (run 2 defect D6). One mark replaces all of them: a small spark before the label that lights when chosen, with a thread drawn from the spark under the label to a dot at its end. It reads by shape, not only by colour, and it is quiet.

## Behavior (what must be true when done)
1. Every selectable option in the app carries the comet mark. Selectable options are: radio and checkbox rows (`.opt`), chips with `aria-pressed` (meal picker, supplement days, times, repeat, tag filters, photo hints, chat pantry have/buy), the add-food mode tabs and the Review and Recipes tab rows (`.seg button`), look tiles (`.looktile`), and the portion presets in the amount step (the `.chip` buttons with `data-g`). The bottom tab bar keeps its current lit spark under the active label and is not changed.
2. Unchosen option: a 12 x 12 px spark (the app's `#spark` shape) in the ornament colour at 40 percent opacity, no thread. The label keeps its current colour (ink2 for chips and segments, ink for rows).
3. Chosen option: the spark turns to the accent colour at full opacity with the ornament glow (drop shadow 0 0 2.5 px glow-strong and 0 0 7 px glow-soft); the label turns accent-ink with text glow 0 0 8 px glow-soft; a thread appears under the label: 1.5 px thick, accent colour, starting 2 px left of the label's left edge and ending 6 px past its right edge in a 2.4 px round dot, with a drop shadow 0 0 4 px glow-strong. The thread's centre line sits 5.5 px below the bottom of the label box.
4. Geometry of the spark: its centre is 6 px left of the label's left edge and 5 px below the label box bottom, so the thread starts at the spark. The label is set 6 px right of where it starts today to make room; the option's tap target stays at least 40 px tall (44 px for rows).
5. Radio rows (`.opt`): the round `.mark` and its filled state are gone; the comet sits before the title (`.t1`); the sub-line (`.t2`) keeps its place under the title; the row hairline stays. Checkbox rows (`.opt.sq`) use the same comet (a checked box shows a lit comet).
6. Chips and segments: the accent underline (text-decoration) is gone; spacing between options in a row is 22 px so threads never touch; rows wrap as today. Multi-select chips (supplement days, tag filters, pantry have/buy) show one comet per pressed chip.
7. Segmented controls (`.seg`, including the Theme control in Settings and the Language control): options take their natural width and sit left-aligned in one row like the meal picker, instead of three equal thirds, so "Follow the phone" and "Podle telefonu" never wrap. The add-food mode row still scrolls sideways.
8. Look tiles: the outline and the corner dot are gone; the comet sits before the tile name, coloured with the tile's own accent (`--lk-accent`) when chosen and the tile's ink at 40 percent when not.
9. Portion presets: the preset whose gram value equals the current grams field is chosen (aria-pressed true) and shows the comet; typing a different number in the grams field unmarks every preset; tapping a preset marks it and fills the field, as today.
10. Keyboard focus keeps the current outline. Contrast of every label stays at 4.6:1 or better on all six look and theme combinations.
11. Quick mode is unchanged (its plain pre-reskin controls stay).

## Acceptance rows (the supervisor turns these into hidden tests; Playwright at 390 px, all looks and themes)
| situation | expected |
|---|---|
| Edit entry sheet, Lunch chosen | Lunch has an accent spark and a thread with an end dot under it; Breakfast, Snack, Dinner have a faint spark and no thread; no text-decoration on any of them |
| add food, amount step, 113 g chosen | the "4 oz · 113 g" preset shows the comet; the others do not; typing 120 in the field removes it from all; tapping "100 g" marks 100 g and sets the field to 100 |
| Settings, Theme control | three options on one line, left-aligned, natural width; the chosen one carries the comet; no option wraps in Czech at 360 px |
| Settings, look tiles | chosen tile: comet in the tile's accent before its name; no outline, no corner dot |
| Review, period tabs; Recipes, tabs; add-food mode tabs | the active tab carries the comet, no underline |
| Supplement sheet, days Mon Wed Fri pressed | three comets, one per pressed day |
| Profile, radio rows (activity, goal) | chosen row: comet before the title, no round mark anywhere in the DOM's rendered output (`.mark` not visible) |
| bottom tab bar | unchanged from the previous build (style_diff) |
| every comet | spark box 12 x 12 px; thread height 1.5 px; end dot present; spark centre 6 px left of the label box |
| all six look and theme combinations | label contrast of chosen and unchosen options at least 4.6:1 (axe_check plus explicit ratio) |
| Quick mode | style_diff shows no change on the Quick screen |

## Not in scope
- Motion of the comet (nutrilog-260928-motion draws the thread from the spark; here it appears at once).
- The type-set tiles (nutrilog-260928-type-sets reuses this mark).
- The bottom tab bar, primary and secondary buttons.

## Data and texts
- Data format changes: none.
- User-facing texts: none.

## Known constraints
- Files: src/base.css (`.opt`, `.chip`, `.seg` rules), src/app.css (open-edge controls block: chips, seg, opt, looktile rules), src/log.js only at the portion preset row (about line 277 to 279: add `aria-pressed` and keep it in step with the grams field), src/ornaments.js if the spark is inserted as an element (a CSS mask with the spark path as a data URI is also acceptable and needs no JS).
- The spark path: `M0 -5.5C.6 -1.4 1.4 -.6 5.5 0 1.4 .6 .6 1.4 0 5.5 -.6 1.4 -1.4 .6 -5.5 0 -1.4 -.6 -.6 -1.4 0 -5.5Z` in a viewBox of -6 -6 12 12.
- No new dependencies. No change to `src/strings.js`.

## Open questions
- none
