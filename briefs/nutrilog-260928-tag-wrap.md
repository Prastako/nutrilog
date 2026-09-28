# nutrilog-260928-tag-wrap: Tag rows never start a line with a dot, every tag namespace has a label, and labels over inputs line up
priority: 4   depends on: none

## Pipeline
- Batch `defects-260928`, last brief of the batch: after merging it, rebuild index.html as 0.2.8 and run the full check set (see nutrilog-260928-axis-nesting). No push.

## Why
Run 2 defects D10, D11, D12 and run 1 M1 (D12 rule updated 2026-09-28 20:10 after the design session): tag rows wrap with the separator dot alone at the start of a line ("· Starter"); the tag browser shows raw namespace names for dish, budget and season and lowercase raw values next to translated ones, with "high fiber" and "High fibre" as two tags; labels of different heights over inputs of one height leave the inputs misaligned. The selected-state system is being settled in a separate design chat and is not part of this brief.

## Behavior (what must be true when done)
1. Tag rows (recipe cards, recipe detail, tag chips in the tag browser, the meta line "15 min · 264 kcal · P 8 g"): a separator is never the first or last visible character of a line. Each tag or meta item is one unbreakable unit; the separator belongs to the item before it (a non-breaking space glued to the dot) or is drawn between items in a flex row with gap. Items still wrap.
2. Tag labels: a tag value without a translation is shown with its first letter upper-cased and hyphens replaced by spaces (today: lowercase). Namespaces dish, budget and season get labels (tagns_dish, tagns_budget, tagns_season).
3. The tag diet:high-fiber shows the same label as diet:high-fibre ("High fibre" / "Hodně vlákniny") and the tag browser lists them as one entry whose count is the sum; filtering by it matches recipes with either spelling.
4. Inline field groups (two or three inputs side by side under labels, on Profile and in sheets): labels are short enough to stay on one line at 360 px in both languages, so the inputs of one group share one top edge. The unit or note that made a label long moves to a small hint line under the input (class `fhint`, 12 px, ink3). Concretely (decision Jan 2026-09-28, D12 option B): Basics gets "Age" with hint "years", "Height" with hint "cm, optional", "Weight" with hint "kg"; the meal split fields are the meal names alone ("Breakfast", "Lunch", "Snack", "Dinner", "Other") without " %", the existing note under the group already says they are percentages. Body fat keeps its label. The Theme and Language controls no longer wrap because nutrilog-260928-select-comet gives them natural widths; nothing to do here.
5. Nothing changes in selected states, chips with aria-pressed, segmented controls or fonts.

## Acceptance rows (the supervisor turns these into hidden tests; Playwright at 390 px)
| situation | expected |
|---|---|
| Today ideas card with tags Snack, Meal prep, No cook, Starter | when the row wraps, the second line starts with "Starter", never with "·" |
| recipe detail Beef pho tags | no line starts or ends with "·"; "southeast asian" shown as "Southeast asian"; "rice noodles" as "Rice noodles" |
| tag browser | headings for dish, budget and season are "Dish", "Budget", "Season" (Czech "Jídlo", "Rozpočet", "Sezóna"); one entry "High fibre" with count 9 (5 + 4 on the current catalog) |
| filter by High fibre | recipes tagged either spelling listed |
| Profile Basics group | labels read "Age", "Height", "Weight" (Czech "Věk", "Výška", "Váha") on one line each at 360 px; hints "years", "cm, optional", "kg" under the inputs; the three inputs have the same top offset |
| Profile meal split group | labels are the meal names without "%"; the inputs have the same top offset; the percent note under the group is still there |
| Profile, Czech, 360 px | no label in an inline group wraps; every input in a group shares its group's top offset |
| Czech, 360 px | no horizontal scroll; rule 1 holds |

## Not in scope
- Selected states, segmented control layout, fonts (design chat).
- Tag content on the val.

## Data and texts
- Data format changes: none.
- User-facing texts, Czech / English:
  tagns_dish "Jídlo" / "Dish"
  tagns_budget "Rozpočet" / "Budget"
  tagns_season "Sezóna" / "Season"
  tag_diet_high_fiber "Hodně vlákniny" / "High fibre" (same as the existing high-fibre label)
  p_weight_short "Váha" / "Weight" (label for the Basics field; the existing p_weight stays for its other uses)
  p_hint_height "cm, nepovinné" / "cm, optional"
  (hints "years" and "kg" reuse p_years and p_kg)

## Known constraints
- Files: src/recipes.js (recipeCard, tagLabel, openTagBrowser, recipeMatchesFilter), src/settings.js (the `num` field helper gains an optional hint argument; the Basics row about line 91 to 93 and the meal split row about line 166 use it), src/base.css or app.css (tag rows, the `.fhint` style), src/strings.js by grep.

## Open questions
- none
