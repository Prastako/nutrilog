# nutrilog-260928-restore-merge: Importing a file or restoring a snapshot while joined merges with the profile instead of silently splitting the two sides
priority: 3   depends on: nutrilog-260928-sync-push-on-open

## Pipeline
- Batch `defects-260928`. One worker task. No push, no rebuild until the batch ends.

## Why
Run 1 finding A4: import, local snapshot restore and cloud restore replace the device's records with the file's records and keep the sync cursor and last push time; records from the file older than the last push are never pushed and the server's newer copies never overwrite them, so the device and the server diverge until each record is edited. Jan plans to remove the GitHub cloud backup later; import and local snapshots stay.

## Behavior (what must be true when done)
1. When a restore (import from file, local snapshot, or cloud restore while it still exists) is applied on a device that is joined to a profile: after the records and recipes are written, the sync cursor is set to 0 and the last push time to empty, then one sync run (pull, then push) starts at once.
2. Result of that run: for every record id present on both sides, the copy with the newer updatedAt wins on both sides (the server keeps its copy when updatedAt is equal); records only in the file are pushed; records only on the server are pulled.
3. On a device that is not joined, restore behaves as today.
4. The restore confirmation sheet, when joined, adds one line b_restore_merge_note under the existing warning.
5. After the run, the Sync card shows the normal state line; on failure, the error state as for any sync run, and the next sync retries from cursor 0 with an empty last push time (nothing is lost, only delayed).

## Acceptance rows (the supervisor turns these into hidden tests; fetch stubbed)
| situation | expected |
|---|---|
| joined; server has entry E (updatedAt 12:00); file has E (updatedAt 11:00); import | after the run the device shows the 12:00 version; push did not overwrite the server copy (server reports skipped) |
| joined; file has entry F absent on the server | F pushed |
| joined; server has entry G absent in the file | G pulled and shown |
| joined; file has E newer than the server's | pushed; device keeps the file version |
| not joined; import | records replaced; no sync request |
| joined; local snapshot restore | same as import |
| joined; import, pull fails with HTTP 500 | records from the file kept; cursor 0; last push empty; state error; next Sync now performs pull then push |
| confirmation sheet while joined | contains the merge note text |

## Not in scope
- Removing the GitHub backup (later brief).
- Recipes with deleted true (brief recipe-tombstones) beyond passing through the same merge.

## Data and texts
- Data format changes: none.
- User-facing texts, Czech / English:
  b_restore_merge_note "Zařízení je připojené k profilu: po obnovení se data sloučí s profilem, novější záznam vyhrává." / "This device is joined to a profile: after the restore the data is merged with the profile, the newer record wins."

## Known constraints
- Files: src/backup.js (restoreFromPayload, applyPayload), src/sync.js (a function that resets the cursor and last push time and starts a run), src/strings.js by grep.

## Open questions
- none
