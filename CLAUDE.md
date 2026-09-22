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
