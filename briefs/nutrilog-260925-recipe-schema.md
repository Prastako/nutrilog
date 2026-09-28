# nutrilog-260925-recipe-schema: One recipe record resolves to the user's diet, servings and session changes; allergens and nutrition follow the resolved ingredients
priority: 1   depends on: none

## Why
The recipe catalog is about to grow from a few starter recipes to hundreds. Jan does not want one recipe multiplied into diet copies: a Thai curry is one record that opens as vegan, vegetarian, pescatarian or omnivore, at the servings chosen, with the swaps agreed in the chat for this cooking session. Everything downstream (catalog filters, shopping list, cook mode, logging) reads the resolved recipe, so the data contract and the resolver come first; the screens come in later briefs.

## Behavior (what must be true when done)
1. Recipe schema 2 extends schema 1 (docs/DATA_FORMAT.md section 5). New fields, all optional so schema 1 records still load:
   - `written`: the diet axis the ingredient list is written for: `omnivore`, `pescatarian`, `vegetarian` or `vegan`. Missing reads as `omnivore`.
   - every ingredient gets `slot` (string, unique in the recipe; missing reads as `i<index>` counted from 0), `role` (`protein`, `starch`, `veg`, `fat`, `aromatic`, `liquid`, `sauce`, `season`, `garnish`, `other`; missing reads as `other`), `scale` (`linear` default; `step` with `per` = servings per unit, e.g. 1 egg per 2 servings; `fixed`), and `allergens[]` from the fixed list in rule 6 (missing reads as unknown, not as none).
   - `variants`: object keyed by axis (`omnivore`, `pescatarian`, `vegetarian`, `vegan`), each an override list (rule 3). An axis is supported when it equals `written` or has an entry in `variants`.
   - `flags`: object keyed by `gluten-free`, `lactose-free`, or `no:<allergen>` (rule 6), each an override list.
   - every step gets `uses[]` (slot ids) and may contain tokens `{slot}` in `text`; `timerSec` (integer) when the step has a timer. `minutes` stays as the estimated duration.
   - `storage` gains `freezerMonths` (integer or null), `batchServings` (integer or null) and `fresh[]` (slot ids to cook fresh when eating from the batch).
