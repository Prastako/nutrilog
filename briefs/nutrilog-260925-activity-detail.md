# nutrilog-260925-activity-detail: The Activity card on the Profile screen can switch to a detailed week (daily life level plus training) and shows what training adds
priority: 2   depends on: nutrilog-260924-activity-logic

## Why
Jan's idea 4: keep the four simple activity choices, add an advanced way to describe the week with training separately. The engine part is brief activity-logic; this brief is the screen. The screen and its texts were written yesterday and lost with the bridge drop; the texts are restated below.

## Behavior (what must be true when done)
1. The Activity card keeps its title and note. Below the four simple choices there is one switch row "Describe my week in detail (daily life and training separately)". Off by default and for every old profile.
2. Switch off: the four simple choices are shown as today. The detailed fields are not shown.
3. Switch on: the four simple choices disappear and the card shows, in this order: the note `ad_note`; the label `ad_base` with four choices `ad_b1` to `ad_b4` (default: first choice); a row with two number fields `ad_sessions` (whole number, 0 to 14) and `ad_minutes` (10 to 240); a drop-down `ad_type` with the eight training kinds in the order strength, heavy, cycling, cyclinghard, circuits, hiit, climbing, yoga (default strength); the label `ad_att` with three choices `aa_always`, `aa_usually`, `aa_sometimes` (default usually); the result line `ad_result` with the training kcal per day from the engine (whole number).
4. Switching on and off does not lose values: the simple level chosen before and the detailed fields typed before are both kept in the draft and saved; the switch decides which one the engine uses.
5. The result line updates while typing or choosing, without saving, using the current weight from the Basics card. With no weight it shows 0 kcal.
6. The macro split preview line and the meal kcal line on the same screen also update when any detailed field changes, since the calorie target changes.
7. Saving stores `person.activityDetail` with `on`, `base`, `sessions`, `minutes`, `type`, `attendance`; sessions, minutes and base are saved as numbers. Empty sessions saves as 0, empty minutes saves as 60. Values outside the ranges in rule 3 are refused with the missing/invalid toast naming the field and the range.
8. Today, Review and every other place that shows the calorie range show the range computed by the engine with the detailed week when it is on (no separate display logic).
9. The Claude context line "activity level N of 4" keeps working when the switch is off; when it is on it says the base level and the training kcal per day (exact wording is in brief ai-nosex; if that brief is merged first, this brief only has to keep it working, otherwise leave the line as it is).
10. English screen shows no Czech and the Czech screen no English (e2e_test_en.py "LEFTOVER CZECH: none"); the automatic accessibility check (axe-core, WCAG 2 A and AA) finds no new issues on the Profile screen with the switch on and off, light and dark.

## Acceptance rows (the supervisor turns these into hidden tests)
Weight 70 kg for all rows unless said otherwise.
| situation | expected |
|---|---|
| Fresh install, Profile, Activity card | Four simple choices visible; switch row visible and off; no detailed fields |
| Turn the switch on | Simple choices gone; note, daily life choices (first pressed), sessions, minutes, kind drop-down (Strength training selected), attendance (Usually pressed), result line "Training adds about 0 kcal a day on average." |
| Sessions 3, minutes 60, Strength training, Almost always | Result line shows 68 kcal, before saving |
| Same, change kind to Heavy lifting, hard effort | 135 kcal (exact 135.0) |
| Same as row 3, attendance Sometimes | 38 kcal (exact 37.5) |
| Sessions 2, minutes 60, Climbing, Usually | 72 kcal |
| Sessions 2, minutes 60, Yoga, Usually | 20 kcal (exact 19.5) |
| Weight cleared in Basics, detailed fields as row 3 | Result line 0 kcal |
| Row 3 typed, then macro split line | The kcal in the macro split line is higher than with the switch off at level 2 by about 68 kcal (base first choice equals level 1, so compare against level 1: higher by 68 within rounding to 10) |
| Turn the switch off after row 3 | Simple choices back, the level pressed is the one pressed before switching on |
| Turn it on again | Sessions 3, minutes 60, Strength training, Almost always still filled |
| Save with switch on, reload the app | Switch on, all detailed values restored, Today shows the range with training included |
| Save with switch on, sessions empty | Saved with sessions 0, result 0 kcal |
| Sessions 15 | Toast names "Training sessions a week" with range 0 to 14, nothing saved |
| Minutes 5 | Toast names "Minutes per session" with range 10 to 240, nothing saved |
| Old profile from 0.2.6 (activityLevel 3, no activityDetail) | Opens with switch off and level 3 pressed; saving without touching the card stores activityDetail off (or leaves it absent), and the calorie estimate uses level 3 |
| Czech mode, switch on | All labels and choices in Czech as listed below; no English words |
| e2e_test_en.py, e2e_test.py, e2e_test_supp.py, e2e_test_profile.py | Pass; e2e_test_profile.py extended with: switch on, fill row 3, check the result text, save, reload, check the values |

