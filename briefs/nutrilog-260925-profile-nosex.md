# nutrilog-260925-profile-nosex: The Profile screen has no sex setting; height is optional; body fat % can be given; the periods question sits in Fine-tune
priority: 1   depends on: none

## Why
Jan: no gender or sex setting in the app; what the app used sex for is gathered another way. The calorie engine already works without sex (task nosex, 0.2.6) and the texts exist in both languages; the screen still shows and requires Male/Female and requires height. This brief finishes the screen. The screen version of this work was lost yesterday when the bridge dropped; this brief restates it.

## Behavior (what must be true when done)
1. The Basics card on the Profile screen shows no sex choice and no sex note. Order in the card: age, height, weight on one row; body fat % below with its note; the energy note at the bottom of the card.
2. Height is optional: its label reads "Height (cm, optional)" in English and "Výška (cm, nepovinné)" in Czech. Saving with an empty height works. When given, it must be 100 to 250 as today.
3. Body fat % is an optional number field (label `p_bf`, note `p_bf_note` under it), decimal input, step 0.5. Empty is allowed and saved as empty. When given, it must be 3 to 60; outside that range the save is refused with the missing/invalid toast naming the field and the range, like the other fields.
4. The periods question (`p_periods` with the three choices `p_periods_yes`, `p_periods_no`, `p_periods_skip`, and `p_periods_note` under them) is the first block inside the closed Fine-tune section (before Health focus). Default choice when nothing is stored: "Prefer not to say". It is not shown anywhere else.
5. Saving stores `person.bodyFatPct` (number or null) and `person.periods` ('yes', 'no' or 'skip'). Age and weight stay required. A stored `person.sex` from an older profile is left in the record as it is and never shown or used.
6. The "Missing: ..." toast never lists sex or height any more. It lists age when empty, weight when empty, and body fat when out of range.
7. The live preview lines on the Profile screen (macro split line, meal kcal line) update when body fat is typed or cleared, since body fat changes the calorie estimate.
8. Effects already in the engine become visible: with body fat 3 to 60 the estimate uses the lean-mass equation; without height it uses the weight-only estimate with a wider range; with periods "No" the iron reference value in Review is 11 mg, otherwise 16 mg.
9. An old profile (with sex, without bodyFatPct and periods) opens without error, shows the new layout, and saves without the user touching the new fields (body fat empty, periods "Prefer not to say").
10. No Czech text on the English screen and no English text on the Czech screen (e2e_test_en.py "LEFTOVER CZECH: none").

## Acceptance rows (the supervisor turns these into hidden tests)
| situation | expected |
|---|---|
| Open Profile, fresh English install | Basics card has Age, Height (cm, optional), Current weight, Body fat % (optional) with its note, energy note; no "Sex", "Male", "Female" anywhere on the screen |
| Open Profile in Czech | Same fields with Czech labels: Věk, Výška (cm, nepovinné), Současná váha, Tělesný tuk % (nepovinné); no "Pohlaví", "Muž", "Žena" |
| Fine-tune section closed | Periods question not visible |
| Open Fine-tune | First block is "Do you have periods?" with Yes / No / Prefer not to say, "Prefer not to say" pressed by default, note text under it |
| Age 30, weight 70, height empty, save | Saved; Today shows a calorie range; profile record has heightCm null |
| Age empty, save | Toast "Missing: Age" (English), nothing saved |
| Body fat 2, save | Toast names Body fat % with range 3 to 60, nothing saved |
| Body fat 61, save | Same refusal |
| Body fat 20, height 170, age 30, weight 70, save | Saved; bodyFatPct 20 stored; calorie estimate uses lean mass (engine method 'leanmass') |
| Body fat cleared later, save | bodyFatPct null; estimate goes back to the height-based one |
| Typing body fat 20 with the macro split line visible | The kcal number in the macro split line changes while typing, without saving |
| Periods "No", save | person.periods 'no'; Review shows iron reference 11 mg |
| Periods "Yes", save | 'yes'; iron reference 16 mg |
| Periods untouched, save | 'skip' stored; iron reference 16 mg |
| Profile saved by 0.2.5 with sex 'female', height 165, no bodyFatPct, no periods | Opens without error; sex not shown; save works; the record still contains sex 'female' unchanged |
| e2e_test_en.py on a fresh install | LEFTOVER CZECH: none, no page errors |
| e2e_test.py (Czech mode and v0.1 migration) | Passes; if it selected a sex before, it no longer needs to |
| e2e_test_profile.py | Passes |

