# nutrilog-260928-review-chart: The daily chart on Review keeps one height and a faint target band at every window width
priority: 3   depends on: none

## Pipeline
- Batch `defects-260928`. One worker task. No push, no rebuild until the batch ends.

## Why
Run 2 defect D4: the chart is an SVG with a fixed viewBox and no fixed height, so at 1280 px it stretches to four times its size with 40 px weekday labels, and the target zone is drawn as a full-width filled rectangle, the largest closed box left in the app after the open-edge pass. On the phone it reads as a pink slab hiding a hairline bar.

## Behavior (what must be true when done)
1. The chart is 120 css px tall at every width; its width follows its column. Bars keep their proportions (a bar's height in px = value / max x 100 px, labels take the remaining 20 px).
2. Target band: the range from the low to the high target is drawn as a band filled with the accent colour at 12 percent opacity, with a 1 px line in the row-line colour at its top and bottom edges; no other fill.
3. Bars: 60 percent of the column width, at least 6 px and at most 28 px wide, centred in their column, radius 2 px; colours as today (ochre below the range, garnet above, accent within; accent when there is no target).
4. Labels: weekday short names at 11 px in ink3 for the week view; in the month view the day number on days 1, 5, 10, 15, 20, 25 and the last day, 11 px.
5. Days without a log show no bar (as today). A day whose value exceeds the chart maximum is clipped to the top with no overflow outside the chart box.
6. No horizontal page overflow at 360, 390 and 1280 px in either view.

## Acceptance rows (the supervisor turns these into hidden tests; Playwright)
| situation | expected |
|---|---|
| Review week, phone 390 px | chart box height 120 px; weekday labels 11 px |
| Review week, PC 1280 px | chart box height 120 px, width equals the column width; labels 11 px |
| profile with target 2,240 to 2,970, one day at 78 kcal | band top and bottom at the pixel rows for 2,970 and 2,240 of a 100 px scale; band fill accent at 12 percent; the 78 kcal bar 3 px tall, ochre |
| month view, 31 days | 7 labels at days 1, 5, 10, 15, 20, 25, 31; bars 6 px wide minimum, no overlap |
| a day at 3 times the target high | bar clipped at the chart top; no element outside the chart box |
| no profile | no band; bars accent |
| 360 px | no horizontal page scroll |

## Not in scope
- Other meters (Today, macro tiles), the review numbers.

## Data and texts
- Data format changes: none.
- User-facing texts: none.

## Known constraints
- Files: src/review.js (dailyChart), src/app.css or base.css for the chart size. Colour tokens as already used in dailyChart.

## Open questions
- none
