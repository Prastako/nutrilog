# nutrilog-260928-recipe-resolve-ui: Catalog recipes read like recipes: steps name the ingredients with their amounts, the version matches the profile's diet, "to taste" instead of 0
priority: 1   depends on: nutrilog-260928-axis-nesting

## Pipeline
- Same batch and branch as nutrilog-260928-axis-nesting (`defects-260928`), merge after it. Likely three worker tasks: (a) display name and resolved rendering on the recipe detail, (b) cards, suggestions, log sheet and "What am I missing", (c) exclusion warning from allergens and the version picker. No push, no rebuild until the batch ends.

## Why
Run 1 blocker B1 and run 2 defect D3: all 133 catalog recipes render raw `{slot}` tokens in their steps ("Taste the broth and season it with {palmsugar}, {fishsauce} and {soysauce}"), fixed amounts show as "0 to taste", diet variants and flags are ignored, and ingredient names are USDA database strings ("beverages, water, tap, drinking"). The resolver (resolveRecipe, recipeAvailability) exists and is tested but no screen calls it.

## Behavior (what must be true when done)
1. Every place that shows a recipe's ingredients or steps shows the resolved recipe: the recipe detail, the "Log a serving" sheet (per-serving figures), "What am I missing?", the inline recipe in AI drafts, and the text used for exclusion checks. Resolution uses the version chosen by recipeAvailability (brief axis-nesting), the profile's flags from profileAxisFlags, and the servings chosen on the screen. Schema 1 recipes (starter, own, claude) pass through unchanged in content.
2. Display name of an ingredient, used wherever an ingredient is shown to a person (ingredient list, step text, "What am I missing", pantry names written from a recipe): the ingredient's `name` field when present and non-empty; otherwise derived from `item` by this rule, then the first letter upper-cased:
   - split `item` on ", " into segments; segment 1 is the head;
   - if the head is one of DROP = [beverages, spices, soup, herbs, seasoning, sweets, snacks, baked products, cereals, vegetables, fruit, fruits, legumes, dairy, restaurant, fast foods, meals, babyfood, infant formula]: the name is segment 2;
   - else if the head is one of SUFFIX = [sauce, oil, cheese, beans, nuts, seeds, peppers, mushrooms, lentils, noodles, flour, vinegar, milk, yogurt, cream, butter, sugar, rice, pasta, bread, crackers, juice, tea, coffee, stock, broth]: the name is segment 2 followed by a space and the head;
   - else if the head is one of MEAT = [beef, pork, chicken, lamb, turkey, veal, duck, goose, game meat, fish, salmon, tuna, cod, shrimp, crustaceans, mollusks]: the name is segment 1 and segment 2 joined with a comma and a space;
   - else the name is segment 1;
   - when the chosen segment does not exist, fall back to segment 1; when `item` has no comma, the name is `item`.
   Qualifier words are removed from the chosen segment when they stand alone as a whole word at its end: raw, dry, dried, canned, fresh, frozen, cooked, ground, whole, drained, ready-to-serve, ready to serve.
3. Step text: every `{slot}` token becomes the display name followed by the amount in parentheses: "<name> (<qty> <unit>)", qty formatted like the ingredient list (fmtQty), unit as stored; for an ingredient with scale "fixed", role "season", qty 0 or qty null, the token becomes the display name alone. An unknown slot becomes an empty string (as today). A step's stored minutes are shown as today.
4. Ingredient list: amount column shows fmtQty(qty) and unit; for scale "fixed", qty 0 or qty null it shows the text rc_to_taste; the item column shows the display name, then prep in small text, then "(optional)" as today. Group headings stay.
5. Servings stepper scales through resolveRecipe (linear by factor, step by ceil(servings / per), fixed unchanged), replacing the current multiplication of every qty. The per-serving nutrition block stays as stored.
6. Version picker on the recipe detail, above the ingredients: a text picker (open-edge rule 7 style) with one item per candidate version (the written axis plus every variants key), labelled ax_omnivore, ax_pescatarian, ax_vegetarian, ax_vegan, ordered omnivore, pescatarian, vegetarian, vegan; the item selected by default is the version recipeAvailability chose; tapping another re-renders the detail with that version for this visit only (nothing stored). Shown only when the recipe has at least two candidate versions. Under it, when the chosen version applied at least one flag from the profile, one line rc_flags_applied listing the flags by their labels (fl_gluten_free, fl_lactose_free, fl_no with the allergen label).
7. Exclusion warning and availability for schema 2 recipes: when every resolved ingredient carries an `allergens` array, the warning is built from allergens against the profile: allergen keys the profile excludes (the no:<key> flags, plus gluten when the profile has gluten-free, plus milk when lactose-free) list the ingredient display names that carry them; the word-based exclusionHits does not run on those recipes. When at least one ingredient lacks `allergens`, the word-based check runs on the display names of the ingredients without allergens, in addition. Schema 1 recipes keep today's word-based check. Pattern exclusions (meat, fish, eggs, milk, honey from the eating pattern) are already covered by the chosen version; they do not produce warnings on a schema 2 recipe.
8. A recipe unavailable for the profile axis (reason axis): hidden from Suggestions and from the Ideas card on Today; listed in All recipes with the tag text rc_axis_none instead of the "Excluded" tag; its detail opens on the written version with a notice rc_axis_none_note at the top. Recipes with an allergen hit keep the "Excluded" tag and stay out of Suggestions as today.
9. Recipe cards (list, suggestions, ideas, review) show the per-serving kcal and protein as stored, unchanged.
10. Nutrition basis text: the basis value "stored" shows rc_nut_basis_stored (missing string today).
11. Czech and English: the display names stay English (recipes are English by decision); labels and the new texts follow the app language.

