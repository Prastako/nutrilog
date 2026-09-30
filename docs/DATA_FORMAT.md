# NutriLog data format (schema 2)

This is the contract for anything that reads or writes NutriLog data: the app
itself, the backup file, the recipe archive, and later the workout app and the
shared platform. It is written so another app can read the data without
reading NutriLog's code.

## 1. Principles

- **One envelope for every record.** Every piece of personal data is a record
  with the same outer fields, whatever app wrote it.
- **Stable ids.** ULIDs (26 characters, time sortable) or fixed ids for
  singletons (`profile`). Ids never change, so records can be merged between
  devices and apps.
- **Units are fixed per field.** Nutrients use one fixed unit each (table in
  section 4). Body fields carry the unit in the name (`heightCm`, `kg`).
- **Dates are local calendar days** (`YYYY-MM-DD`), timestamps are ISO 8601
  with the local offset (`2026-09-21T14:03:11+02:00`).
- **Unknown is not zero.** A nutrient that is not known is `null` or absent,
  never `0`. Reviews measure how much of the energy has a known value
  ("coverage") before judging a nutrient.
- **Deletes are tombstones.** A deleted record keeps its id with
  `deleted: true`, so a sync can see that it was removed.
- **App settings are not data.** Look (`look`: ember, lichen or ash; default ash, a missing or unknown value reads as ash), theme, language, keys and backup settings live
  apart from records and are never shared. They travel in exports and backups as kv `prefs`.

## 2. The record envelope

| Field | Type | Meaning |
|---|---|---|
| `id` | string | ULID, or a fixed id for singletons |
| `type` | string | record type, see section 3 |
| `schema` | integer | version of this type's body, starts at 1 |
| `app` | string | app that created it, e.g. `nutrilog` |
| `createdAt` | ISO 8601 | first written |
| `updatedAt` | ISO 8601 | last written; the newer one wins in a merge |
| `deleted` | boolean | tombstone |
| `date` | `YYYY-MM-DD` | local day, only on dated records |

The body fields follow in the same object.

## 3. Record types

`shared` marks types meant to be read by other apps on the platform.

