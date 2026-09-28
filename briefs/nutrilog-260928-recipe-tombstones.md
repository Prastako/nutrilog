# nutrilog-260928-recipe-tombstones: Deleting your own or a Claude recipe removes it on every device of the profile
priority: 2   depends on: none

## Pipeline
- Batch `defects-260928` (see nutrilog-260928-axis-nesting for the batch rules). One worker task. No push, no rebuild until the batch ends.

## Why
Run 1 finding A1: deleting an own or Claude recipe removes the row from the device, so sync never sends a deletion; the recipe stays on the server and on every other device and comes back on the next join. Records already use tombstones (deleted: true); recipes do not.

## Behavior (what must be true when done)
1. Deleting a recipe with origin own or claude marks it deleted: true and sets updatedAt to now; the row stays in the recipes store. Nothing else about the row changes.
2. Recipe lists, search, suggestions, the recipe detail, the AI recipe index and the archive count in Settings never show or count a deleted recipe. Opening a deleted recipe by id (for example from an old chat card) shows the existing "recipe missing" text.
3. Sync push sends own and claude recipes with deleted: true like any other pushable change (updatedAt newer than the last push). A pulled item for the recipes store with deleted: true is stored as a tombstone (deleted: true, updatedAt from the item), whatever the local origin, except that a local record with origin catalog, starter or archive is never changed by a pulled recipe item.
4. Export and backup files contain no deleted recipes. Importing a file that contains deleted recipes keeps them as tombstones.
5. Saving a new recipe never reuses an id (ids are ULIDs; unchanged). Saving a Claude recipe from chat after a deletion creates a new id.
6. Deleting starter, archive or catalog recipes is not possible from the app (as today: the Delete button exists only for own and claude).
7. Joining another profile (syncJoin with a different key) clears own and claude recipes including tombstones, as it clears records today.

## Acceptance rows (the supervisor turns these into hidden tests)
| situation | expected |
|---|---|
| delete an own recipe | row remains with deleted true, updatedAt now; not in RECIPES.list; not on All recipes; detail by id shows the missing text |
| delete, then sync push | push payload contains the recipe with deleted true |
| pull item recipes/deleted true for a local own recipe | local row becomes a tombstone; list no longer shows it |
| pull item recipes/deleted true for an id with local origin catalog | local row unchanged |
| pull a live item for an id that is a local tombstone with an older updatedAt | row restored (deleted false) with the item body |
| export after a deletion | file has no recipe with that id |
| import a file with a tombstone | tombstone stored, list does not show it |
| Settings archive card counts | deleted recipes not counted |
| chat show_recipe with a deleted id | tool result "No recipe with that id." |
| suggestions after deletion | recipe absent |
| join another profile | own and claude rows including tombstones removed; catalog and starter kept |

## Not in scope
- Deleting catalog recipes (admin page on the val).
- Undo.

## Data and texts
- Data format changes: recipe records may carry deleted: true and are then tombstones like records (DATA_FORMAT.md section 5 note). No migration.
- User-facing texts: none.

## Known constraints
- Files: src/app.js (recipe-del action), src/recipes.js (loadRecipes, saveRecipe, recipeIndexForAi), src/sync.js (syncPushable, syncApplyItem), src/backup.js (buildPayload, applyPayload), src/settings.js (counts), tests. Read in ranges by grep.

## Open questions
- none
