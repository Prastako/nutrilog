# Recipe reel extraction pipeline

Written for the overnight Claude sessions that build the recipe archive, and
for anyone checking how a recipe got into NutriLog.

## Overview

```
links  ->  fetch.py  ->  prepare.py  ->  extraction by Claude  ->  merge by Claude  ->  build_archive.py  ->  publish
(list)     (yt-dlp)      (transcript,     (one JSON per reel)       (same dish from      (records,            (data repo +
                          frames, thumb)                             several reels)        nutrition, thumbs)    Google Drive)
```

Everything runs in the cloud workspace. Instagram public reels download there
without a login. Work in `/home/claude/work/reels/` (raw, prepared, extracted,
merged, archive). The workspace is wiped between sessions, so each session
starts by restoring state from Google Drive (`extracted/` files are the
durable progress) and skips reels that already have an extraction.

## 1. Fetch

```
python3 tools/reels/fetch.py RAW links.txt [more link files]
```

Any file with reel links works: a pasted list, the Instagram data export of
saved posts, a browser extension export. It waits 4 to 9 seconds between
reels and stops by itself if Instagram asks for a login. Re-running resumes.

## 2. Prepare

```
pip install --break-system-packages -q yt-dlp faster-whisper
python3 tools/reels/prepare.py RAW PREPARED --model small
```

Per reel: `bundle.json` (caption, author, date, duration, transcript,
language), `frames.jpg` (8 frames on one sheet, for on-screen text such as
quantities), `thumb.webp`. About 10 seconds per reel on the workspace CPU.

## 3. Extraction (Claude, one reel at a time)

For each prepared reel without `EXTRACTED/<code>.json`:

1. Read `bundle.json`. Look at `frames.jpg` with the Read tool.
2. Decide whether it is a recipe. A reel that only shows a finished dish with
   no way to cook it, a restaurant review or a product ad is `isRecipe: false`
   with a one line `reason`.
3. Write `EXTRACTED/<code>.json` in exactly this shape (see the example in
   `tools/reels/example-extraction.json`):
   - `reel`, `isRecipe`, `dedupeKey` (English dish name, then the main
     ingredients: used to find the same dish in other reels)
   - `recipe`: all recipe text in English (Jan's decision): `title`,
     `titleCs` (Czech title, only for search in the Czech app), `lang: "en"`,
     `summary`, `servings`, `time` {prepMin, cookMin, totalMin}, `difficulty`,
     `ingredients[]` {group, item (as the recipe says it), `en` (a plain
     English food name for the USDA lookup, e.g. "cheese parmesan grated",
     "rice white long-grain cooked"), qty, unit (metric where the reel gives
     metric; keep tbsp, tsp, cup, pcs otherwise), `grams` (always estimate
     grams, including for cups and pieces), prep, optional, note},
     `steps[]` {text, minutes}, `tips[]` {text,
     from: ["ig:<code>"]}, `variations[]` {label, text, from}, `storage`
     {fridgeDays, freezer, reheat}, `nutrition.stated` (only if the reel
     states calories or macros: {perServing: {...}, includes}), `tags[]`
   - `extraction`: {inputs (which of caption, transcript, frames had
     content), confidence, gaps (what the reel did not say and you
     estimated), notesForMerge}
4. Faithfulness: take quantities from the caption, then on-screen text, then
   speech. Never invent an ingredient. When a quantity is missing, estimate it
   and list it under `gaps`. Keep the author's own tips.
5. Tags: be generous (10 to 25). Always include every fitting `meal:*`, the
   main `ing:*`, `time:*` from total time, `prep:meal-prep` when it keeps 3 or
   more days, `diet:*` that truly apply, `cuisine:*`, `method:*`, `equip:*`
   beyond a hob, `flavor:*`, and `dish:*` for the dish family.

Save each extraction to Google Drive `Reel Recipe Atlas/extracted/` right away
(text upload), so progress survives the session.

## 4. Merge (Claude)

List all `dedupeKey`s. Where two or more reels show the same dish (same core
technique and main ingredients; different amounts or extras are variations,
not different dishes), write `MERGED/<recipe-id>.json`:

```json
{"id": "rcp-<slug>-<first code>", "reels": ["<best reel first>", "..."],
 "recipe": { ...the most complete version as the base, variations and tips from
             the others with their "from" codes... },
 "extraction": {...}}
```

Record ids stay stable: once a recipe id exists in the published index, keep
it, even when more reels join it later.

## 5. Build

```
python3 tools/reels/build_archive.py PREPARED EXTRACTED MERGED ARCHIVE data/foods.json
```

Writes `ARCHIVE/index.json`, `ARCHIVE/thumbs/*.webp` and `ARCHIVE/report.json`.
Nutrition per serving is computed from the USDA database by ingredient grams.
Check `report.json` for ingredients with weak database matches and fix their
`en` names, then build again.

## 6. Publish

- Data repository (private, the same as the app backup):
  `archive/recipes/index.json` and `archive/recipes/thumbs/`. The app syncs
  from there once a day or with Settings, Recipe archive, Synchronise.
- Google Drive `Reel Recipe Atlas/records/index.json` (the master copy).
- Stills only, no videos (Jan's decision): `Reel Recipe Atlas/originals/`
  holds `<code>.info.json` (trimmed to caption, author, date, duration),
  `<code>.jpg` (cover) and `<code>.frames.jpg` (the 8 frame sheet). The
  `.mp4` files are deleted after preparing.

## 7. Report

End each run with a short report: reels fetched, prepared, extracted, not
recipes, merged groups, recipes published, failures to retry.
