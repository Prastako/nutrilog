# NutriLog

Personal nutrition diary: food and supplement logging, diet goals, meal
suggestions with full recipes, a recipe archive extracted from saved Instagram
reels, photo evaluation of meals and labels, chat with Claude, and weekly and
monthly reviews. Runs as an installable web app on Android (GitHub Pages).
The app is in English; Czech can be chosen in Settings, and every food in the
database has a Czech name too.

## Layout

| path | what |
|---|---|
| `index.html` | the app, built from `src/` (do not edit by hand) |
| `sw.js`, `manifest.webmanifest`, `icon-*.png` | install and offline support |
| `data/foods.json` | 3,840 generic foods with 38 nutrients, USDA FoodData Central SR Legacy (public domain), English and Czech names |
| `data/recipes-starter.json` | 12 starter recipes, nutrition computed from `foods.json` |
| `src/` | source: `core.js` (storage, records, nutrients, goal engine), `foods.js`, `ai.js`, `recipes.js`, `log.js`, `photo.js`, `chat.js`, `review.js`, `backup.js`, `settings.js`, `app.js`, `strings.js`, CSS |
| `tools/build.py` | builds `index.html` from `src/` and stamps the version into `sw.js` |
| `tools/e2e_test.py` | phone sized end to end test with Claude mocked (Czech mode, includes the v0.1 migration) |
| `tools/e2e_test_en.py` | English walk-through of every screen and sheet; lists any text still in Czech |
| `tools/fooddb/` | rebuilds `data/foods.json` and the starter recipes from the public USDA download (`sh tools/fooddb/build.sh`) |
| `tools/reels/` | recipe reel extraction pipeline, see `tools/reels/PIPELINE.md` |
| `docs/DATA_FORMAT.md` | the data contract: records, nutrients, recipe records, files |

## Build

```
python3 tools/build.py 0.2.3
```

Personal data stays on the phone (IndexedDB) with an automatic backup to a
private GitHub repository. API keys never leave the phone.
