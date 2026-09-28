# nutrilog-260928-sync-push-on-open: What you logged on one device is on the other device the next time you open it
priority: 2   depends on: none

## Pipeline
- Batch `defects-260928`. One worker task. No push, no rebuild until the batch ends.

## Why
Run 1 finding A2: changes are pushed only 5 seconds after they happen, or on "Sync now". Opening the app and returning to it only pull. Logging dinner on the phone and closing it within five seconds leaves dinner on the phone until the next edit there; the PC never sees it.

## Behavior (what must be true when done)
1. A sync run at app open, at return to the foreground and on "Sync now" does pull, then push when anything is pending. Pending means: at least one pushable record or recipe (the current push rules) has updatedAt equal to or newer than the last push time, or the last push time is empty.
2. The push filter compares with "equal or newer" (today: strictly newer), so a change made in the same second as the last pushed item is not lost. Re-sending an item the server already has is harmless (the server reports it as skipped).
3. When the page is being hidden (visibilitychange to hidden, or pagehide) and a debounced push is still waiting, the push runs at once with a request that survives page unload (fetch keepalive). The 5 second debounce after a change stays for normal use.
4. A push is never started while another push of the same profile is running on this device; a change during a running push schedules one more push after it.
5. Offline and revoked states behave as today (no requests; state shown on the Sync card).
6. After a successful push the last push time is the updatedAt of the newest item sent, as today.

## Acceptance rows (the supervisor turns these into hidden tests; fetch stubbed, timers faked)
| situation | expected |
|---|---|
| log a food entry, hide the page 1 s later | one push request with the entry, keepalive set |
| log a food entry, wait 5 s | one push (debounce), no second push on the next foreground |
| app open with lastPushAt older than a record's updatedAt | pull, then one push containing that record |
| app open with nothing pending | pull only, no push request |
| record updatedAt equal to lastPushAt to the second | included in the next push |
| Sync now with nothing pending | pull, then no push |
| change made while a push is in flight | a second push follows the first, containing the new change |
| offline at open | no requests, state offline |
| revoked key | no requests |

## Not in scope
- Conflict handling, tombstones for recipes (brief recipe-tombstones), the join flow.

## Data and texts
- Data format changes: none.
- User-facing texts: none.

## Known constraints
- Files: src/sync.js (syncRun, syncPush, scheduleSync), src/app.js (boot, visibilitychange, a pagehide listener). Read in ranges.

## Open questions
- none
