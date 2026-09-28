# nutrilog-260928-recipe-submit: A joined user sends a recipe as a link or text, and it appears in everyone's catalog after Claude converts it
priority: 2   depends on: nutrilog-260928-catalog-pull

## Why
Jan's idea for own recipes: a friend finds or writes a recipe, it goes through Claude so it matches the format and style of the rest, and it is added to the shared pool for everyone. The conversion runs on Jan's Val.Town with Jan's Anthropic key, never in the app, so friends need no key of their own.

## Behavior (what must be true when done)
1. When a sync key is stored, the Sync card shows a "Send a recipe" button (`rs_add`). Without a key the button is not shown. (Placement: see Open questions.)
2. The button opens a sheet (`rs_title`) with: a one-line field for a link (`rs_link`), a multi-line field for text (`rs_text`), the help line `rs_help`, and a Send button (`rs_send`).
3. Send is enabled when the link field holds a link starting with `http://` or `https://`, or the text field holds at least 80 characters after trimming, or both. A non-empty link that does not start with `http://` or `https://` shows `rs_bad_link` under the field and keeps Send disabled. Text over 20,000 characters shows `rs_too_long` and keeps Send disabled. While offline, Send is disabled and the sheet shows `rs_offline`.
4. Send calls `POST <sync url>/v1/submissions` with `{"url": <link or null>, "text": <trimmed text or null>}` and the sync key. On success the sheet closes, the toast `rs_sent` appears, and the new submission is shown at the top of the list in rule 5 with status pending. On HTTP 429 the sheet stays open with `rs_limit`. On any other failure the sheet stays open with `rs_err` and both fields keep their content.
5. Under the button the card shows the list "Recipes you sent" (`rs_list_h`): `GET /v1/submissions`, fetched when Settings opens and on Sync now, newest first, at most 50 rows. Empty list: `rs_list_empty`. Each row shows a label, the local date sent, and a status line:
   - label: the recipe title when the server gives one; otherwise the link's host name; otherwise the first 60 characters of the text followed by "…".
   - `pending`: `rs_st_pending`.
   - `published`: `rs_st_published`; tapping the row opens the recipe if it is in the local catalog.
   - `merged`: `rs_st_merged` with the existing recipe's title; tapping opens that recipe.
   - `duplicate`: `rs_st_duplicate` with the existing recipe's title; tapping opens that recipe.
   - `rejected`: `rs_st_rejected` with the reason text mapped from the reason code: `not_recipe` → `rs_r_not_recipe`, `unreadable_link` → `rs_r_unreadable`, `invalid` → `rs_r_invalid`, any other code → `rs_r_other`.
6. When a list fetch shows a submission as `published` or `merged` that was `pending` in the previous fetch, the app runs a catalog pull (catalog-pull rule 2) right away, even if the last one is less than 6 hours old.
7. Submissions are not app records: nothing is written to the `records` or `recipes` store when sending, and nothing about submissions goes into sync or backup. The only way a sent recipe reaches the device is the catalog pull.
8. A 401 on either endpoint is handled like sync-val rule 8.

## Acceptance rows (the supervisor turns these into hidden tests; the server is mocked with fetch stubs)
| situation | expected |
|---|---|
| no sync key | no Send a recipe button, no list |
| key stored, both fields empty | Send disabled |
| link "www.example.com/soup" | `rs_bad_link` shown, Send disabled |
| link "https://example.com/soup", text empty | Send enabled |
| text of 79 characters after trimming, no link | Send disabled |
| text of 80 characters, no link | Send enabled |
| text of 20,001 characters | `rs_too_long`, Send disabled |
| offline | Send disabled, `rs_offline` shown |
| Send with link and text, server 200 | POST body has both `url` and `text`; sheet closes; toast `rs_sent`; list shows the row with `rs_st_pending` |
| Send, server 429 `{"error":"limit","limit":30}` | sheet open, `rs_limit` with 30 |
| Send, server 500 | sheet open, `rs_err`, both fields unchanged |
| list row with title "Harira" and status published | label "Harira", status `rs_st_published` |
| list row without title, url "https://www.example.com/a/b" | label "www.example.com" |
| list row without title or url, text of 100 characters | label = first 60 characters + "…" |
| row status rejected, reason `unreadable_link` | `rs_st_rejected` with `rs_r_unreadable` |
| row status rejected, reason `something_new` | `rs_st_rejected` with `rs_r_other` |
| previous fetch pending, new fetch published | one catalog pull starts immediately |
| previous fetch published, new fetch published | no extra catalog pull |
| after a successful send | no new record in `records` or `recipes`; next sync push unchanged |
| 60 submissions on the server | list shows 50 rows |