## Acceptance rows (the supervisor turns these into hidden tests; use the catalog records rcp-res-beef-pho and rcp-res-pozole-rojo from the val, or copies in the test fixtures)
| situation | expected |
|---|---|
| Beef pho detail, profile everything | step 1 reads "Pour Beef broth or bouillon (1,000 ml) and Water (500 ml) into a large saucepan." |
| Beef pho, ingredient "spices, cinnamon, stick" | list shows "1 pcs" and "Cinnamon" |
| Beef pho, ingredient "beverages, water, tap, drinking" | "Water" |
| Beef pho, ingredient "sauce, fish, ready-to-serve" | "Fish sauce" |
| Beef pho, ingredient "beef, top sirloin, steak, separable lean only, ..." | "Beef, top sirloin" |
| Beef pho, ingredient "rice noodles, dry" | "Rice noodles" |
| ingredient with name "Palm sugar" and item "palm sugar" | "Palm sugar" (name wins) |
| Pozole rojo, ingredient "spices, oregano, dried" with scale fixed and qty 0 | amount column "to taste", not "0"; step 10 shows "Oregano" without parentheses |
| Beef pho, profile vegan | detail opens on the vegan version: stock replaced by vegetable broth, Shiitake added, tofu instead of beef, step 1 text from the vegan override; picker shows Omnivore and Vegan with Vegan selected |
| Beef pho, profile vegan, tap Omnivore in the picker | detail shows the beef version; reopening the recipe shows the vegan version again |
| Beef pho, profile coeliac | flags line "Gluten-free version"; soy sauce row shows tamari; no exclusion warning |
| Beef pho, profile with fish allergy, everything | warning lists "Fish sauce"; card carries the Excluded tag; not in Suggestions |
| Beef pho, profile vegetarian (no vegetarian variant, vegan variant exists) | available, vegan version shown, no warning |
| a recipe written pescatarian with no variants, profile vegetarian | All recipes card tag "Not for your diet"; absent from Suggestions and Ideas; detail shows the notice and the written version |
| Beef pho, servings stepper from 2 to 4 | beef 450 g, noodles 400 g, lime 2 pcs; a step-scaled ingredient with per 2 and qty 1 becomes 2 |
| Log a serving from Beef pho, profile vegan | the logged entry name is the recipe title; per-serving kcal as stored |
| starter recipe Overnight oats | renders exactly as before this brief (ingredient names, steps, servings scaling) |
| own recipe with a step containing "{" in free text | text shown unchanged |
| basis "stored" | text "Nutrition as stored with the recipe" |
| Czech app language, Beef pho | ingredient names English, "dle chuti" for fixed amounts, picker labels Czech |

## Not in scope
- Overview / Ingredients / Cook mode screens, per-step timers, session chat, saved personal changes, cooking sessions, shopping list (later briefs).
- Recomputing nutrition from ingredient grams (foodRef is null in the catalog).
- Adding a `name` field to the catalog records on the val (Claude does it server side, separately).

## Data and texts
- Data format changes: recipe ingredients may carry an optional `name` (string, cook-facing); documented in DATA_FORMAT.md section 5 as optional, no migration. No new record fields otherwise.
- User-facing texts, Czech / English:
  rc_to_taste "dle chuti" / "to taste"
  rc_version "Verze" / "Version"
  ax_omnivore "S masem" / "Omnivore"
  ax_pescatarian "S rybami" / "Pescatarian"
  ax_vegetarian "Vegetariánská" / "Vegetarian"
  ax_vegan "Veganská" / "Vegan"
  rc_flags_applied "Upraveno: {list}" / "Adjusted: {list}"
  fl_gluten_free "bez lepku" / "gluten-free"
  fl_lactose_free "bez laktózy" / "lactose-free"
  fl_no "bez: {a}" / "without {a}"
  rc_axis_none "Není pro vaši stravu" / "Not for your diet"
  rc_axis_none_note "Tento recept nemá verzi pro vaši stravu. Zobrazena je původní verze." / "This recipe has no version for your diet. The original version is shown."
  rc_nut_basis_stored "Výživové hodnoty uložené s receptem" / "Nutrition as stored with the recipe"

## Known constraints
- Files: src/recipes.js (renderRecipe, recipeCard, recipeText, recipeExclusions, recipeLogSheet, recipeMissing, recipeInline, suggestFor), src/log.js (renderNextMeal uses suggestFor), src/recipeschema.js (token rendering in resolveRecipe: change the rendered form there, keep applyOverrides), src/recipeavail.js, src/strings.js (grep, never read), tests. recipes.js is over 600 lines: the worker reads it in ranges by grep.
- The display-name rule lives in one function used by every screen; the acceptance names above must come out of it exactly.
- Keep the schema 1 rendering path byte-identical in output for the 12 starter recipes (the supervisor can diff renderRecipe output before and after).

## Open questions
- none
