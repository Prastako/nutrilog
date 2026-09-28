# nutrilog-260924-activity-logic: Calorie targets use the reference activity values, and an optional detailed week (daily life plus training) adds training energy
priority: 1   depends on: none

## Why
The four activity levels multiply the resting burn by 1.25 to 1.75, which the research found below EU and WHO reference values (about 200 to 250 kcal a day low at the lowest level). Jan wants the scientifically supported values. He also wants an optional detailed description of the week (daily life level plus training sessions) so training counts separately. This brief is logic only; the screen comes in a later brief.

## Behavior (what must be true when done)
1. Simple levels: the calorie estimate multiplies the resting burn by 1.40 (level 1), 1.55 (level 2), 1.70 (level 3), 1.90 (level 4). A missing or unknown level behaves as level 2, as today. Stored levels keep their ids; only the numbers behind them change.
2. Uncertainty of the levels stays as today: 0.13, 0.13, 0.14, 0.16 for levels 1 to 4. The width rule of the shown range does not change.
3. Detailed week: when the profile has `person.activityDetail` with `on` true, the daily life level `base` (1 to 4, same multipliers as rule 1, missing or unknown base behaves as 1) replaces the simple level, and training energy per day is added on top: total daily burn = resting burn x base multiplier + training kcal per day.
4. Training kcal per day = (MET - 1) x weight in kg x minutes per session / 60 x sessions per week x attendance / 7.
   - MET by kind: strength 3.5, heavy 6.0, cycling 5.0, cyclinghard 9.0, circuits 7.5, hiit 11.0, climbing 5.8, yoga 2.3. Unknown or missing kind: 3.5.
   - Attendance: always 0.9, usually 0.75, sometimes 0.5. Missing or unknown: 0.75.
   - Missing minutes: 60. Sessions missing, 0 or negative, or weight missing: training is 0.
5. When `activityDetail` is missing or `on` is false, training is 0 and the simple level applies, whatever else `activityDetail` contains.
6. The computed targets expose the training kcal per day as a whole number (`training`) and the multiplier used (`mult`), so a later screen can show "Training adds about N kcal a day".
7. More training never lowers the target: for the same profile, more sessions, longer sessions, a higher MET kind or higher attendance give an equal or higher middle value.
8. The detailed week does not narrow the shown range; the range width comes from the base level uncertainty as in rule 2.
9. Everything else about targets (minimum 1200 kcal, direction lose/maintain/gain, macro split, resting burn with or without height or body fat) is unchanged.

## Acceptance rows (the supervisor turns these into hidden tests)
Reference person for all rows: age 30, height 170 cm, weight 70 kg, no body fat, direction maintain. Resting burn for this person is 1534.5 kcal (10 x 70 + 6.25 x 170 - 5 x 30 - 78).
| situation | expected |
|---|---|
| The four multipliers, in level order | 1.40, 1.55, 1.70, 1.90 |
| Level 1, no activityDetail | mult 1.40, training 0, total daily burn rounds to 2148 |
| Level 3, no activityDetail | mult 1.70, training 0 |
| No level at all | mult 1.55 (level 2 behavior) |
| Level 3, activityDetail {on false, base 1, sessions 3, kind hiit} | mult 1.70, training 0 |
| activityDetail {on true, base 2, sessions 3, minutes 60, kind strength, attendance always} | mult 1.55, training 68 (exact 67.5), total daily burn 2446 (within 1) |
| activityDetail {on true, base 1, sessions 3, minutes 60, kind heavy, attendance usually} | training 113 (exact 112.5) |
| activityDetail {on true, base 1, sessions 2, minutes 60, kind climbing, attendance usually} | training 72 |
| activityDetail {on true, base 1, sessions 2, minutes 60, kind yoga, attendance usually} | training 20 (exact 19.5) |
| activityDetail {on true, base 1, sessions 3, kind strength, attendance always}, minutes missing | same as minutes 60: training 68 |
| activityDetail {on true, base 1, sessions 3, minutes 60, kind unknownword, attendance nonsense} | MET 3.5 and attendance 0.75 used: training 56 (exact 56.25) |
| activityDetail {on true, base 7, sessions 0} | mult 1.40 (base falls back to 1), training 0 |
| activityDetail {on true, sessions 3, minutes 60, kind strength, attendance always} and weight missing | targets are not computed at all (weight is required, as today) |
| activityDetail {on true, base 2, sessions 5, minutes 60, kind strength, attendance always} vs the same with sessions 3 | middle value with 5 sessions is higher |
| activityDetail {on true, base 2, sessions 3, ...} vs the same profile with on false and level 2 | shown range has the same width in percent (relPct equal) |
| Old profile saved before this change (level 2, no activityDetail) | opens and computes with mult 1.55, no error |
| All existing unit tests | pass; a test whose expected number changed only because of the new multipliers is updated to the recomputed value, nothing else in it changes |

## Not in scope
- No screen changes: the Profile screen keeps its four choices and does not show the detailed week yet (brief activity-detail).
- No change to what Claude is told about the person (brief ai-nosex).
- No change to texts in either language.
- The weekly plan is a starting estimate, not the final design: later, logged or detected sessions (workout app, a tracker via Health Connect) should feed the same per-session formula and replace the plan. Do not build anything toward that now, but do not make the plan a hard-wired assumption either (rule 4 must work for a single session as well as a week).

## Data and texts
- Data format changes: `person.activityDetail` object, optional, new. Fields: `on` boolean (default false), `base` 1 to 4 (default 1), `sessions` whole number of sessions a week (default 0), `minutes` per session (default 60), `type` one of strength, heavy, cycling, cyclinghard, circuits, hiit, climbing, yoga (default strength), `attendance` one of always, usually, sometimes (default usually). Old records have no `activityDetail` and keep working (rule 5). Document it in docs/DATA_FORMAT.md, profile row.
- User-facing texts: none.

## Known constraints
- Files: the goal engine in src/core.js (the ACTIVITY table and computeTargets) plus one new unit test file; docs/DATA_FORMAT.md. Existing expected numbers in test/core.test.mjs will change because of the multipliers.
- Worker: 64k context; give line numbers, never let it read src/strings.js; compare node:vm objects by single fields or JSON copies. Every number above needs a hidden check (a previous task invented its own values).
- Yesterday's unsubmitted task nutrilog-20260924-activity4a covered the same logic without climbing and yoga; it can be reused if the supervisor still has it, with the two kinds added and the rows above.

## Open questions
- none
