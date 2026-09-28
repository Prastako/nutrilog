# nutrilog-260928-motion: The app moves softly: one tempo, four easings, reduced-motion respected, Quick mode static, and the ornament split stops twitching
priority: 3   depends on: nutrilog-260928-select-comet

## Pipeline
- Batch `defects-260928`. Two worker tasks: (a) CSS tokens, screen, list, meter, press, comet and the ornament split; (b) the sheet close delay and the toast in JS. No push, no rebuild until the batch ends.
- Reference: the "Soft" column of the motion page (design chat 2026-09-28).

## Why
Design decision Jan 2026-09-28 (question 2). The app has no transitions apart from a 180 ms screen fade and a 200 ms sheet rise; selection, meters, lists, presses and sheet close all snap. The design is soft and the motion should match it. Also run 2 defect D9: the chromatic split of the ornaments jumps to 1.6 px for a quarter second every 7 seconds; the decision is to drop the jitter and keep the split still.

## Behavior (what must be true when done)
1. Six duration tokens and four easing tokens exist on `:root` and every transition and animation in the app uses them: fast 160 ms, base 260 ms, slow 340 ms, meter 720 ms, press 380 ms, stagger 42 ms; arrive `cubic-bezier(.22,.61,.36,1)`, leave `cubic-bezier(.55,0,.8,.4)`, move `cubic-bezier(.45,0,.2,1)`, settle `cubic-bezier(.16,.75,.3,1)`.
2. Screen change: the incoming screen fades in and rises 6 px over base with arrive (replaces the current 180 ms 4 px fade). The outgoing screen is simply gone, as today.
3. Sheet open: the sheet rises from below the viewport to its place and its scrim fades in, over slow with arrive. Sheet close (X, scrim tap, Android back, and after Save): the sheet moves back down and the scrim fades out over base with leave, and only then is it removed; the screen underneath is redrawn after the removal as today. Two closes in a row do not double-fire.
4. Press feedback: a primary (filled) button shrinks to 98.5 percent while held (fast, arrive) and, on release, its glow breathes out and back: from 0 0 18 px glow-strong plus 0 0 46 px glow-soft, peaking at 0 0 30 px glow-strong plus 0 0 64 px glow-soft at 45 percent of the time, back to the resting 0 0 24 px glow-soft, over press with arrive. Secondary text buttons and icon buttons turn accent-ink while held (fast). Danger buttons: no glow pulse, colour only.
5. Meters (`.rfill` and `.rend` on Today, the macro tiles and Review): when a screen is shown or a value changes, the fill grows from its previous width (from zero on first show) to the new value and the star endpoint travels with it, over meter with settle. The value text itself does not animate.
6. Lists appearing (`.entry` rows on Log and Today, `.rcard` recipe cards, `.rowbtn` meal rows, `.frow` search results): when a screen or sheet is shown or a list is re-rendered, each item fades in and rises 5 px over base with arrive, one after another with a gap of stagger, and the gap stops growing after the twelfth item so a long list never waits more than about half a second in total.
7. Comet selection (from nutrilog-260928-select-comet): on choosing, the spark turns accent over fast; after a pause of 80 ms the end dot sets off from the spark and travels under the label to its end over slow with arrive, drawing the thread behind it. The previously chosen option's thread fades out over fast with leave; it does not retract. On the tab bar the active label colour changes over fast.
8. Toast: fades in and rises 6 px over base with arrive; fades out over fast with leave.
9. Reduced motion (the phone's setting, `prefers-reduced-motion: reduce`): every fade stays but at half length (fast 60, base 130, slow 170 ms); nothing moves, scales, travels or pulses; meters and comet threads appear at their final state; the stagger is 0.
10. Quick mode (`body.quickmode`): no transitions and no animations of any kind, as today.
11. Ornament split (D9): the red and cyan layers of every ornament stay at their resting offsets (0.55 px) permanently; the 7 second jitter keyframes are gone. Nothing else about the ornaments changes.
12. Frame budget: only opacity, transform, colour, box-shadow, width and left of the meter parts, and the comet's right edge are animated; nothing else animates.

## Acceptance rows (the supervisor turns these into hidden tests; Playwright, computed styles and timed screenshots)
| situation | expected |
|---|---|
| `:root` computed custom properties | `--t-fast` 160ms, `--t-base` 260ms, `--t-slow` 340ms, `--t-meter` 720ms, `--t-press` 380ms, `--stagger` 42ms, the four easings as listed |
| open the Edit entry sheet, screenshot at 0, 170 and 400 ms | sheet lower and scrim fainter at 170 ms than at 400 ms; at 400 ms in place |
| close the sheet, poll the DOM | `#sheetRoot` still contains the sheet 100 ms after the close tap and is empty by 400 ms; the screen underneath is refreshed after that |
| open then close within 100 ms, and back-gesture close | no error, sheet removed once, history state consistent (existing sheet tests still pass) |
| Today, first show | `.rfill` width at 50 ms is smaller than at 800 ms; at 800 ms equals the value; `.rend` left matches the fill width at both times |
| Log with 12 entries, screenshot at 100 ms and at 700 ms | fewer fully opaque entries at 100 ms; all opaque by 700 ms; a 40-entry list is fully opaque by 800 ms |
| primary Save button, mousedown held | computed transform scale about 0.985; on mouseup a box-shadow animation of duration 380 ms runs |
| Edit entry, tap Dinner, screenshots at 60, 200 and 500 ms | spark accent by 60 ms; thread shorter than the label at 200 ms; full length with end dot by 500 ms; Lunch's thread gone by 200 ms |
| `prefers-reduced-motion: reduce` emulated | no computed transform transitions; meter at final width within 20 ms; thread full length at once; durations 60/130/170 ms |
| Quick mode | every computed transition-duration and animation-duration is 0s |
| ornaments, any screen, 8 s of screenshots at 250 ms intervals | the side thread's red and cyan layers never differ from their frame-0 position; no `orn-jit` animation name anywhere |
| style_diff.py against the previous build, motion off | no static property changes except the removal of the jitter animation names |

## Not in scope
- Page scroll behaviour, the header, the tab bar layout.
- The glow treatment of text (unchanged by decision).

## Data and texts
- Data format changes: none.
- User-facing texts: none.

## Known constraints
- Files: src/base.css (`.screen` animation, `.sheet` animation, `#toast`, the reduced-motion rule at line 119 becomes the rule in point 9), src/app.css (`.rfill`, `.rend`, `.ornsvg .ca` rules and the two `orn-jit` keyframes to delete, the quickmode rule), src/ui.js (`closeSheet`: add a closing class, remove the sheet after base, guard against double close; `openSheet` untouched), src/core.js (`toast`: add the in and out classes). Meters may need a class toggled on the next animation frame after render so the fill grows from zero on first show; keep that in src/ui.js where the meter is rendered (about line 126).
- No new dependencies. No change to `src/strings.js`.

## Open questions
- none
