# nutrilog-260925-sync-val: The app keeps one profile in sync across devices through Jan's Val.Town endpoint
priority: 1   depends on: none

## Why
Jan wants the same profile and diary on his phone and his PC, and later a few friends with profiles of their own. The GitHub backup stays as it is (backup and restore of a whole file). Sync is a second, independent channel: record by record, newest wins, through a small server (a val) that Claude builds and hosts on Jan's Val.Town account. Settings (look, theme, language, keys) are per device and never sync, as docs/DATA_FORMAT.md already says.

## Behavior (what must be true when done)
1. Settings gets a "Sync" card above the Backup card with: a state line (`sy_off`, `sy_on` with the profile name, `sy_err` with the last error), a "Join with a link" button (`sy_join`) that opens a sheet with one text field for a pasted link or key and a Confirm button, and a "Leave this profile" button (`sy_leave`, only when joined). Joining and leaving are the only ways in and out. (Showing the device's own link and QR is brief invite-links.)
2. A sync key is a secret like the API keys: stored with them, never in an export or backup, entered again on a new device. The server address is a constant `SYNC_URL` in the app with a text field under an "Advanced" disclosure in the Sync card to override it, saved with the other settings.
3. Joining: the app calls `GET /v1/me` with the key. On success it shows a confirmation sheet with the profile name. If this device already holds a different key, the sheet says the current profile will be left and its local data replaced. If this device holds records but no key yet, the sheet says the local data will be added to the profile. On Confirm: store the key, run a full pull (see 5), then a full push of everything local (see 6). If `/v1/me` fails, the key is not stored and the error is shown in the sheet.
4. Leaving: removes the key and the sync cursor. Local data stays on the device. Nothing is deleted on the server.
5. Pull: `GET /v1/pull?after=<cursor>` (cursor starts at 0; the server returns the new cursor and `more`; the app keeps calling while `more` is true). Each received item is applied to the matching local store (`records` or `recipes`): missing locally, stored; present with an older `updatedAt`, replaced; present with the same or newer `updatedAt`, ignored. Tombstones (`deleted: true`) are stored as tombstones, the same way the app already keeps them. Prefs and secrets are never touched by a pull. Screens on view re-render after a pull that changed anything.
6. Push: every record and every own or Claude recipe whose `updatedAt` is later than the stored `lastPushAt` is sent with `POST /v1/push` in batches of at most 200 items. After a batch is accepted, `lastPushAt` moves to the newest `updatedAt` in that batch. Archive recipes (origin `archive` or `starter`) are never pushed.
7. When sync runs: a pull at app start and every time the app returns to the foreground (visibility change), a pull followed by a push 5 seconds after the last local change (one timer, restarted by each change, like the backup's 45 second timer), and a pull plus push when the user taps "Sync now" (`sy_now`) in the Sync card. Sync never runs without a key. Offline: nothing is sent, no error is shown, the state line says `sy_offline`; the next foreground or change tries again.
8. Errors: a 401 from the server (revoked or unknown key) sets the state line to `sy_revoked` and stops automatic sync until the user joins again; any other failure is shown as `sy_err` with the message and does not stop later attempts. Sync failures never block using the app.
9. The backup bar that warns "you have data and no backup" treats a joined profile as a backup: it stays hidden when sync is on and the last successful sync is less than 24 hours old.
10. The Claude API key and the GitHub token are never sent to the sync server. The payload of a push contains only `store`, `id`, `updatedAt`, `deleted` and the record body.

## Server contract (the val; Claude builds and hosts it, the worker only writes the app side)
Base URL: `SYNC_URL` = `https://jrajmont--01a0d84f9098771d83cd77326fa78d80.web.val.run` (live, tested 2026-09-25), JSON everywhere, CORS open to any origin with the `Authorization` header allowed, request body at most 1 MB.
- Every `/v1/` call except admin needs `Authorization: Bearer <key>`. Unknown or revoked key: HTTP 401 `{"ok":false,"error":"unauthorized"}`.
- `GET /v1/me` → `{"ok":true,"user":{"id":"u_...","name":"Jan","createdAt":"..."},"now":"<ISO>"}`
- `GET /v1/pull?after=<integer>` → `{"ok":true,"items":[{"store":"records","id":"...","updatedAt":"<ISO>","deleted":false,"body":{...the whole record...}}],"seq":<integer>,"more":false}`; at most 500 items per call, ordered by server sequence; `seq` is the cursor to pass next time.
- `POST /v1/push` body `{"items":[{"store":"records"|"recipes","id":"...","updatedAt":"<ISO>","deleted":false,"body":{...}}]}` → `{"ok":true,"stored":<n>,"skipped":<n>,"seq":<integer>}`; per item the newer `updatedAt` wins, equal timestamps keep the server copy; at most 200 items per call.
- `GET /v1/me/qr` → an SVG image (`image/svg+xml`) of the join link for this key (used by brief invite-links).
- Admin (Claude and Jan only, header `X-Admin-Key`): `GET /v1/admin/users`, `POST /v1/admin/users {"name"}` → user plus key plus join link, `POST /v1/admin/users/<id>/rotate`, `POST /v1/admin/users/<id>/revoke`, `DELETE /v1/admin/users/<id>` (user and all their data). Admin page at `/admin`. Not used by the app.
- Join link shape: `<app URL>#join=<key>`. The app handles it in brief invite-links; this brief only needs the pasted key or link to be accepted in the Join sheet (a pasted link is reduced to the part after `#join=`).

## Acceptance rows (the supervisor turns these into hidden tests; the server is mocked with fetch stubs)
| situation | expected |
|---|---|
| fresh install, Settings | Sync card shows `sy_off`; Join button; no Leave button; no key stored |
| join with a valid key, `/v1/me` answers name "Jan" | confirmation sheet names Jan; after Confirm the key is stored, `/v1/pull?after=0` is called, then `/v1/push` with all local records |
| join with a key the server rejects (401) | key not stored, sheet shows the error, state stays `sy_off` |
| pull returns a record with a newer `updatedAt` than the local copy | local copy replaced, Today re-rendered |
| pull returns a record with an older `updatedAt` | local copy unchanged |
| pull returns a tombstone for a local food entry | entry disappears from the diary; the tombstone stays in the store |
| pull returns `more: true` then `more: false` | two pull calls, second with `after` = first `seq` |
| local food entry added while joined | one push 5 seconds after the change containing that entry only; `lastPushAt` updated |
| two changes 2 seconds apart | one push after the second change, containing both |
| 250 records changed since `lastPushAt` | two push calls, 200 then 50 |
| an archive recipe and an own recipe exist | push contains the own recipe only |
| device offline (navigator.onLine false) | no request sent, state line `sy_offline`, no error toast |
| server answers 401 during a routine pull | state line `sy_revoked`, timer stopped, no further requests until Join |
| export after joining | the export file contains no sync key |
| leave | key and cursor removed, local records still present, state `sy_off` |
| joined and last sync 1 hour ago, no GitHub backup configured | backup bar hidden |
| `updatedAt` values with different time zone offsets | comparison by instant, not by string |

## Not in scope
- Showing the device's own link and QR code, creating and revoking users (brief invite-links, plus the admin page on the val).
- Syncing settings, chat messages or photo evaluations (`chat_message` and `photo_eval` are marked not shared in DATA_FORMAT and are not pushed).
- Changing the GitHub backup.

## Data and texts
- New secret `sync` (the key), stored like the other secrets. New settings: `prefs.sync = {url: "" (empty means SYNC_URL)}`. New meta: `meta.sync = {cursor: 0, lastPushAt: null, lastOkAt: null, state: "off"|"ok"|"offline"|"error"|"revoked", lastError: ""}`.
- User-facing texts, Czech / English:
  `sy_title` "Synchronizace" / "Sync"
  `sy_off` "Nepřipojeno. Data jsou jen v tomto zařízení." / "Not joined. Data lives on this device only."
  `sy_on` "Profil {name}, poslední synchronizace {when}" / "Profile {name}, last sync {when}"
  `sy_offline` "Offline, synchronizace počká." / "Offline, sync will wait."
  `sy_err` "Synchronizace selhala: {msg}" / "Sync failed: {msg}"
  `sy_revoked` "Klíč už neplatí. Připojte se znovu odkazem." / "The key no longer works. Join again with a link."
  `sy_join` "Připojit se odkazem" / "Join with a link"
  `sy_join_ph` "Vložte odkaz nebo klíč" / "Paste the link or the key"
  `sy_join_confirm` "Připojit se k profilu {name}?" / "Join the profile {name}?"
  `sy_join_merge` "Data v tomto zařízení se přidají do profilu." / "The data on this device will be added to the profile."
  `sy_join_switch` "Opustíte současný profil a data v zařízení se nahradí." / "You will leave the current profile and the data on this device will be replaced."
  `sy_leave` "Opustit profil" / "Leave this profile"
  `sy_leave_note` "Data zůstanou v zařízení i na serveru." / "Data stays on this device and on the server."
  `sy_now` "Synchronizovat teď" / "Sync now"
  `sy_url` "Adresa serveru" / "Server address"
  `sy_advanced` "Pokročilé" / "Advanced"

## Known constraints
- Files: supervisor decides; suggested a new `src/sync.js` added to the build order after `backup.js`, and the Sync card in `src/settings.js`. Plain script, shared globals, no modules.
- The record stores already carry `updatedAt` and tombstones (docs/DATA_FORMAT.md section 2); no data format change.
- Tests: unit tests with `fetch` replaced by a stub that records calls and returns scripted answers; timers faked. `node --test` must pass.
- `SYNC_URL` in code is the live address above. Measured: a push of 200 records takes under 1 s, a pull of 200 records about 0.3 s; 200 typical food entries take about 90 KB on the server.

## Open questions
- none
