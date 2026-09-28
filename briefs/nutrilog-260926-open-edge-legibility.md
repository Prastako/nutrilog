# nutrilog-260926-open-edge-legibility: Numbers, small labels and structure lines are legible in every look, and nothing shows through the content
priority: 1   depends on: none (starts from the uncommitted open-edge block at the end of src/app.css, VERSION 0.2.7; the supervisor commits that state first)

## Why
The v0.2.6 review (project doc claude/nutrilog-design-review-2026-09-25.md) found small labels at 2.5 to 3.7 to 1 contrast, old-style figures in a numbers-first app, a header watermark bleeding over the first card on every screen, and right-aligned values touching the screen edge in the open-edge mock. Jan confirmed the open-edge decision set on 2026-09-26; this brief is its legibility half. The other half (controls without containers) is nutrilog-260926-open-edge-controls.

## Behavior (what must be true when done)
1. Lining figures everywhere: every digit in the app (kcal, grams, dates, times, ranges, inputs) uses lining figures in all six look and theme combinations. Values that stand in columns or right-aligned (meal kcal, entry kcal, macro values, review numbers, kv values) also use tabular figures.
2. Small text colour (ink3) is replaced per look and theme with these values, each at least 4.6 to 1 against ground, surface and surface2:
   - Ash light #625F60, Ember light #6D5F4B, Lichen light #5E645A
   - Ash dark #908C89, Ember dark #97856D, Lichen dark #818D7B
   The device-theme dark block gets the same dark values as the explicit dark block. In light looks ink3 is now close to ink2; small labels keep their difference through size, uppercase and tracking, not through paleness.
3. New token accent-ink, used for every piece of accent-coloured text and for the fill of the primary button (brief open-edge-controls): light looks Ash #855250, Ember #835724, Lichen #456B48; dark looks equal the existing accent. Existing accent stays for lines, glows and ornaments.
4. Two line tokens replace card-edge wherever it draws a structure line:
   - line-section (heading hairlines of open sections, the top line of a sheet, the line under the header): ink at 20 percent in light, ink at 22 percent in dark.
   - line-row (between rows, between macro columns, between recipe rows, under list entries, the thin divider in the kv lists): ink at 10 percent in light, ink at 12 percent in dark.
   The small star-with-dots row separator from the open-edge block keeps its shape but is drawn at 45 percent opacity in light and 55 percent in dark, so it is always fainter than a section hairline.
5. Right text margin: on phones from 360 to 430 px wide, every right-aligned value (meal kcal, entry kcal, "add", review values, kv values) ends at least 16 px from the screen edge, and all of them on one screen end on the same vertical line. The side ornament thread stays in its own gutter outside that line and never overlaps text.
6. Header watermark: the large faint medallion behind the header is clipped to the header's own area. Nothing of it is visible below the header's bottom line on any screen, in any scroll position.
7. The side ornament thread is unchanged in shape and position, except that rule 5 must hold.

## Acceptance rows (the supervisor turns these into hidden tests)
| situation | expected |
|---|---|
| Today with 1,326 kcal logged, any look, light and dark | the digits 1 to 9 in "1,326" and in the target range all sit on the baseline (lining); computed font-variant-numeric contains lining-nums |
| Log with 5 entries | entry kcal values right-aligned on one vertical line, tabular figures |
| Every element coloured ink3, 3 looks x light and dark | contrast at least 4.5 to 1 against the background it sits on |
| Any accent-coloured text, 3 looks x light and dark | contrast at least 4.5 to 1 against its background |
| Today, Meals section | heading hairline uses line-section; the separators between meal rows are fainter than the heading hairline in both themes |
| Today at 360 px and at 390 px | right edge of "286 kcal" at least 16 px from the viewport's right edge; no text overlaps the side ornament |
| Any screen scrolled to the top, and scrolled by 200 px | no pixel of the header medallion below the header's bottom edge |
| Quick mode | unchanged from the current build |
| English end-to-end test | passes, leftover Czech: none |

## Not in scope
- Containers, buttons, chips, pickers, notices, icon buttons (brief open-edge-controls).
- Fonts themselves, the three looks' other colours, the ornaments' shapes and glow.
- Quick mode keeps its plain bordered style.

## Data and texts
- Data format changes: none.
- User-facing texts: none new.

## Known constraints
- Files: expected src/base.css and src/app.css only; the medallion clip may need the header rule in src/app.css. No JavaScript change expected.
- Colour values above were computed with the WCAG formula against all three background tokens of each look; copy them, do not re-derive.

## Open questions
- none
