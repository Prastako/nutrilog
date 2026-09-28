# BATCH defects-260928
status: released
released: 2026-09-28 20:35 by the design chat (Jan)
project: nutrilog
branch: defects-260928 (from main 62773f9)
after the last brief: rebuild as 0.2.8 in a scratch clone, node --test, the five e2e scripts, edge_check, quick_check, submit_smoke, then stop; no push (Jan says when). This replaces the "last brief of the batch" line in nutrilog-260928-tag-wrap.
status after the last brief: all merged up to d080247; rebuilt 0.2.8, all checks pass, committed locally as 3bccbf0 (2026-09-28); not pushed.

## Order (merge in this order; dependencies in each brief)
1. nutrilog-260928-axis-nesting (done, 647d7ab)
2. nutrilog-260928-recipe-resolve-ui (queued)
3. nutrilog-260928-recipe-tombstones (queued)
4. nutrilog-260928-sync-push-on-open (queued)
5. nutrilog-260928-sync-join-reset (queued)
6. nutrilog-260928-restore-merge (after sync-push-on-open) (queued)
7. nutrilog-260928-btn-corners (queued 2026-09-28 20:09; superseded, see 8)
8. nutrilog-260928-btn-plain (supersedes 7: if 7 has not started, delete its task and skip it; if it ran, run 8 after it) (queued)
9. nutrilog-260928-review-chart (queued)
10. nutrilog-260928-tag-wrap (rule 4 updated 2026-09-28 20:13 before queueing) (queued)
11. nutrilog-260928-select-comet (queued)
12. nutrilog-260928-motion (after select-comet) (queued)
13. nutrilog-260928-type-sets (after select-comet; supervisor step first: extract the font files, see the brief) (queued)

## Notes
- Design decisions behind 8 and 11 to 13: claude.ai Project NutriLog, doc claude/nutrilog-design-session-2026-09-28.md.
- No brief for the text glow (unchanged by decision); D7 stays as accepted.
