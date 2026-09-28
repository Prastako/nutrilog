# nutrilog-260928-catalog-pull: Every joined profile gets the shared recipe catalog from Jan's Val.Town and keeps it offline
priority: 1   depends on: nutrilog-260925-sync-val, nutrilog-260925-recipe-schema

## Why
Jan wants one shared pool of recipes for himself and his friends, hosted on his Val.Town next to the sync store. The existing recipe archive lives in his private GitHub repository and needs a GitHub token, so friends can never read it. The 133-recipe research corpus is the first content of the new catalog; recipes that friends send in join the same pool later (brief nutrilog-260928-recipe-submit).

## Behavior (what must be true when done)
1. Catalog recipes are stored in the local `recipes` store with `origin: "catalog"`. They are reference data: never pushed by sync (the push rule of sync-val rule 6 excludes `catalog` exactly like `archive` and `starter`), never included in the backup export, never changed by the app.
2. Pull: `GET <sync url>/v1/catalog?after=<cursor>` with the stored sync key as `Authorization: Bearer <key>`. The cursor starts at 0. While the answer has `more: true`, the app calls again with `after` = the returned `seq`. Per item: `deleted: false` stores the body under its `id`, replacing any local record with that id whose origin is `catalog`; `deleted: true` removes the local record with that id if its origin is `catalog`. A record with another origin is never replaced or removed by a catalog pull.
3. The cursor is saved after each page is applied, never before. A failed page leaves the local catalog and the cursor as they were after the last applied page.
4. After the last page: `meta.catalog.lastOkAt` = now, `meta.catalog.count` = number of local records with origin `catalog`, `lastError` cleared.
5. When a pull runs: at app start and when the app returns to the foreground, but only if the last successful catalog pull is older than 6 hours or has never happened; and always when the user taps "Sync now" (`sy_now`). It runs only when a sync key is stored, after the sync pull has finished, never at the same time as it.
6. Offline (`navigator.onLine` false): no request, no error, nothing changes. HTTP 401: handled exactly like sync-val rule 8 (state `sy_revoked`, automatic sync and catalog pulls stop until the user joins again). Any other failure: `meta.catalog.lastError` = the message, shown as `ct_err`, retried at the next trigger in rule 5.
7. The Sync card shows one more line under its state line: `ct_line` with the count and the time of the last successful pull, `ct_none` before the first success, `ct_err` after a failure. Nothing else in Settings changes.
8. Leaving the profile keeps the local catalog records and the cursor (the catalog is the same for every profile). Joining another profile does not reset the cursor.
9. Catalog recipes appear wherever the app lists recipes from the `recipes` store today, with the same cards and filters. The "Show starter recipes" switch affects only `starter` recipes, not `catalog` ones.
10. The GitHub archive sync is untouched and keeps working for origin `archive`.

## Acceptance rows (the supervisor turns these into hidden tests; the server is mocked with fetch stubs)
| situation | expected |
|---|---|
| no sync key stored, app start | no request to `/v1/catalog`; Sync card shows no catalog line |
| key stored, first start, server returns 2 recipes, `more: false` | `GET /v1/catalog?after=0` once; 2 records with origin `catalog`; `ct_line` shows 2 |
| first page 100 items `more: true` seq 100, second page 33 items `more: false` seq 133 | two calls, second with `after=100`; 133 catalog records; cursor 133 |
| second page fails with HTTP 500 | 100 records kept, cursor 100, `ct_err` shown; next trigger calls `after=100` |
| item with `deleted: true` for a local catalog id | local record removed |
| item with `deleted: true` for an id whose local record is origin `own` | local record unchanged |
| item with an id already present as `catalog` | local record replaced by the new body |
| app returns to foreground 2 hours after a successful pull | no catalog request |
| app returns to foreground 7 hours after a successful pull | one catalog pull after the sync pull |
| user taps Sync now 5 minutes after a successful pull | catalog pull runs |
| device offline at start | no request, no error, `ct_line` unchanged |
| catalog answers 401 | state `sy_revoked`, no further sync or catalog requests until Join |
| sync push after a catalog pull | push payload contains no record with origin `catalog` |
| backup export after a catalog pull | export contains no record with origin `catalog` |
| leave the profile | catalog records and cursor kept |
| "Show starter recipes" switched off | starter recipes hidden, catalog recipes still listed |
| catalog body in schema 2 with `variants` | loads through `upgradeRecipe()` and resolves like any schema 2 recipe |

## Server contract (Claude builds it on the val `jrajmont/nutrilog-sync`; the worker writes only the app side)
- `GET /v1/catalog?after=<integer>` → `{"ok":true,"items":[{"id":"rcp-res-svickova","updatedAt":"<ISO>","deleted":false,"body":{...}}],"seq":<integer>,"more":false,"total":<integer>}`. At most 100 items per call, ordered by server sequence. `total` = number of live recipes in the catalog. Same authorization and same 401 answer as `/v1/pull`.
- `body` is a schema 2 recipe (docs/DATA_FORMAT.md section 5 plus the recipe-schema brief) with `type: "recipe"`, `schema: 2`, `origin: "catalog"`. Pipeline-only fields (`research`, `extraction`) are left out; `sources[]` keeps `platform`, `url`, `site` and `licence`.
- Every change to a catalog recipe (new, edited, removed) gets a new sequence number; removals are kept as tombstones so every device learns about them.
- Catalog ids start with `rcp-res-` (research corpus) or `rcp-sub-` (sent in by users), so they never collide with starter recipe ids.

## Not in scope
- Sending recipes to the catalog and the list of sent recipes (brief nutrilog-260928-recipe-submit).
- The catalog screen, filters and cook mode (later screen briefs).
- Removing or changing the GitHub archive sync.
- Loading the research corpus into the val (done by the chat on the server).

## Data and texts
- Data format changes: new meta `meta.catalog = {cursor: 0, lastOkAt: null, count: 0, lastError: ""}`. New recipe origin value `catalog` in docs/DATA_FORMAT.md section 5 (reference data, like `archive`). No migration.
- User-facing texts, Czech / English:
  `ct_line` "Katalog receptů: {n}, aktualizováno {when}" / "Recipe catalog: {n} recipes, updated {when}"
  `ct_none` "Katalog receptů se zatím nestáhl." / "The recipe catalog has not been downloaded yet."
  `ct_err` "Katalog se nepodařilo stáhnout: {msg}" / "Could not download the recipe catalog: {msg}"

## Known constraints
- Files: supervisor decides; suggested a new `src/catalog.js` in the build order after `src/sync.js`, and the extra line in the Sync card in `src/settings.js`. Plain script, shared globals, no modules. `src/recipes.js` is over 300 lines; the worker must not read it whole.
- Size: the 12 starter recipes (schema 1) measure 2.6 KB each without pipeline metadata. Schema 2 records with variants and flags are estimated at 5 to 9 KB each [unverified until the corpus is loaded], so 133 recipes are about 1 MB and a first pull takes 2 calls.
- Tests: `node --test` with `fetch` replaced by a stub that records calls and returns scripted answers; timers and `Date` faked.

## Open questions
- none
