# nutrilog-260928-push: The live app at prastako.github.io/nutrilog runs build 0.2.8
priority: 1   depends on: BATCH defects-260928 (all 13 briefs merged, local commit 3bccbf0)

## Why
Run 3 (claude.ai Project NutriLog, doc claude/nutrilog-test-report-3-verify-2026-09-28.md) verified build 0.2.8 from branch defects-260928: all 13 briefs pass, no regression, no page error. Jan decided the push on 2026-09-28 in the NutriLog test chat ("followed up by a push if everything works fine"). This brief carries that decision; it is not the supervisor's own initiative.

## Pipeline
- Supervisor-only brief: no worker task, no code change, no rebuild. The supervisor runs the git steps itself.
- Every step must succeed before the next one; on any failure stop, change nothing else, and write the failing step and its output to the events log and to this brief's REPORT (rename the brief to .held).
- Never use force push, never rebase, never amend.

## Behavior (what must be true when done)
1. Working tree of C:\AI-Workspace\projects\nutrilog is clean before starting (git status shows nothing to commit, no untracked files under src, data, fonts, index.html, sw.js). If it is not clean: stop.
2. Branch defects-260928 points at 3bccbf0c76c1875b93563434c4f7d6c93e5bf8b8 and main points at 62773f9222131019476c8ce990fb8cbc9fe5afd5 before the merge. If either differs: stop.
3. index.html on defects-260928 contains VERSION 0.2.8 and sw.js contains nutrilog-shell-0.2.8. If not: stop.
4. main is updated by a fast-forward merge of defects-260928 (git merge --ff-only defects-260928 while on main). If the fast-forward is refused: stop.
5. origin/main receives main (git push origin main). If the push is refused: stop and report the message.
6. After the push, https://prastako.github.io/nutrilog/index.html served by GitHub Pages contains VERSION 0.2.8. GitHub Pages can take up to 10 minutes; check once a minute for at most 15 minutes. If it still shows 0.2.7 after 15 minutes: report it, do not push again.
7. Branch defects-260928 is kept (not deleted).
8. docs/HANDOFF.md is not edited by this brief.

## Acceptance rows (the supervisor checks these itself)
| situation | expected |
|---|---|
| git status before the merge | clean |
| git rev-parse defects-260928 main | 3bccbf0c76c1875b93563434c4f7d6c93e5bf8b8 and 62773f9222131019476c8ce990fb8cbc9fe5afd5 |
| git merge --ff-only defects-260928 on main | main at 3bccbf0, no merge commit |
| git push origin main | accepted; git rev-parse origin/main = 3bccbf0 |
| live index.html within 15 minutes | contains VERSION 0.2.8 |
| events log | one line "nutrilog-260928-push done: main 3bccbf0 pushed, live 0.2.8" or the failing step |

## Not in scope
- No changes to the val (jrajmont/nutrilog-sync).
- No new build, no version bump, no test run (all checks passed before commit 3bccbf0).
- No deletion of branches, no tags.
- The open items of run 2 (D5, D8, D13 to D18) and run 1 (A6, M1 to M15) stay as they are.

## Data and texts
- Data format changes: none
- User-facing texts: none

## Known constraints
- Files: none changed. Git only, in C:\AI-Workspace\projects\nutrilog.
- Credentials: use the git remote as configured on the PC; do not change the remote.

## Open questions
- none
