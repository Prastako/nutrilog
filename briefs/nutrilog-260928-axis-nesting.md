# nutrilog-260928-axis-nesting: A recipe written for a stricter diet is available to every less strict profile (vegan recipes show for vegetarians, pescatarians and omnivores)
priority: 1   depends on: none

## Pipeline
- Commit the current state of projects\nutrilog first. Work on an integration branch `defects-260928` created from main (62773f9); merge every task of this batch there. Do not push, do not rebuild index.html until the last brief of the batch (nutrilog-260928-tag-wrap) is merged; then one rebuild as 0.2.8, run node --test, the five tools\e2e_test*.py scripts, supervisor\e2e\edge_check.py, quick_check.py and submit_smoke.py, and stop. Jan says when to push.
- Order inside the batch: this brief first, then recipe-resolve-ui, recipe-tombstones, sync-push-on-open, sync-join-reset, restore-merge, btn-corners, review-chart, tag-wrap.

## Why
Jan decided on 2026-09-26 that the diet axes nest: a vegan recipe suits a vegetarian, a pescatarian and an omnivore; a vegetarian recipe suits a pescatarian and an omnivore; a pescatarian recipe suits an omnivore. The app today (run 1 finding A5) treats a recipe as available only when its written axis equals the profile axis or it has a variant for exactly that axis, and the unit test asserts the opposite of the decision.

## Behavior (what must be true when done)
1. Axis rank: omnivore 3, pescatarian 2, vegetarian 1, vegan 0. A profile's axis is the one profileAxisFlags returns today (everything, littlemeat and carnivore read as omnivore).
2. A recipe's candidate versions are its written axis plus every axis that has an entry in its variants. The version shown to a profile is the candidate with the highest rank that is not above the profile's rank. When no candidate is at or below the profile's rank, the recipe is unavailable with reason "axis".
3. recipeAvailability returns the chosen version as `axis` (the version to resolve with), not the profile's axis, plus a new field `profileAxis` with the profile's own axis. Everything else it returns stays.
4. Flag checks (gluten-free, lactose-free, no:<key>) run on the chosen version, as today.
5. Overrides: an explicit `axis` passed to resolveRecipe still wins, so a person can view another version.
6. docs/DATA_FORMAT.md section 5 states the nesting rule in one sentence and the rank order.

## Acceptance rows (the supervisor turns these into hidden tests)
| situation | expected |
|---|---|
| recipe written vegan, no variants; profile omnivore | available, axis vegan, profileAxis omnivore |
| recipe written vegan, no variants; profile vegetarian | available, axis vegan |
| recipe written vegetarian, no variants; profile pescatarian | available, axis vegetarian |
| recipe written vegetarian, no variants; profile vegan | unavailable, reason axis |
| recipe written omnivore, variants {vegan}; profile vegetarian | available, axis vegan |
| recipe written omnivore, variants {vegetarian, vegan}; profile pescatarian | available, axis vegetarian |
| recipe written omnivore, variants {vegetarian, vegan}; profile omnivore | available, axis omnivore |
| recipe written pescatarian, variants {omnivore}; profile vegetarian | unavailable, reason axis |
| recipe written vegan, variants {omnivore}; profile pescatarian | available, axis vegan |
| profile pattern littlemeat, recipe written pescatarian | available, axis pescatarian |
| recipe without `written` (schema 1) ; profile vegan | unavailable, reason axis (missing written reads as omnivore, as today) |
| resolveRecipe called with axis "omnivore" on a recipe written vegan with an omnivore variant | omnivore overrides applied |
| existing test "vegetarian recipe not available for pescatarian profile" | rewritten to expect available with axis vegetarian |

## Not in scope
- How screens use the result (brief nutrilog-260928-recipe-resolve-ui).
- Flags, allergens, categories, fullMeal.

## Data and texts
- Data format changes: none in records. DATA_FORMAT.md section 5 gains the rule text.
- User-facing texts: none.

## Known constraints
- Files: src/recipeavail.js (recipeAvailability), test/recipeavail.test.mjs, docs/DATA_FORMAT.md. src/recipeschema.js unchanged.
- The worker has a 64k context: recipeavail.js is under 300 lines and may be read whole.

## Open questions
- none
