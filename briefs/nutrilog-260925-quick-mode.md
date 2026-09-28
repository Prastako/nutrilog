# nutrilog-260925-quick-mode: A per-device Quick mode shows only food and supplement logging on one screen, usable on a very small touchscreen with a keypad
priority: 2   depends on: none

## Why
Jan's second phone is a Dumber Mini: a 2.8 inch touchscreen (640 x 480 hardware pixels, CSS width unknown, likely 240 to 320 px) with a physical keypad and a slow chip. On it the app is only for noting what was eaten. Quick mode is one screen with the basics, large targets, no effects, and an order the keypad can walk through. It is a device setting, never synced, so the PC and the main phone keep the full app.

## Behavior (what must be true when done)
1. Settings, Appearance card, gets a switch "Quick mode" (`qm_title`) with the note `qm_note`. Off by default. Stored with the device settings only (never in the sync, allowed in the export like other settings).
2. The first time the app opens on a window narrower than 340 CSS px, and Quick mode has never been decided on this device, a sheet offers it: `qm_offer` with buttons `qm_offer_yes` and `qm_offer_no`. Either answer is remembered; the sheet never shows again on that device. Opening the app at `#quick` turns Quick mode on directly (no sheet) and is remembered the same way.
3. The manifest gets an app shortcut "Quick log" (`qm_shortcut`) pointing at `./#quick`, so the launcher can open Quick mode directly on phones that support shortcuts.
4. Quick mode on: the app shows one screen, `quick`, instead of the five tabs. The tab bar is hidden. The header shows the short date and the settings button; the back button is hidden. Settings, Profile and the sheets opened from the quick screen still work; every other screen is unreachable from the quick screen (the hash of another screen redirects to `quick`).
5. The quick screen, top to bottom: the energy line `qm_energy` with today's kcal and the target range (whole numbers, the existing range engine); four slot rows breakfast, lunch, snack, dinner, each a single wide button showing the slot name, the entry count and kcal of what is logged, opening the add-food sheet for that slot (`data-act="add-food"` like Today); under each slot row that has no entries a small button `qm_same` that copies yesterday's entries of that slot to today (the existing copy logic, that slot only), hidden when yesterday's slot is empty; the day's entries listed under their slot with a delete button each; the supplements checklist of the day (the existing rows: name, taken or not, tap to take); at the bottom a link `qm_full` that turns Quick mode off and opens Today.
6. The add-food sheet in Quick mode shows the search field with the recent foods list first, the amount step, and Save. The modes Scan, Photo, Describe, Recipe and Manual are hidden (the segment is not rendered). Everything else about adding food is the existing flow.
7. Small-screen rules, applied when the window is narrower than 360 CSS px in any mode (so the full app also behaves on a small screen): base font 15 px, side margins 10 px, buttons and rows at least 40 px tall, the header ornament hidden, no horizontal scroll at 240 px width.
8. Quick mode uses the current look's colours and fonts but none of the effects: no blur, no glow, no chromatic split, no ornaments (fast on a slow chip). Switching Quick mode off restores the effects.
9. Keypad and keyboard: on the quick screen every control is a focusable button or input in reading order; the focused control shows a visible 2 px accent outline; Enter activates it; the first focusable control after load is the breakfast row; inside the add-food sheet focus starts in the search field, and the food rows, the amount field, the portion buttons and Save follow in order. The back key closes the sheet (existing history handling). Nothing on the quick screen needs a long press, a swipe or a hover.
10. Sync (brief sync-val) and backup run in Quick mode as in the full app; the backup bar shows at the top as now.

## Acceptance rows (the supervisor turns these into hidden tests; browser rows in Playwright at 300 x 400 and 320 x 480 CSS px unless stated)
| situation | expected |
|---|---|
| fresh install at 300 px | offer sheet shown; Yes turns Quick mode on and shows the quick screen; the sheet never returns after reload |
| fresh install at 300 px, No | full app, phone layout; no sheet on reload |
| fresh install at 360 px | no offer sheet |
| open `#quick` at 1280 px | Quick mode on, quick screen shown, no sheet |
| Quick mode on, open `#review` | quick screen shown, hash becomes `#quick` |
| Quick mode on, Settings | switch shows on; turning it off shows Today with the tab bar |
| quick screen, no entries | four slot rows with 0 entries; `qm_same` visible only under slots that had entries yesterday |
| tap `qm_same` under lunch | yesterday's lunch entries copied to today's lunch; button disappears |
| tap the breakfast row, search "oat", pick a food, Save | entry listed under breakfast; energy line updated |
| add-food sheet in Quick mode | no mode segment; search field focused; recent foods listed |
| Tab from the top of the quick screen | focus order: breakfast, its entries' delete buttons, `qm_same` if present, lunch, ... , supplements rows, `qm_full` |
| Enter on the focused lunch row | add-food sheet opens with lunch preselected |
| supplements row tapped | intake recorded, row shows taken, same as Today |
| 240 px width, quick screen and add-food sheet | no horizontal scroll |
| 300 px, full app Today | font 15 px, margins 10 px, no horizontal scroll |
| Quick mode on, look Ember dark | colours of Ember, no element with blur or glow on the quick screen |
| export while Quick mode on | settings include the quick mode value; a joined profile's sync payload never contains it |
| manifest | contains one shortcut with url `./#quick` |

## Not in scope
- Barcode scan and photo on the small phone (later, if the camera turns out usable).
- A different quick screen for the PC; Quick mode is the same everywhere, it is only meant for the small phone.
- Any change to the full app's screens beyond the small-screen rules in rule 7.

## Data and texts
- Settings gain `quickMode`: `"on"`, `"off"` or missing; and `quickModeAsked`: true once the offer sheet was answered or `#quick` was used. Missing reads as off and not asked.
- User-facing texts, Czech / English:
  `qm_title` "Rychlý režim" / "Quick mode"
  `qm_note` "Jen zápis jídla a doplňků na jedné obrazovce. Nastavení tohoto zařízení." / "Only food and supplement logging on one screen. A setting of this device."
  `qm_offer` "Malá obrazovka. Zapnout rychlý režim jen se zápisem jídla?" / "Small screen. Turn on Quick mode with food logging only?"
  `qm_offer_yes` "Zapnout" / "Turn on"
  `qm_offer_no` "Nechat celou aplikaci" / "Keep the full app"
  `qm_shortcut` "Rychlý zápis" / "Quick log"
  `qm_energy` "{kcal} z {lo} až {hi} kcal" / "{kcal} of {lo} to {hi} kcal"
  `qm_same` "Jako včera" / "Same as yesterday"
  `qm_full` "Celá aplikace" / "Full app"
  `t_quick` "Zápis" / "Log"

## Known constraints
- Files: supervisor decides; suggested a new `src/quick.js` in the build order after `log.js`, reusing `openAddSheet`, the supplement rows and the copy-previous-day logic from `src/log.js` rather than copying them. The manifest is a static file (`manifest.webmanifest`) the worker may edit; `sw.js` and `index.html` stay untouched (built by the supervisor).
- The offer threshold (340 px) and the small-screen threshold (360 px) are Claude's choices [assumed: the Dumber Mini reports a CSS width below 340 px; confirmed by reading `window.innerWidth` on the phone once]. If the phone reports more, the supervisor raises both numbers in one place.
- `node --test` must pass; Playwright rows at the widths above run by the supervisor.

## Open questions
- none
