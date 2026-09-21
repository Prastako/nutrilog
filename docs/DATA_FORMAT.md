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
- **App settings are not data.** Theme, language, keys and backup settings live
  apart from records and are never shared.

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
| `profile` (id `profile`) | yes | `person` {sex, age, ageRecordedOn, heightCm, weightKg, activityLevel 1 to 4}; `goals` {direction lose/maintain/gain, macroSplit {preset, proteinPct, fatPct, carbPct}, dietStyle[], aims[], focusNutrients[], notes, slots {breakfast, lunch, snack, dinner: percent}}; `food` {exclusions[{id, label, type allergy/refuse, syn[]}], cuisines[], cuisineOther, dislikes}; `kitchen` {timeWeekday 1 to 4, timeWeekend 1 to 4, equipment[], budget, mealPrep {cookDaysPerWeek, batchServings}} |
| `body_weight` | yes | `date`, `kg`, `source` |
| `food_entry` | yes | `date`, `time` HH:MM, `slot` breakfast/lunch/snack/dinner, `name`, `source` {kind usda/off/custom/recipe/photo/estimate/manual, ref}, `amount` {qty, unit, grams, label}, `nutrients` {nutrient map, absolute for this entry}, `basis` database/label/estimate/manual |
| `supplement` | yes | `name`, `form`, `unitLabel`, `defaultUnits`, `perUnit` {nutrient map per unit}, `extra[]` {name, amount, unit} for non nutrients such as creatine, `schedule` {days[0 to 6, Sunday 0], time morning/noon/evening/any}, `active` |
| `supplement_intake` | yes | `date`, `time`, `supplementId`, `name`, `units`, `nutrients` (snapshot), `extra[]` |
| `food` | yes | your own food: `name`, `brand`, `barcode`, `per100` {nutrient map per 100 g}, `portions[]` {label, g}, `basis`, `source`, `ingredients`, `allergens[]` |
| `recipe_note` | yes | `recipeId`, `favorite`, `rating`, `notes`, `cookedDates[]` |
| `pantry_item` | yes | `name`, `have`, `toBuy` |
| `summary` | yes | `periodKey` (`week:2026-09-21` or `month:2026-09`), `date`, `mode`, `text`, `model` |
| `meal_plan` | yes | reserved for saved plans |
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
the backup; archive recipes are not (they live in the archive).

```json
{
  "id": "rcp-<slug>-<first reel code>",
  "type": "recipe", "schema": 1,
  "origin": "archive | starter | claude | own",
  "archive": "reel-recipe-atlas",
  "lang": "cs",
  "title": "Krémové toskánské kuře s rýží (meal prep)",
  "titleEn": "High protein creamy Tuscan chicken meal prep",
  "summary": "one or two sentences",
  "servings": 4,
  "time": {"prepMin": 10, "cookMin": 15, "totalMin": 25},
  "difficulty": "easy | medium | hard",
  "ingredients": [
    {"group": "Krémová omáčka", "item": "nízkotučné mléko", "en": "milk lowfat 1%",
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
    "files": {"video": "originals/CsohRnHoFvl.mp4", "info": "originals/CsohRnHoFvl.info.json",
              "thumb": "originals/CsohRnHoFvl.jpg", "extraction": "extracted/CsohRnHoFvl.json"}
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
  originals/                  originals/      <code>.mp4, .info.json, .jpg (yt-dlp)
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