| type | shared | body |
|---|---|---|
| `profile` (id `profile`) | yes | `person` {sex (legacy, kept but not used since 0.2.6), age, ageRecordedOn, heightCm (null when not given), weightKg, bodyFatPct (3 to 60, or null when not given), periods yes/no/skip (default skip; a record without it reads as skip), activityLevel 1 to 4, activityDetail (optional, missing in older records) {on true/false (default false), base 1 to 4 (default 1), sessions per week (default 0), minutes per session (default 60), type strength/heavy/cycling/cyclinghard/circuits/hiit/climbing/yoga (default strength), attendance always/usually/sometimes (default usually)}}. When activityDetail.on is true, base replaces activityLevel and the training energy is added to the daily burn (computeTargets in src/core.js); `goals` {direction lose/maintain/gain, macroSplit {preset, proteinPct, fatPct, carbPct}, dietStyle[] and aims[] (legacy, kept but no longer shown since 0.2.6), focus[] (fibre, lesssugar, lesssalt, veg, heart, digestion, mediterranean), hints[] (energy, sleep, skin), focusNutrients[], notes, slots {breakfast, lunch, snack, dinner: percent}}; `food` {pattern everything/littlemeat/pescatarian/vegetarian/vegan/carnivore, patternOpts {noEggs, noMilk}, conditions[] (coeliac, lactose, kidney), rules[] (halal, kosher, nopork, nobeef, noalcohol), prefs[] (avoidgluten, lactosefreeproducts), exclusions[{id, label, type allergy/refuse, syn[]}], cuisines[], cuisineOther, dislikes}. The pattern, coeliac and the rules add hard exclusions that are computed, not stored (impliedExclusions in src/core.js). A profile without food.pattern is converted once on start (migrateDietV3); `kitchen` {timeWeekday 1 to 4, timeWeekend 1 to 4, equipment[], equipmentOther (text, at most 80 characters, "" when missing; only for the assistant), budget (retired in 0.3.1: not written for new profiles, never read; old records keep it), mealPrep {cookDaysPerWeek, batchServings}} |
| `body_weight` | yes | `date`, `kg`, `source` |
| `food_entry` | yes | `date`, `time` HH:MM, `slot` breakfast/lunch/snack/dinner, `name`, `source` {kind usda/off/custom/recipe/photo/estimate/manual, ref}, `amount` {qty, unit, grams, label}, `nutrients` {nutrient map, absolute for this entry}, `basis` database/label/estimate/manual |
| `supplement` | yes | `name`, `form`, `unitLabel`, `defaultUnits`, `perUnit` {nutrient map per unit}, `extra[]` {name, amount, unit} for non nutrients such as creatine, `schedule` {days[0 to 6, Sunday 0], time morning/noon/evening/any, optional `every` (2 = every other day) and `start` (YYYY-MM-DD first day of the cycle); when `every` is set it wins over `days`}, `active` |
| `supplement_intake` | yes | `date`, `time`, `supplementId`, `name`, `units`, `nutrients` (snapshot), `extra[]` |
| `food` | yes | your own food: `name`, `brand`, `barcode`, `per100` {nutrient map per 100 g}, `portions[]` {label, g}, `basis`, `source`, `ingredients`, `allergens[]` |
| `recipe_note` | yes | `recipeId`, `favorite`, `rating`, `notes`, `cookedDates[]` |
| `pantry_item` | yes | `name`, `have`, `toBuy` |
| `summary` | yes | `periodKey` (`week:2026-09-21` or `month:2026-09`), `date`, `mode`, `text`, `model` |
| `meal_plan` | yes | reserved for saved plans |
| `cooking_session` | yes | one cooking of a recipe: `recipeId`, `axis`, `flags[]`, `servings`, `session[]` (overrides, section 5 schema 2), `startedAt`, `finishedAt` (null while cooking), `loggedServings` (starts at 0). Finishing sets `finishedAt` only; logging a serving writes a normal `food_entry` with `source` {kind recipe, ref `recipe:<id>`} and raises `loggedServings` |
| `recipe_overlay` | yes | saved personal changes to one recipe: `recipeId`, `label`, `overrides[]`; at most one per recipe, saving again replaces it |
| `shopping_item` | yes | reserved for the shopping list (name, qty, unit, grams, section, sources[], done) |
| `chat_message` | no | `thread`, `role` user/assistant/note, `text`, `cards[]` |
| `photo_eval` | no | `date`, `hint`, `result` (Claude's evaluation), `warnings[]` |

`source.ref` points at where the numbers came from: `usda:<fdc id>`,
`off:<barcode>`, `food:<record id>`, `recipe:<recipe id>`.

## 4. Nutrients

Keys used everywhere in the data, the matching INFOODS tagname (FAO/INFOODS,
the international standard for food component identifiers) and the fixed unit.

| key | INFOODS | unit | | key | INFOODS | unit |
|---|---|---|---|---|---|---|
| kcal | ENERC_KCAL | kcal | | na | NA | mg |
| prot | PROCNT | g | | k | K | mg |
| fat | FAT | g | | ca | CA | mg |
| carb | CHOCDF | g | | mg | MG | mg |
| fib | FIBTG | g | | p | P | mg |
| sug | SUGAR | g | | fe | FE | mg |
| sfa | FASAT | g | | zn | ZN | mg |
| mufa | FAMS | g | | cu | CU | mg |
| pufa | FAPU | g | | mn | MN | mg |
| trans | FATRN | g | | se | SE | µg |
| ala | F18D3N3 | g | | iod | ID | µg |
| epa | F20D5N3 | g | | vita | VITA_RAE | µg |
| dha | F22D6N3 | g | | vitd | VITD | µg |
| chol | CHOLE | mg | | vite | TOCPHA | mg |
| alc | ALC | g | | vitk | VITK1 | µg |
| caff | CAFFN | mg | | vitc | VITC | mg |
| | | | | b1 | THIA | mg |
| | | | | b2 | RIBF | mg |
| | | | | b3 | NIA | mg |
| | | | | b5 | PANTAC | mg |
| | | | | b6 | VITB6A | mg |
| | | | | biot | BIOT | µg |
| | | | | fol | FOLDFE | µg |
| | | | | b12 | VITB12 | µg |
| | | | | choline | CHOLN | mg |

Reference values in the review: EFSA Dietary Reference Values for adults
(sex specific where EFSA differs), WHO for saturated fat. They are computed in
`referenceValues()` in `src/core.js`.

## 5. Recipe record

Recipes live in their own store because most of them are reference data from
the archive, not personal data. Your own and Claude recipes are included in
the backup; archive, starter and catalog recipes are not (they live in the
archive, in `data/recipes-starter.json` or in the shared catalog on the sync server).

```json
{
  "id": "rcp-<slug>-<first reel code>",
  "type": "recipe", "schema": 1,
  "origin": "archive | starter | catalog | claude | own",
  "archive": "reel-recipe-atlas",
  "lang": "en",
  "title": "High protein creamy Tuscan chicken meal prep",
  "titleEn": "High protein creamy Tuscan chicken meal prep",
  "titleCs": "Krémové toskánské kuře s rýží",
  "summary": "one or two sentences",
  "servings": 4,
  "time": {"prepMin": 10, "cookMin": 15, "totalMin": 25},
  "difficulty": "easy | medium | hard",
  "ingredients": [
    {"group": "Creamy sauce", "item": "low-fat milk", "en": "milk lowfat 1%",
     "qty": 350, "unit": "ml", "grams": 360, "prep": null, "optional": false,
     "note": null, "foodRef": "usda:170872"}
  ],
  "steps": [{"text": "…", "minutes": 4}],
  "tips": [{"text": "…", "from": ["ig:CsohRnHoFvl"]}],
  "variations": [{"label": "…", "text": "…", "from": ["ig:…"]}],
  "storage": {"fridgeDays": 4, "freezer": true, "reheat": "…"},
  "nutrition": {
    "perServing": {"kcal": 612, "prot": 53.7, "...": "full nutrient map"},
    "basis": "computed | estimated | stated | label | none",
    "confidence": "low | medium | high",
    "source": "USDA FoodData Central SR Legacy",
    "stated": {"perServing": {"kcal": 502, "prot": 49}, "includes": "with rice"}
  },
  "tags": ["meal:lunch", "prep:meal-prep", "ing:chicken", "diet:high-protein"],
  "sources": [{
    "platform": "instagram", "id": "ig:CsohRnHoFvl", "shortcode": "CsohRnHoFvl",
    "url": "https://www.instagram.com/reel/CsohRnHoFvl/",
    "author": "jalalsamfit", "postedAt": "2023-05-24", "durationSec": 36.7,
    "caption": "original caption",
    "files": {"info": "originals/CsohRnHoFvl.info.json", "thumb": "originals/CsohRnHoFvl.jpg",
              "frames": "originals/CsohRnHoFvl.frames.jpg", "extraction": "extracted/CsohRnHoFvl.json"}
  }],
  "extraction": {"at": "…", "by": "claude", "inputs": ["caption", "transcript", "frames"],
                 "confidence": "high", "gaps": ["…"], "pipeline": "reels/1"},
  "thumb": "thumbs/<id>.webp"
}
```

**Tags** are one flat list of `namespace:value` strings, deliberately generous
so they can be pruned later: `meal` (breakfast, lunch, snack, dinner), `prep`
(meal-prep, freezer-friendly, one-pot, one-pan, no-cook), `time` (under-15,
under-30, under-60, over-60), `diet`, `ing` (main ingredients), `cuisine`,
`method`, `equip`, `flavor`, `course`, `nutri`, `dish`, `budget`, `season`.

**Several reels, one recipe.** When several reels show the same dish, the
record lists all of them in `sources`; `variations` and `tips` keep a `from`
list so every idea stays attributed to the reel it came from.

**Nutrition** is computed from the USDA database by the grams of each
ingredient (`foodRef` records the match). Values stated by the author are kept
in `nutrition.stated`, never mixed into `perServing`.

### Schema 2 (one record, every diet)

A schema 2 recipe is one record that resolves to the cook's diet, servings and
changes (src/recipeschema.js). All new fields are optional; a schema 1 record
passes through `upgradeRecipe()` once on read and gets the defaults below. The
stored file is never rewritten by the app.

- `written`: the diet the ingredient list is written for: `omnivore`,
  `pescatarian`, `vegetarian` or `vegan` (missing reads as `omnivore`).
- Each ingredient: `slot` (unique id, missing reads as `i<index>`), `role`
  (protein, starch, veg, fat, aromatic, liquid, sauce, season, garnish, other;
  missing reads as other), `scale` (`linear` default; `step` with `per` =
  servings per unit; `fixed`) and `allergens[]` from the EU 14 keys `gluten`,
  `crustacean`, `egg`, `fish`, `peanut`, `soy`, `milk`, `treenut`, `celery`,
  `mustard`, `sesame`, `sulphite`, `lupin`, `mollusc`. A missing `allergens`
  field means unknown, not none.
  Optional `name`: the cook-facing ingredient name; without it the app
  derives one from `item` (for example "spices, cinnamon, stick" reads Cinnamon).
- `variants`: {axis: overrides[]}; the versions of a recipe are `written` plus
  every axis with an entry here. Diet axes nest (rank omnivore 3, pescatarian 2,
  vegetarian 1, vegan 0): a profile gets the version with the highest rank not
  above its own rank; with none at or below it the recipe is unavailable.
  `flags`: {`gluten-free` | `lactose-free` |
  `no:<allergen>`: overrides[]}.
- Each step: `uses[]` (slot ids), `{slot}` tokens in `text`, optional
  `timerSec`. `storage` adds `freezerMonths`, `batchServings`, `fresh[]`.
- Override: {`slot`, `op` replace | remove | add | amount, `item`, `qty`,
  `unit`, `grams`, `foodRef`, `allergens[]`, `prep`, `note`, `steps`:
  {"<step index>": "<full text>"}}.
  An override of kind replace, remove or amount whose slot is absent is skipped whole, including its steps.

Resolution order: written ingredients, `variants[axis]`, flags (gluten-free,
lactose-free, then `no:<key>` alphabetically), servings scaling (linear by
servings / base, rounded to 1 decimal under 10, else whole; step =
ceil(servings / per); fixed unchanged), personal overrides, session overrides.
A later layer wins. Nutrition is recomputed from the resolved grams where
per-100 g data exists: `basis` computed (all grams covered), estimated (part),
or stored (none); `coverage` is the share of grams with data.

Profile mapping (src/recipeavail.js): patterns everything, littlemeat and
carnivore read as omnivore; coeliac or avoidgluten adds `gluten-free`; lactose
or lactosefreeproducts adds `lactose-free`; allergy exclusions add `no:<key>`
(app ids crustaceans, nuts, sulphites, molluscs map to crustacean, treenut,
sulphite, mollusc); noEggs and noMilk add `no:egg` and `no:milk`. Categories
are derived: `meal-prep` (tag `prep:meal-prep` or fridgeDays at least 3),
`quick` (totalMin at most 30), `breakfast`, `snack`; `fullMeal` per serving
means protein at least 25 g, fibre at least 7 g and 400 to 800 kcal.

**Catalog recipes** (`origin: "catalog"`, ids `rcp-res-*` and `rcp-sub-*`) come
from the shared catalog on the sync server (`GET /v1/catalog?after=<cursor>`,
src/catalog.js). They are reference data: never pushed by sync, never in the
backup, never changed by the app. The pull state is kept in
`meta.catalog` {`cursor`, `lastOkAt`, `count`, `lastError`}.

## 6. Side by side with the workout archive

The workout archive (Reel Movement Atlas) and the recipe archive (Reel Recipe
Atlas) share everything except the domain body:

| shared part | recipe | exercise (proposed) |
|---|---|---|
| envelope `id`, `type`, `schema`, `archive`, `lang`, `title`, `titleEn`, `summary` | `type: recipe` | `type: exercise` |
| `sources[]` with the same fields and `files` paths | same | same |
| `tags[]` as `namespace:value` | meal, ing, prep… | muscle, equipment, pattern… |
| `extraction` block | same | same |
| `thumb` | same | same |
| domain body | ingredients, steps, nutrition… | cues, sets and reps, muscles… |

Drive layout, one folder per archive, same inside:

```
Reel Movement Atlas/        Reel Recipe Atlas/
  originals/                  originals/      <code>.info.json, .jpg, .frames.jpg (stills only, no video)
                              extracted/      <code>.json, one extraction per reel
                              records/        index.json (all recipe records), README.md
```

## 7. Files

**Backup and export** (`nutrilog-YYYY-MM-DD.json`, and `latest.json` plus
`snapshots/` in the private backup repository):

```json
{"app": "nutrilog", "schema": 2, "appVersion": "0.2.0", "exportedAt": "…",
 "recordTypes": {…}, "nutrients": [{"key": "kcal", "infoods": "ENERC_KCAL", "unit": "kcal"}],
 "data": {"kv": [{"key": "prefs", "value": {…}}], "records": [...], "recipes": [...own and Claude recipes]}}
```

Never contains API keys. A schema 1 file (v0.1) is still accepted and
converted on import.

**Recipe archive for the app**: `archive/recipes/index.json` and
`archive/recipes/thumbs/<id>.webp` in the private data repository (the same
repository as the backup). Shape: `{"archive", "schema", "generatedAt", "count", "recipes": [...]}`.
The same `index.json` is also kept on Google Drive in `Reel Recipe Atlas/records/`.