## Not in scope
- The activity card and the detailed week (briefs activity-logic and activity-detail).
- What Claude is told about the person (brief ai-nosex).
- The Fine-tune summary line text ("Fine-tune: health focus, preferences, notes") stays as it is.
- Removing `sex` from stored records or from docs/DATA_FORMAT.md history; only mark the field as "legacy, kept but not used since 0.2.6" in the profile row.
- Any new texts: every string this brief needs already exists in src/strings.js in both languages (see below).

## Data and texts
- Data format changes: `person.bodyFatPct` number or null (new, optional, 3 to 60); `person.periods` 'yes' | 'no' | 'skip' (new, default 'skip'); `person.heightCm` may now be null; `person.sex` legacy, kept, unused. Old records need no migration: missing fields read as empty and 'skip'. Update the profile row in docs/DATA_FORMAT.md.
- User-facing texts: none new. Existing keys to use (already in both tables of src/strings.js):
  - `p_optional`: CS "nepovinné" / EN "optional"
  - `p_bf`: CS "Tělesný tuk % (nepovinné)" / EN "Body fat % (optional)"
  - `p_bf_note`: CS "Pokud ho znáte (třeba z váhy s měřením složení těla), aplikace použije rovnici podle netukové hmoty, která pohlaví nepotřebuje." / EN "If you know it (for example from a body composition scale), the app uses an equation based on lean mass that does not need sex."
  - `p_periods`: CS "Máte menstruaci?" / EN "Do you have periods?"
  - `p_periods_yes`, `p_periods_no`, `p_periods_skip`: CS "Ano", "Ne", "Nechci uvádět" / EN "Yes", "No", "Prefer not to say"
  - `p_periods_note`: CS "Slouží jen pro cíl železa: 16 mg denně s menstruací, 11 mg bez ní. Nechci uvádět počítá s 16 mg." / EN "Only used for the iron target: 16 mg a day with periods, 11 mg without. Prefer not to say uses 16 mg."
  - `p_energy_note`: CS "Odhad kalorií používá váhu, věk a výšku (nebo tělesný tuk), bez nastavení pohlaví: bere střed mužské a ženské varianty rovnice a ukazuje rozpětí. Až budete pár týdnů zapisovat jídlo a váhu, aplikace ho upraví podle vašich vlastních čísel." / EN "Your calorie estimate uses weight, age and height (or body fat) and no sex setting: it takes the midpoint of the male and female versions of the equation and shows the range. Once you log food and weight for a few weeks, the app corrects it from your own numbers."
  - The keys `p_sex`, `p_male`, `p_female`, `p_sex_note` stay in the tables (unused) so nothing else breaks.

## Known constraints
- Files: the Profile screen render, its missing-field check and its save in src/settings.js; the blank profile defaults (person gets bodyFatPct null, periods 'skip'); the change handler in src/app.js only if a new field type needs it (the number fields and option rows should bind like the existing ones). docs/DATA_FORMAT.md profile row. No engine change (src/core.js already reads bodyFat and periods).
- Playwright tests that tick a sex option (tools/e2e_test.py, tools/e2e_test_profile.py, tools/e2e_test_en.py) must be updated in the same change, otherwise they fail on a missing element.
- Worker: 64k context; src/settings.js is over 300 lines, give line numbers and ranges; the strings need no edit.

## Open questions
- none
