# nutrilog-260925-layout-wide: On a wide screen the app uses a side rail and two columns; the phone layout stays exactly as it is
priority: 2   depends on: none

## Why
Jan will use the app on his PC as well as on his phone (same profile through sync). Today the app on a PC is a phone column in the middle of the window. Nothing about the phone layout changes; above one width the same screens rearrange. Recipes are deliberately left as they are: how recipes are presented on a PC is decided later, after Jan has used the app for a while.

## Behavior (what must be true when done)
1. Below 900 CSS px of window width nothing changes: every screen, sheet and the tab bar look and behave as now (the existing 660 px rule for the tab bar included).
2. At 900 px and wider ("wide"): the tab bar becomes a vertical rail on the left edge, fixed, full height, with the same five tabs (icon above label), the same current-tab marking and the same dot. The content area sits to the right of the rail, centred, up to 1080 px wide. The header stays at the top of the content area with the same back and settings buttons.
3. Wide, Today: two columns of equal width. Left: the energy range, macros and the meal rows. Right: the next-meal suggestions and the supplements card. Cards keep their order inside each column.
4. Wide, Diary (Log): two columns. Left: the date navigation and the day's slots with entries. Right: the day totals and, when present, the copy-previous-day and other day actions. If the screen has nothing for the right column, the left column takes the full width.
5. Wide, Review: the period switch and headline stay full width; the nutrient cards flow in two columns.
6. Wide, Profile and Settings: one column, at most 640 px wide, centred in the content area (forms stay readable).
7. Wide, Recipes, recipe page and Chat: unchanged apart from the rail and the content width (Chat keeps its full-height mode).
8. Wide, sheets: a sheet opens as a centred dialog (at most 560 px wide, top aligned with a margin) instead of sliding from the bottom; the dark backdrop, close behaviour and the Android back handling stay. Escape closes the top sheet.
9. Resizing the window across 900 px re-lays out without reload and without losing the open screen, the diary date or an open sheet's contents.
10. No horizontal scrollbar at any width from 320 px to 1920 px; the rail never covers content.
11. Keyboard on a PC: Tab moves through the rail and the content in reading order, focus is visible, Enter activates the focused tab.

## Acceptance rows (the supervisor turns these into hidden tests; browser rows run in Playwright at the given widths)
| situation | expected |
|---|---|
| 360 px, all screens | identical to the current build (screenshot diff within tolerance), tab bar at the bottom |
| 899 px | phone layout with the 660 px tab bar rule, no rail |
| 900 px, Today | rail on the left with five tabs, two columns, meal rows left, supplements right |
| 1280 px, Today | content area not wider than 1080 px, centred right of the rail |
| 1280 px, Diary with entries | two columns; date navigation left |
| 1280 px, Diary, no right-column content | left column full width |
| 1280 px, Review, month | nutrient cards in two columns |
| 1280 px, Settings | one column, at most 640 px wide, centred |
| 1280 px, open the add-food sheet | centred dialog, at most 560 px wide, backdrop present; Escape closes it |
| 1280 px, Chat | chat column full height, rail present |
| resize 1280 to 700 with the add-food sheet open and text typed | sheet becomes a bottom sheet with the text still there |
| 320 px to 1920 px, every screen | no horizontal scrollbar |
| 1280 px, Tab from the address bar | first stop is the first rail tab; Enter opens it |
| 1280 px, current look Ember dark | rail uses the look's surface and accent colours like the tab bar does |

## Not in scope
- Any change to how recipes are listed or shown (decided later).
- New features; this brief only rearranges.
- Quick mode (brief quick-mode) and touch or D-pad behaviour on very small screens.

## Data and texts
- No data change. No new texts.

## Known constraints
- Files: supervisor decides; the wide rules belong in `src/app.css` as media queries at `min-width: 900px`; the tab bar markup in `src/app.js` (`renderTabs`) can stay if the rail is CSS only. Columns are CSS grid on the existing screen sections; if a screen needs two wrapper elements for the columns, add them in that screen's render function without changing the cards' own markup.
- The existing 660 px rule for the tab bar stays for 660 to 899 px.
- The e2e scripts run at phone size and must keep passing unchanged.
- The reskin briefs (looks, surfaces, ornaments) may land before or after this one; the rail must use the same colour tokens as the tab bar so it follows whichever is merged.

## Open questions
- none