## Not in scope
- Engine numbers (brief activity-logic).
- Removing the four simple choices for good, or turning them into presets of the detailed model (the research suggested it; not now).
- A weight-trend correction of the target (research, later).
- Per-session logging or tracker input; the weekly plan is the starting estimate only (see Later list in the handoff).
- Any change to the Basics card, body fat, periods (brief profile-nosex).

## Data and texts
- Data format changes: none beyond brief activity-logic (`person.activityDetail`), which documents the field.
- User-facing texts (new keys, both tables of src/strings.js; the supervisor edits strings.js, not the worker):
  - `ad_toggle`: CS "Popsat týden podrobně (běžný den a trénink zvlášť)" / EN "Describe my week in detail (daily life and training separately)"
  - `ad_note`: CS "Jednoduché úrovně výše zahrnují trénink; tady se běžný den a trénink počítají zvlášť, takže vyberte úroveň běžného dne bez tréninku." / EN "The simple levels above include training; here daily life and training are counted separately, so pick the daily life level without training."
  - `ad_base`: CS "Běžný den bez tréninku" / EN "Daily life, without training"
  - `ad_b1`: CS "Převážně sedím (méně než asi 5 000 kroků denně)" / EN "Mostly sitting (under about 5,000 steps a day)"
  - `ad_b2`: CS "Sedím, ale docela dost chodím" / EN "Sitting, but I walk a fair bit"
  - `ad_b3`: CS "Velkou část dne jsem na nohou" / EN "On my feet much of the day"
  - `ad_b4`: CS "Fyzicky náročná práce" / EN "Physically hard work"
  - `ad_sessions`: CS "Tréninků týdně" / EN "Training sessions a week"
  - `ad_minutes`: CS "Minut na trénink" / EN "Minutes per session"
  - `ad_type`: CS "Hlavní druh tréninku" / EN "Main kind of training"
  - `at_strength`: CS "Silový trénink" / EN "Strength training"
  - `at_heavy`: CS "Těžké zvedání, vysoké úsilí" / EN "Heavy lifting, hard effort"
  - `at_cycling`: CS "Kolo, střední tempo" / EN "Cycling, moderate"
  - `at_cyclinghard`: CS "Kolo, ostře" / EN "Cycling, hard"
  - `at_circuits`: CS "Kruhový trénink" / EN "Circuit training"
  - `at_hiit`: CS "Intervalový trénink (HIIT)" / EN "Interval training (HIIT)"
  - `at_climbing`: CS "Lezení (bouldering nebo stěna)" / EN "Climbing (bouldering or wall)"
  - `at_yoga`: CS "Jóga" / EN "Yoga"
  - `ad_att`: CS "Jak často plán opravdu dodržím" / EN "How often the plan really happens"
  - `aa_always`: CS "Skoro vždy" / EN "Almost always"
  - `aa_usually`: CS "Většinou" / EN "Usually"
  - `aa_sometimes`: CS "Občas" / EN "Sometimes"
  - `ad_result`: CS "Trénink přidá v průměru asi {kcal} kcal denně." / EN "Training adds about {kcal} kcal a day on average."
  - Note for the e2e Czech detector: "HIIT" appears in both languages on purpose.

## Known constraints
- Files: the Activity card render, the preview update and the save in src/settings.js; the profile change handler in src/app.js (the switch and the base choice must update the draft and re-render the card, the number fields must save as numbers, the drop-down must bind like the other fields); src/strings.js (supervisor). Engine functions come from brief activity-logic (the training kcal function and the ACTIVITY multipliers).
- The switch row must be a real control that a screen reader announces as on or off (the other option rows in the app are radio-like; the supervisor decides the element, the accessibility check must stay clean).
- Worker: 64k context; src/settings.js and src/app.js need line numbers and ranges; split into a render task and a handler task if one task would touch both files plus tests.

## Open questions
- none
