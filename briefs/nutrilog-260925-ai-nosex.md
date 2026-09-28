# nutrilog-260925-ai-nosex: What Claude is told about the person no longer names a sex; it gets body fat, periods and the activity description instead
priority: 2   depends on: none (the activity part of rule 3 only applies once nutrilog-260924-activity-logic is merged)

## Why
Jan: no sex setting anywhere in the app. The profile line in the context sent with every Claude request (chat, photo evaluation, review commentary, recipe suggestions) still says "male physiology" or "female physiology", and for a profile without a stored sex it says "male physiology". Yesterday's fix was lost with the bridge drop.

## Behavior (what must be true when done)
1. The PROFILE line sent to Claude never contains the words male, female, man, woman or sex as a description of the person. It starts with: `PROFILE (no sex given; do not assume one): ` followed by comma-separated items.
2. Items, in this order, each only when the value exists:
   - `<age> years`
   - `<height> cm` when height is given, otherwise `height not given`
   - `<weight> kg`
   - `<bodyFat> % body fat` only when body fat is stored (3 to 60)
   - `has periods (iron need 16 mg)` only when periods is 'yes'; nothing when 'no' or 'skip'
   - activity: when the detailed week is off or absent, `activity level <N> of 4` as today; when it is on, `daily life level <base> of 4 plus training about <training> kcal a day` (training from the engine, whole number)
   - `direction: <lose|maintain|gain>`
3. Everything else in the context (DAILY TARGETS line, MEAL SLOTS, EATING PATTERN and the rest) is unchanged, and the DAILY TARGETS line keeps reflecting the engine (so with body fat or the detailed week the numbers already differ).
4. A stored legacy `person.sex` value is ignored: two profiles identical except for sex produce byte-identical context.
5. The Czech and English chat, photo and review prompts that already exist are not reworded; only this line changes (the context is English in both languages, as today).

## Acceptance rows (the supervisor turns these into hidden tests)
| situation | expected |
|---|---|
| Profile: age 30, height 170, weight 70, no body fat, periods skip, level 2, maintain | Line is exactly `PROFILE (no sex given; do not assume one): 30 years, 170 cm, 70 kg, activity level 2 of 4, direction: maintain` |
| Same with height empty | `... 30 years, height not given, 70 kg, ...` |
| Same with body fat 20 | `... 70 kg, 20 % body fat, activity level 2 of 4, ...` |
| Same with periods yes | `... 70 kg, has periods (iron need 16 mg), activity level 2 of 4, ...` |
| Same with periods no | No mention of periods or iron in the PROFILE line |
| Same with body fat 20 and periods yes | `... 70 kg, 20 % body fat, has periods (iron need 16 mg), activity level 2 of 4, ...` |
| Legacy profile with sex 'female' and otherwise identical to row 1 | Identical line to row 1 |
| Legacy profile with sex 'male' | Identical line to row 1 |
| Detailed week on, base 2, sessions 3, minutes 60, strength, always, weight 70 | `... daily life level 2 of 4 plus training about 68 kcal a day, direction: maintain` (only after activity-logic is merged) |
| Whole context for row 1 | Contains no "male", "female", "physiology" |
| No profile saved | Context still says the person has not filled in a profile yet, as today |
| Chat, photo and review calls in the browser tests (Claude mocked) | Requests still go out and answers still render; e2e_test.py and e2e_test_en.py pass |

## Not in scope
- Reworking the prompts for lower token use (idea 10 lean chat; Later list).
- Any screen (briefs profile-nosex, activity-detail).
- Reference values for iron or anything else (engine, already done).

## Data and texts
- Data format changes: none.
- User-facing texts: none (the context is machine text sent to Claude, English only, as today).

## Known constraints
- Files: the context builder in src/ai.js (the PROFILE line, one statement). Unit test: build the context for the rows above with a mocked profile in node:vm the way test/core.test.mjs loads files, or, if the builder cannot be loaded that way, a Playwright check that reads the request body sent to the mocked Claude endpoint. Supervisor decides.
- Worker: the task is one file and one small edit; give the exact current line and the exact new text.

## Open questions
- none