2. Resolution. `resolveRecipe(recipe, {axis, flags[], servings, personal[], session[]})` returns `{ingredients[], steps[], allergens[], nutrition, servings, adjusted}` and applies, in this order, each layer on the result of the previous: written ingredients; `variants[axis]` when `axis` differs from `written`; each active flag's overrides in the order `gluten-free`, `lactose-free`, then `no:<allergen>` alphabetically; servings scaling; `personal` overrides; `session` overrides. A later layer that touches a slot already changed by an earlier one wins. Nothing in the stored recipe is modified.
3. An override is `{slot, op, item, qty, unit, grams, foodRef, allergens[], prep, note, steps: {"<step index>": "<full replacement text>"}}` with `op` one of `replace` (same slot, new item and amounts), `remove`, `add` (new slot id, must not exist yet), `amount` (qty, unit, grams only). Fields not needed by the op are absent. `steps` replaces the text of the named steps; other steps keep their text.
4. Servings scaling: `linear` slots scale qty and grams by servings divided by the recipe's base servings, rounded to 1 decimal for qty under 10, to whole numbers otherwise; `step` slots use ceil(servings / per) units; `fixed` slots keep their amount. Tokens `{slot}` in step text render as `<item>, <qty> <unit>` at the current servings (`fixed` and `season` slots render as `<item>` only).
5. Availability. `recipeAvailability(recipe, profile)` returns `{axis, flags[], available, reason}`. Axis and flags come from the profile as in rule 7. `available` is false when the axis is unsupported (`reason: "axis"`), or when after resolving with the profile's flags any ingredient still carries an allergen the profile excludes (`reason: "allergen:<key>"`). Unknown allergens (field missing) never block; they are reported as `unknown` in the resolved `allergens`.
6. Allergen keys are the fixed list `gluten`, `crustacean`, `egg`, `fish`, `peanut`, `soy`, `milk`, `treenut`, `celery`, `mustard`, `sesame`, `sulphite`, `lupin`, `mollusc` (the EU 14). The resolved recipe's `allergens` is the union over its resolved ingredients, plus `unknown` when at least one ingredient has no `allergens` field. `gluten-free` counts as satisfied when no resolved ingredient carries `gluten`; `lactose-free` when none carries `milk` or the ingredient's `note` contains "lactose-free"; `no:<key>` when none carries `<key>`.
7. Profile mapping (profile.food, DATA_FORMAT section 3): pattern `everything`, `littlemeat` and `carnivore` map to axis `omnivore`; `pescatarian`, `vegetarian`, `vegan` map to the same name. Flags: condition `coeliac` or pref `avoidgluten` adds `gluten-free`; condition `lactose` or pref `lactosefreeproducts` adds `lactose-free`; every exclusion of type `allergy` whose `id` is an allergen key adds `no:<id>`; patternOpts `noEggs` adds `no:egg`, `noMilk` adds `no:milk`. Exclusions of type `refuse` and exclusions with other ids do not create flags in this brief (rule 5 still reports their allergen if it is on the fixed list).
8. Nutrition of the resolved recipe: `perServing` recomputed from the resolved ingredients' grams and their per-100 g data (foodRef lookup as the app already does for entries), with `coverage` = share of kcal from ingredients that have nutrient data; `basis: "computed"` when coverage is 1, `"estimated"` when it is between 0 and 1, and the stored `nutrition.perServing` returned unchanged with `basis: "stored"` when no resolved ingredient has data. Values stated by the author stay in `nutrition.stated`, untouched.
9. Categories for the catalog are derived, not stored: `meal-prep` when tag `prep:meal-prep` is present or `storage.fridgeDays` is at least 3; `quick` when `time.totalMin` is at most 30; `breakfast` and `snack` from tags `meal:breakfast` and `meal:snack`. `fullMeal` is true when the resolved per-serving values reach the thresholds in Open questions.
10. New record types in the envelope of DATA_FORMAT section 2, both shared, both in backup and sync:
    - `cooking_session`: `recipeId`, `axis`, `flags[]`, `servings`, `session[]` (overrides), `startedAt`, `finishedAt` (null while cooking), `loggedServings` (integer, starts at 0). Finishing a recipe sets `finishedAt` and nothing else; no food entry is written.
    - `recipe_overlay`: `recipeId`, `label`, `overrides[]`. At most one per recipe per profile; saving again replaces it.
    - `shopping_item` is reserved here (name, qty, unit, grams, section, sources[], done) and defined in the shopping list brief.
11. `nextCookedSuggestion(records, today)` returns the most recent `cooking_session` with `finishedAt` set, `loggedServings` lower than `servings`, and `finishedAt` within the last 5 days, together with its resolved per-serving nutrition; otherwise null. Logging one serving from it increments `loggedServings` and writes a normal `food_entry` with `source.kind: "recipe"` and `source.ref: "recipe:<id>"`.
12. Loading: a schema 1 recipe passes through `upgradeRecipe()` once on read and behaves as schema 2 with the defaults above; the stored file is not rewritten by the app.

