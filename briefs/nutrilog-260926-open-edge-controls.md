# nutrilog-260926-open-edge-controls: No text sits in a filled box any more; only inputs, the sheet and one primary action per screen stay closed
priority: 2   depends on: nutrilog-260926-open-edge-legibility (uses its accent-ink, line-section and line-row tokens)

## Why
Jan dislikes the "pill" system: the tinted rounded blocks that text sits in (cards, chips, buttons). The uncommitted open-edge block at the end of src/app.css (Jan, 2026-09-26, option C) already removed the section boxes. Everything smaller still sits in a tinted rounded block, selected chips look identical to unselected ones, and the solid Remove outweighs Save. Jan confirmed this decision set on 2026-09-26.

## Behavior (what must be true when done)
1. Sections keep the model of the open-edge block: no box, a heading hairline, the side ornament thread in its gutter. A section never draws a container inside another section.
2. The only closed shapes left in the app: text inputs (text, number, search, date, select, textarea), the bottom sheet, the one primary button per screen or sheet (rule 3), recipe photos, the read-only text box in Settings (.verbatim), the look tiles in Settings, the toast and the tab bar. Everything else has no fill, no border box and no rounded background.
3. Primary button: filled with accent-ink, label in the display font at 20 px in the surface colour (light looks) or ground colour (dark looks), radius 6 px, height at least 52 px, outer glow soft 24 px. The four corner ornaments stay, drawn in the label colour. At most one per screen or open sheet:
   - Today: "Fill in the profile" while it is shown; otherwise none ("Supplements" becomes secondary).
   - Recipe detail: "Log a serving". Add-food sheet and Edit entry sheet: "Save". Supplements manager: "New supplement". Profile: "Save profile". Chat: the send button (icon only, square).
   - Settings, Review, Log and every screen or sheet not listed: none.
   - Anything not listed: the button that commits the sheet's main action is primary; if there is none, no primary.
4. Secondary buttons (every other .btn, including demoted former primaries): no fill, no border; label in the body font, ink2; the four corner ornaments in the ornament colour at 70 percent opacity; hit area at least 44 px tall.
5. Destructive buttons (Remove and every .btn.danger): garnet text with its icon, no fill, no border, no corner ornaments.
6. Tags (recipe tags, Starter, "high protein", the fit badges in the photo flow, every .pill): plain text at 12 px, items separated by a middle dot, wrapping; ink2, except status tags keep their colour as text (Starter and wait: ochre-ink, ok: accent-ink, err: garnet).
7. Pickers (anything with a selected state: chips with aria-pressed, every segmented control, the meal choice and portion presets in the add and edit sheets, the add-sheet modes Search / Barcode / Photo / Describe / Recipe / Manual, recipe filters, theme, language): a row of text items, no fill, no border. Inactive: ink2. Selected: accent-ink with a 2 px accent underline under the label and glow soft 8 px on it. Selection attributes stay as they are. Each item has a hit area of at least 44 x 40 px; rows that overflow keep scrolling sideways as now.
8. Action chips (chips without a selected state: Pantry, To buy, New chat, chat quick prompts, supplement presets, allergen tap-to-add, Add, Another cuisine): accent-ink text at 14 px, no container, a leading "+" kept where it exists, 16 px apart, wrapping.
9. Option rows (the radio and checkbox cards in Profile and elsewhere, .opt): no box; rows separated by line-row; the round or square mark stays; selected row: mark filled with accent, title in accent-ink, no background tint.
10. Meal "+" on Today rows and Log meal headers: a bare "+" glyph, 22 px, accent-ink, glow soft, no circle, hit area 44 x 44 px (replaces the 36 px circles of the open-edge block).
11. Icon buttons (header Back and Settings, day arrows, sheet close, Show on key fields): bare icon in ink2, no circle, no border, hit area 44 x 44 px (40 x 40 below 360 px).
12. Notices (every .notice variant and the backup bar): no fill, no border box; a 2 px line down the left edge in the status colour (warn ochre, bad garnet, good accent, plain notices the ornament colour) with glow soft, 12 px left padding, text in ink. Buttons inside follow rules 3 to 5.
13. Recipe thumbnails without a photo (the letter in the recipe list and on the recipe hero): the initial in the display font, accent-ink, same size as now, no tinted box. With a photo: the image with a 6 px radius, otherwise unchanged.
14. Key-value tiles on the recipe detail (Time, Kcal per serving, Difficulty): no boxes; columns separated by line-row, like the macro columns on Today.
15. Chat: no bubbles. Assistant text sits directly on the ground at full width; the user's message is right-aligned with a 2 px accent line on its right edge, no fill. Sender labels stay.
16. Quick mode is unchanged.

## Acceptance rows (the supervisor turns these into hidden tests)
| situation | expected |
|---|---|
| Today, Log, Recipes, Recipe, Chat, Review, Profile, Settings; add-food, Edit entry, Supplements sheets; 3 looks x light and dark | apart from rule 2 exceptions, no element has a background colour different from the ground and no element has a visible border on more than one side |
| Each screen and open sheet above | at most one element styled as primary |
| Add-food sheet, choose "1 large" then Lunch | "1 large" and "Lunch" show the accent underline; the other presets and meals do not; computed colours of selected and unselected items differ |
| Edit entry sheet | Save is the only filled element; Remove is garnet text with no background |
| Recipes list and Recipe detail | tags rendered as text separated by middle dots, no background; letter thumbnail has no background |
| Today, tap "+" on Snack | add-food sheet opens for Snack; the "+" has no circle and a hit area of at least 44 x 44 px |
| Backup bar and the protein-range notice | left line only, no fill, no other borders |
| Header Back and Settings, day arrows | no circle, hit area at least 44 x 44 px |
| Chat with one user and one assistant message | neither has a background fill; user message right-aligned with a right accent line |
| Profile, choose "Some movement" | selected row shows filled mark and accent-ink title, no background tint |
| Any screen at 360 px, Czech | no horizontal page scroll, no truncated labels |
| Keyboard focus on any picker item or button | visible focus outline |
| Quick mode | unchanged from the current build |
| English end-to-end test | passes, leftover Czech: none |

## Not in scope
- Colours, fonts, line tokens, lining figures, ink3 values, header medallion (brief open-edge-legibility).
- Ornament shapes, the side thread, the tab bar, the toast, Quick mode.
- What screens contain or how flows work; only shapes and surfaces.

## Data and texts
- Data format changes: none.
- User-facing texts: none new.

## Known constraints
- Files: supervisor decides; expected src/base.css, src/app.css, and src/ornaments.js if the corner ornaments need a different colour class on secondary buttons. Designating the one primary per screen may need a class change in the screen scripts (src/log.js, src/recipes.js, src/settings.js); the worker must grep for the button, not read whole files.
- The old surface rules (reskin brief 2) that give chips, pills, segments and buttons their tint and inset borders should be removed, not overridden, where the worker can do so without touching unrelated rules.

## Open questions
- Chat without bubbles (rule 15) is Claude's default under the "only inputs, sheet and primary stay closed" rule; Jan did not name chat explicitly. Not blocking: build it as written, Jan can revert on review.