## Server contract (Claude builds it on the val `jrajmont/nutrilog-sync`; the worker writes only the app side)
- `POST /v1/submissions` body `{"url": string|null, "text": string|null}` → 200 `{"ok":true,"submission":{"id":"s_...","status":"pending","createdAt":"<ISO>"}}`. 400 `{"ok":false,"error":"empty"|"bad url"|"too long"}`. 429 `{"ok":false,"error":"limit","limit":<n>}` when the profile has already sent `<n>` recipes this calendar month (UTC). Same authorization as `/v1/pull`.
- `GET /v1/submissions` → `{"ok":true,"items":[{"id","createdAt","status","url","textStart","title","recipeId","reason"}]}`, only the caller's own submissions, newest first, at most 50. `status` is one of `pending`, `published`, `merged`, `duplicate`, `rejected`. `textStart` is the first 60 characters of the text or null. `title` and `recipeId` are null until known. `reason` is a code, set only when rejected.
- Processing, for reference only (the worker does not build it): a scheduled run every 15 minutes reads each new link (the page's recipe markup when present, otherwise its text, at most 30,000 characters), sends link content and pasted text to Claude through the Message Batches API together with the catalog format, the style rules of the research corpus and the list of existing catalog titles, validates the answer with the same schema 2 checks as the corpus, retries once with the errors, then writes the recipe to the catalog with id `rcp-sub-<slug>-<4 characters>` and sets the status. The Batch API has no per-run time limit, so the free plan's 1-minute limit does not apply; results usually arrive within an hour [unverified]. The Anthropic key is the val's environment variable `ANTHROPIC_API_KEY`, never in code.

## Not in scope
- Editing or deleting a sent recipe from the app (Jan removes catalog recipes on the val's admin page).
- Photos with a submission.
- Showing who sent a recipe to other users.
- The catalog screen; the button moves there in the catalog screen brief.

## Data and texts
- Data format changes: none in the app (submissions live on the server only).
- User-facing texts, Czech / English:
  `rs_add` "Poslat recept" / "Send a recipe"
  `rs_title` "Nový recept do katalogu" / "New recipe for the catalog"
  `rs_link` "Odkaz na recept" / "Link to the recipe"
  `rs_text` "Text receptu" / "Recipe text"
  `rs_text_ph` "Vložte suroviny a postup, stačí i poznámky." / "Paste the ingredients and method; rough notes are fine."
  `rs_help` "Stačí odkaz, text, nebo obojí. Claude recept převede do jednotné podoby a přidá ho do katalogu pro všechny." / "A link, the text, or both. Claude converts the recipe to the common format and adds it to the catalog for everyone."
  `rs_send` "Odeslat" / "Send"
  `rs_bad_link` "Odkaz musí začínat http:// nebo https://" / "The link must start with http:// or https://"
  `rs_too_long` "Text je delší než 20 000 znaků." / "The text is longer than 20,000 characters."
  `rs_sent` "Recept odeslán. V katalogu se obvykle objeví do hodiny." / "Recipe sent. It usually appears in the catalog within an hour."
  `rs_offline` "Offline. Recept pošlete, až budete připojeni." / "Offline. Send the recipe once you are connected."
  `rs_limit` "Tento měsíc jste už poslali {n} receptů, víc nejde." / "You have already sent {n} recipes this month, which is the limit."
  `rs_err` "Odeslání selhalo: {msg}" / "Sending failed: {msg}"
  `rs_list_h` "Poslané recepty" / "Recipes you sent"
  `rs_list_empty` "Zatím jste neposlali žádný recept." / "You have not sent any recipes yet."
  `rs_st_pending` "Zpracovává se" / "Being processed"
  `rs_st_published` "V katalogu" / "In the catalog"
  `rs_st_merged` "Přidáno jako varianta receptu {title}" / "Added as a variation of {title}"
  `rs_st_duplicate` "V katalogu už je: {title}" / "Already in the catalog: {title}"
  `rs_st_rejected` "Nepřidáno: {reason}" / "Not added: {reason}"
  `rs_r_not_recipe` "nevypadá to jako recept." / "this does not look like a recipe."
  `rs_r_unreadable` "odkaz nešel přečíst, vložte text receptu." / "the link could not be read, paste the recipe text instead."
  `rs_r_invalid` "recept se nepodařilo převést." / "the recipe could not be converted."
  `rs_r_other` "neznámý důvod." / "unknown reason."

## Known constraints
- Files: supervisor decides; suggested a new `src/submit.js` after `src/catalog.js`, and the button and list in the Sync card in `src/settings.js`.
- Tests: `node --test` with `fetch` stubbed; `navigator.onLine` faked.

## Open questions
None of these block the work; the supervisor proceeds with the proposal unless Jan changes it.
- Placement: proposed in the Sync card until the catalog screen exists.
- Monthly limit per profile: proposed 30, Jan's own profile included. Cost estimate 0.01 to 0.03 USD per recipe, halved by the Batch API [unverified].
- A sent recipe that is the same dish as an existing catalog recipe: proposed to add it to the existing recipe's `variations[]` (status `merged`) instead of creating a second record, following Jan's no-duplicates rule. An identical link already in the catalog gets status `duplicate`.