## Acceptance rows (the supervisor turns these into hidden tests)
| situation | expected |
|---|---|
| schema 1 starter recipe, resolve with axis omnivore, 1 serving | ingredients unchanged, slots `i0`, `i1`, ...; `allergens` contains `unknown` |
| recipe written vegetarian with variants.omnivore [replace tofu by chicken thigh 300 g], axis omnivore | protein slot shows chicken thigh 300 g; the other slots unchanged |
| same recipe, axis pescatarian, no variants.pescatarian | availability `available: false, reason: "axis"` |
| axis vegan, flags [gluten-free], both layers touch the sauce slot | the gluten-free override wins (soy sauce becomes tamari) |
| flags [gluten-free, no:soy], both touch the sauce slot | `no:soy` wins (applied later) |
| base 4 servings, request 2, linear slot 400 ml coconut milk | 200 ml; grams halved |
| base 4 servings, request 3, step slot eggs per 2 | 2 eggs |
| request 6 servings, fixed slot "salt to taste" | amount unchanged |
| step text "Pour in {coconut}" at 2 servings | renders "Pour in coconut milk, 200 ml" |
| session override amount on a slot already replaced by a variant | session amount applies to the variant's item |
| session override steps {"5": "..."} | step 5 text replaced, others unchanged, `adjusted: true` |
| no session and no personal overrides | `adjusted: false` |
| ingredient with allergens [milk], flag lactose-free, no override | flag unsatisfied; availability false with reason `allergen:milk` |
| ingredient note "lactose-free milk", allergens [milk], flag lactose-free | satisfied |
| profile pattern littlemeat | axis omnivore |
| profile condition coeliac and exclusion {id: "peanut", type: allergy} | flags [gluten-free, no:peanut] |
| profile exclusion type refuse, id "peanut" | no flag; resolved allergens still list peanut when present |
| all resolved ingredients have per-100 data | nutrition basis computed, coverage 1 |
| one of four ingredients lacks data | basis estimated, coverage between 0 and 1 |
| no ingredient has data | stored perServing returned, basis stored |
| recipe totalMin 25 | category quick |
| recipe storage fridgeDays 4, no prep tag | category meal-prep |
| cooking_session finished 2 days ago, servings 4, loggedServings 1 | suggestion returned |
| same session, loggedServings 4 | null |
| same session finished 6 days ago | null |
| log one serving from the suggestion | food_entry with source.kind recipe and ref `recipe:<id>`; loggedServings 2 |
| finish a cooking session | finishedAt set; no food_entry written |
| recipe_overlay saved twice for one recipe | one record, the second replaces the first |
| backup export | cooking_session and recipe_overlay records included; sync payload includes them for a joined profile |

## Not in scope
- Any screen: catalog filters, recipe view, cook mode, the chat drawer, the shopping list and the Log suggestion card are later briefs that call these functions.
- The shopping list merge rules and the store-section classifier (next brief).
- Rewriting `data/recipes-starter.json` to schema 2 (supervisor sets `written` per starter recipe by hand; see Known constraints).
- Reel archive import changes (the research and import pipeline will write schema 2 directly).

## Data and texts
- Data format changes: recipe schema 2 as in rules 1 and 3, all new fields optional with the defaults stated; new record types `cooking_session` and `recipe_overlay` (rule 10); `shopping_item` reserved. `docs/DATA_FORMAT.md` gets a section for schema 2 written by the supervisor from this brief.
- Migration: none stored; `upgradeRecipe()` at read time (rule 12).
- User-facing texts: none (no screens in this brief).

## Known constraints
- Files: supervisor decides; the resolver and availability logic belong with the other pure functions so `node --test` can load them with node:vm like `test/core.test.mjs`; `src/recipes.js` is over 300 lines, the worker must not read it whole.
- The worker must not edit `data/`; the supervisor sets `written` on each starter recipe by reading its ingredients (overnight oats is vegetarian, and so on) in a separate commit.
- The profile mapping in rule 7 reuses `impliedExclusions` where it already covers a case rather than duplicating the lists.
- Nutrient lookup by foodRef reuses whatever the add-food flow uses today; no new food data source.

## Open questions
- `fullMeal` thresholds per serving. Proposed: protein at least 25 g, fibre at least 7 g, kcal between 400 and 800. Jan confirms or changes the numbers before the category is shown anywhere.
- Whether `carnivore` profiles should see plant-protein variants at all (mapped to omnivore here, so they see the meat version of every recipe). Jan decides; no change needed if yes.
