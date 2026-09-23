# NutriLog working rules

Read `docs/HANDOFF.md` first: status, decisions, open questions.

- Never edit `index.html` by hand. Change `src/`, then build: `python3 tools/build.py <version>`.
- Before every PR run both tests and put their results in the PR description:
  - `python3 tools/e2e_test_en.py <repo_dir> <shots_dir>`
  - `python3 tools/e2e_test.py <v01_dir> <repo_dir> <shots_dir>` (v0.1 is commit 9448571)
  - Needs `pip install playwright==1.56.0` (matches the preinstalled Chromium).
- Before every PR update `docs/HANDOFF.md`: status, what changed, open questions.
- Claude merges PRs itself (Jan, 2026-09-22).
- No em dashes anywhere: code, docs, commits, PRs, chat.
- Jan cannot read code. Describe changes by what he will see in the app.
- When Jan must do something manually, give exact steps and the exact text to paste.
- Stop and ask before decisions that are hard to change; bring a testable version.

## Local worker (tasks from C:\AI-Workspace\work)
- These rules replace the PR, Playwright, build and HANDOFF rules above for you. You have no internet: do not build, do not run Python or Playwright, do not edit `docs/HANDOFF.md`, `index.html`, `sw.js` or `data/`.
- `src/*.js` are plain browser scripts sharing globals (no modules, no imports). Keep that style and change only what the task names.
- UI text lives in `src/strings.js`, which has a Czech table and an English table. Every new key goes into both. English text must not contain Czech words or accented letters.
- Unit tests: `node --test` (files `test/*.test.mjs`, node:test; load src files with node:vm as `test/core.test.mjs` does). They must pass before you finish.
- Your context is small (64k). Never read a whole file over 300 lines (`src/core.js`, `src/log.js`, `src/strings.js`, `src/settings.js`, `src/recipes.js`, `src/ai.js`). Use Grep to find the lines, then Read with offset and limit (at most 120 lines at a time).
- Finish with `REPORT.md`: what the user will see, files changed, test results.
