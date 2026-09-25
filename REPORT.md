# REPORT: nutrilog-20260925-actdetail-c

## Profile screen changes
- New toggle `person.activityDetail.on` now re-renders the Profile screen when flipped, switching between the legacy activity level dropdown and the detailed activity fields.
- The `person.activityDetail.base` numeric field now stores its value via `Number(v)` like other number fields (timeWeekday, timeWeekend).

## Files changed
- `src/app.js` -- added `person.activityDetail.on` branch (stores `el.checked`, calls `renderProfile()`), and added `person.activityDetail.base` to the Number(v) branch on line 292.
- `test/activity-detail.test.mjs` -- new file, 11 tests covering the toggle behavior, kcal estimation across activity types and attendance levels, empty-weight handling, and validation range errors.

## Test result
277 tests pass, 0 fail (52 suites, ~159ms).
