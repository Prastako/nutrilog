# nutrilog-260928-sync-join-reset: Joining another profile by link shows only that profile's data, never the previous person's
priority: 2   depends on: none

## Pipeline
- Batch `defects-260928`. One worker task. No push, no rebuild until the batch ends.

## Why
Run 1 finding A3: joining a different profile clears the stored records but keeps the previous profile, recipe notes and screen state in memory; if the new profile is empty or the pull is slow, Today shows the previous person's targets and Save on Profile writes the previous person's profile into the new account. A sync run started with the old key keeps going after the key changes and can write the old account's cursor.

## Behavior (what must be true when done)
1. On join with a key different from the stored one: after the stores are cleared and before the first pull, the in-memory profile, profile draft, recipe notes, recipe list (own and claude removed, catalog and starter kept), log date, review anchor, suggestion date, chat thread and recipe filter are reset to their fresh-install values, and the current screen is re-rendered. Today shows the "no profile" card until the pull brings a profile.
2. On join with the same key as stored: nothing is cleared (as today), the "already joined" text shows.
3. Only one sync run at a time per device. A run started with key K discards everything it receives once the stored key is no longer K: it writes no records, no cursor, no state; the next run starts fresh with the new key and cursor 0.
4. A second sync request while a run is active is queued once and runs after the active run ends (with the then-current key).
5. Leaving the profile resets the same in-memory state as rule 1 and keeps local data on the device (as today).
6. The join confirmation sheet for a different key states that data on this device will be replaced (text sy_join_switch, unchanged).

## Acceptance rows (the supervisor turns these into hidden tests)
| situation | expected |
|---|---|
| device joined as A with a profile; join B whose account is empty | Today shows the "no profile" card; S.profile null; Profile screen opens blank; Save writes a fresh profile to B |
| join B while a pull for A is in flight (stubbed slow response) | A's items are not stored; sync cursor 0 for B; B's items stored after B's pull |
| join B; recipe notes of A | none shown on catalog recipes; RECIPES.notes empty |
| join the same key again | no clearing; toast "already" text |
| two sync runs triggered within 100 ms | one request sequence, the second run executes after the first |
| leave profile | in-memory state reset; records still present when the app restarts without a key |
| join B; Log date was set to yesterday under A | Log opens on today |

## Not in scope
- Merging data between profiles, push on open (brief sync-push-on-open).

## Data and texts
- Data format changes: none.
- User-facing texts: none new.

## Known constraints
- Files: src/sync.js (syncJoin, syncLeave, syncRun), src/core.js (S initial state, keep the defaults in one place so the reset uses them), src/recipes.js (loadRecipes). Read in ranges.

## Open questions
- none
