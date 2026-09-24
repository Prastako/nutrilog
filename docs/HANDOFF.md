# NutriLog handoff (read this first in a new chat)

Last updated: 2026-09-24 early morning (claude.ai session with the hybrid workspace on RYZEN9). v0.2.3 is live on main. Version 0.2.5 is ready on branch `overnight-20260924` (not pushed, not live): see "Overnight 2026-09-24" and "0.2.5" below. Research on going public: docs/research/2026-09-23-research.md. Standing rules are in CLAUDE.md.

## Overnight 2026-09-24: first real work through the local worker
- Built by the local model (qwen3.6:27b via C:\AI-Workspace), reviewed, finished and tested by Claude. Branch `overnight-20260924` in the cloud clone and in C:\AI-Workspace\projects\nutrilog (after the last sync task). Nothing pushed to GitHub, the live app is unchanged.
- What Jan will see in 0.2.4:
  - Supplements: the Magnesium preset is now 250 mg (the EU limit for supplements). A supplement saved from the old 300 mg preset keeps its dose and still shows its name in the chosen language.
  - Supplements: the "Supplements today" card warns when that day's planned doses go above an EU upper level (vitamin D 100 µg, vitamin A 3000 µg, vitamin E 300 mg, B6 12 mg, magnesium 250 mg, zinc 25 mg, selenium 255 µg, iodine 600 µg, calcium 2500 mg, iron 40 mg). Only supplements are counted, food is not.
  - Supplements: "Every other day" schedule (a true 2-day cycle from a chosen first day), next to the weekday choice.
  - Open Food Facts credit (their licence requires it) under product search results, on the product amount screen, and in Settings, About.
  - Invisible: saved timestamps are compared as moments in time (recent foods, latest review summary, chat order), so the autumn clock change cannot put an older change first.
- Tests: new unit tests `node --test` (test/*.test.mjs, 53 tests at the time of writing: dates, nutrient sums, calorie targets, timestamps, supplement limits, every-other-day cycle). Both Playwright tests pass on 0.2.4 (LEFTOVER CZECH: none, no page errors). Extra overnight UI checks (not in repo) passed: warning text in English and Czech, preset chips, credit on barcode and search, About row, every-other-day save and reopen.
- Not done on purpose (waiting for Jan): activity numbers, sex options, profile restructure (ideas 2 to 8), restore merge, anything server related.
- Lessons for worker tasks: the worker has a 64k context and fails ("autocompact thrashing") when it reads src/log.js, src/core.js or src/strings.js whole; tasks must give line numbers and tell it to read in ranges (now in CLAUDE.md). One attempt invented its own nutrient limits instead of the given table: every number in a task needs a hidden check.

## 0.2.5 (same night, second half; branch `overnight-20260924`, not pushed)
- Profile, macro split card: a line shows what the split means at the middle of the calorie target, e.g. "At the middle of your target, 2,440 kcal: protein about 155 g (2.1 g per kg of body weight), fat 80 g, carbohydrate 275 g a day." It updates while typing. A warning appears when fat is above 35 % (outside the EU range, e.g. Lower carb) and when protein is above 2.2 g per kg. Research problems 2 and 13 are shown, not yet fixed (the fix is idea 5, waiting for decision 2).
- Profile, meal split: a line shows kcal per meal, e.g. "At 2,440 kcal a day: Breakfast 610 kcal, Lunch 850 kcal, Snack 240 kcal, Dinner 730 kcal. This only sets the size of meal ideas; it does not change your daily target." (first step of idea 7).
- Allergy filter (used for recipe suggestions, the red warning on the food amount screen, food ideas in the Review): now catches wheat in soy sauce and teriyaki, pasta shapes (spaghetti, penne, lasagne...), pita, bagels, crackers, beer, malt, fish and shellfish in kimchi, Worcestershire, more fish names, milk in pesto and more cheeses, egg in custard, meringue and aioli, soy in teriyaki. It no longer raises false alarms for chicken breast, breakfast, tomato paste, maple syrup, butternut squash, oyster mushrooms, breadfruit, non-wheat flours, flounder, crabapples, tamarind, and in Czech names for raw foods (syrový is not sýr), white beans (bílé is not bílek), whole eggs (celé is not celer), oven-baked foods (trouba is not trout). Tests: test/exclusions.test.mjs (64 rows). Audit scripts that list every USDA food and recipe each allergen hits are not in the repo (supervisor scratch).
- Readability: light-theme grey text and orange tags darkened, dark-theme faint text lightened, so all text meets WCAG AA contrast; the date arrows on Recipes and Review have names for screen readers; Suggestions/All and Week/Month are proper tabs. An automatic accessibility check (axe-core, WCAG 2 A and AA) finds no issues on the 7 main screens, the add-food sheet and the supplements sheet, light and dark.
- Docs: the pivot to a personal project (Jan, 2026-09-23) is applied to this file and the research doc (checkpoint decisions 9 to 11, open questions).
- Tests on 9f92fb4: `node --test` 164 pass; e2e_test_en.py (LEFTOVER CZECH: none, no page errors); e2e_test.py (no page errors); e2e_test_supp.py all passed; new tools/e2e_test_profile.py all passed.
- Worker lessons: the worker thrashes when it reads src/strings.js even in ranges (very long lines); CLAUDE.md now says never read it, grep and edit instead. Two of the three tasks this half were finished by the supervisor after the worker ran out of context.

## The brief (Jan's original request, condensed)
Personal nutrition app on Android: log meals and supplements; profile with diet goals driving meal suggestions (breakfast, lunch, snack, dinner, several options, full recipe each); recipe ideas and meal prep from an archive extracted from his saved Instagram reels (each recipe one record, same dish from several reels merged with variations and tips, generous tags, archive backed up and hosted on his Google Drive, structured to sit next to his workout reel archive); photo of food or label evaluated against the diet; in-app Claude chat about ingredients he has or misses; saved data; weekly and monthly summaries flagging lacking nutrients. No monetisation yet. Data designed so a later workout app and a shared platform can read it without a rewrite. Long jobs run 23:00 to 07:00 Prague time (schedule them as scheduled tasks); daytime is for checkpoints. Stop at hard to change decisions with a testable version. When asking Jan to do something manually, give exact steps and exact text to paste. No em dashes anywhere. Jan cannot read code; describe behaviour.

## Status (session 2, 2026-09-22 morning)
- GitHub push from this chat is refused ("not in this session's authorized repository set"). The repos a session may write to are fixed when it starts; this Project chat has none. Documented route that can push: a Claude Code session at claude.ai/code started with the repo selected (`https://claude.ai/code?repositories=Prastako/nutrilog`). Not verified: push to main or only to its own branch; Drive connector there. Asked Jan whether to move building there; not answered yet.
- Jan's upload on 2026-09-21 21:51 (commit 5e366fe "NutriLog v0.2.1") changed no files; live site still 0.2.0. Sent him redo steps; the zip `nutrilog-v0.2.1.zip` (built from f37151c) is correct.
- The 23:00 in-session scheduled message did NOT run the work: this chat was asleep overnight (Jan's 22:02 message was also only processed at 07:22). Do not rely on send_later into this chat for overnight jobs.
- Recipe extraction ran in the morning after Jan said "Continue". Results:
  - 23 links, 22 downloaded (DIjgQjyuOC5 restricted to certain audiences, cannot be fetched without login). 5 first failed with a login prompt and worked on retry.
  - 16 recipes, 6 not recipes (C4quSoZPH9W slow cooker compilation, DEMaiDWo6Q4 top 5 dishes compilation, DJRsM0TMyK4 channel intro, DKHvNpth-eC Indian restaurant techniques, DM5rzCmqMdX keyhole garden, DTvViI_jV6- onion greens). No merges (no duplicate dishes).
  - All USDA matches high after fixes (whey isolate uses soy protein isolate as proxy; nigella uses cumin seed; black seed oil uses olive oil; pomegranate molasses uses molasses).
  - DDxAjM-RKWg was transcribed as Italian by mistake; re-transcribed with language forced to English.
  - Tested: archive imported into v0.2.1 in a phone-size browser, 28 recipes shown (16 archive + 12 starter), Czech search "kuře" finds chicken pho and pesto pasta, no page errors. Without the repo, recipes show a letter instead of a thumbnail.
- Jan's decision 2026-09-21: no videos in the archive, still images only. Pipeline, build_archive.py and DATA_FORMAT.md updated (commit 135cd3b, local only; included in the refreshed source bundle). originals/ holds <code>.info.json (trimmed), <code>.jpg (cover), <code>.frames.jpg (8 frame sheet).
- Drive uploads through the connector cost a lot for large or binary files, so the whole Drive set went to Jan as `reel-recipe-atlas-drive.zip` (originals/, extracted/, records/ with index.json, report.json, thumbs/) and the app copy as `recipe-archive-for-backup-repo.zip` (archive/recipes/index.json + thumbs/). Both wait for Jan to upload.
- Extractions are also stored as project doc `claude/nutrilog-recipe-extractions-2026-09-22.json` ({batch, count, extractions:[...]}), so a new session can rebuild the archive with build_archive.py without Drive.
- Czech food names: done 2026-09-22 in the daytime at Jan's request ("continue working now"). tools/fooddb/names_cs.json ({fdc id: name}) is merged by usda_build.py into data/foods.json as field `cs`. The app shows `cs` in Czech mode and searches both languages (English mode also finds foods by Czech words). Tested: 30 Czech queries give sensible top results (kefír is not in USDA), e2e test passed. Built as v0.2.2 (commit 117363b, local only), zip `nutrilog-v0.2.2.zip` sent to Jan.

## v0.2.3: the app in English (2026-09-22 evening)
- Jan: "The whole app is in czech. We are talking in english. It can be built in English." Czech stays selectable in Settings (Čeština / English chips).
- English is the default for new installs. Existing installs switch to English once, on the first start of v0.2.3 (marker `englishDefaultAppliedAt` in the meta store); if Jan then picks Czech, it stays Czech.
- The English string table already existed, so the work was mainly the default switch plus fixing places that showed stored Czech text:
  - Diary, Review and edit sheet show USDA foods by their name in the current language (stored entry names are not changed).
  - Preset supplements (e.g. Hořčík / Magnesium) and their units show in the current language.
  - Profile exclusions (allergens) show in the current language; the stored label is still used for matching.
  - Macro abbreviations: B/T/S in Czech, P/F/C in English (was hard-coded B/T/S).
  - Page language and manifest set to English.
- Claude prompts still mention Czech supermarkets and portion habits on purpose.
- Tests, all passing on commit 8e8be62:
  - `python3 tools/e2e_test_en.py <repo_dir> <shots_dir>`: new; fresh English install, visits every screen, sheet and tab; fails on any leftover Czech (accented letters, plain Czech words, B/T/S macro pattern). Result: "LEFTOVER CZECH: none", no page errors.
  - `tools/e2e_test.py`: Czech mode and the v0.1 migration; checks the language becomes English after the update and Czech works when chosen.
  - Scratch checks (not in repo): Czech data then English shows English; v0.2.2 install with Czech data upgrades to English with stored data unchanged.
- Commits after the live 8de30af (local only): 2694622 stills only, 117363b v0.2.2, eccac22 v0.2.3, 8e8be62 macro abbreviations and stronger detector.

## Drive rule (Jan, 2026-09-22)
- Jan expects Claude to do Drive uploads itself. Text files (extractions, index, reports): always upload through the Drive connector. Images: only small batches, shrunk first, at night; for large binary batches say so before starting and hand a zip.

## Drive: Reel Recipe Atlas (My Drive root, next to Reel Movement Atlas)
- Reel Recipe Atlas: 1RXs0KcW6KEMHlwjb-_cEp2gF9IcRC4Ec
- links.txt: 1TEvVI2Vpv_ovG-IFHPAowtFVb_RDbO6d
- originals/: 1h2ZuYtVM6N6IUSgigCQIxQhlYUXdap6V (66 files: .info.json, .jpg, .frames.jpg)
- extracted/: 1-GVXvvMijekmg7XU_PVU_Jay32vUOYsl (22 extraction files)
- records/: 1ZeCaUYeAVC91GB4E0a6t80qg8COZ3G_8 (index.json, report.json, thumbs/). The first records folder (1M25AZdqvivES94rP9qm1ZgVaj4dgw4_t) is in the Drive bin.
- Reel Movement Atlas: 1mVtzpcPnL0ugfUjjlFjmYf02GzfjNPdf
- Trashing Drive folders was partly blocked by the permission classifier ("Cloud Storage Mass Delete"); do not trash Drive items without asking Jan.

## Push route (verified 2026-09-22, session 3)
- Work happens in a Claude Code session at https://claude.ai/code?repositories=Prastako/nutrilog. It commits on its own branch and also pushes to main (`git push origin <branch>:main`); Pages rebuilds in about 50 s (Actions run "pages build and deployment"). No manual uploads needed.
- Available there: Google Drive connector (Reel Recipe Atlas readable), GitHub tools, Chromium. Not available: the Project docs (source bundle, extractions JSON); Drive records/index.json has the built archive.
- CLAUDE.md (added 2026-09-22 at Jan's request) holds the standing rules: build with tools/build.py, both tests before every PR with results in the PR description, update this file before every PR, no em dashes, describe changes by what Jan sees, exact steps for manual tasks, ask before hard to change decisions.
- Tests there: `pip install playwright==1.56.0` first (matches the preinstalled Chromium; newer versions look for a browser that is not there).
- Rejected earlier: a personal access token pasted into chat; driving GitHub's upload page with Claude in Chrome.

## Open questions for Jan
- Push 0.2.5 (branch `overnight-20260924`, includes 0.2.4) to main so it goes live? It is tested but Jan has not seen it yet.
- Private backup repo name (app: Settings, API keys, Backup repository, format user/name). Needed for the archive upload and for any automation. Not `Prastako/nutrilog-data`: Jan deleted it (old version), ignore it.
- Did Jan load the recipe archive into the app (backup repo or from file)?
- Decisions from the research (full list with options: research doc section (e)). Needed now:
  1. Server for option B (friends): a. Server route: Supabase in Frankfurt (research recommendation)? b. Sign-in: emailed code plus Google (research recommendation)? c. Monthly Claude limit per friend, in USD? d. Do diaries sync through the server (Jan's PC and phone, friends' devices), or does the server only hold the Claude key? e. Web address: stay on prastako.github.io or move to an own domain before friends install?
  2. Build ideas 8, 6, 2, 4, 3, 5, 7 now on the current app, in that order?
  3. Section (f) problems: done on the branch except sex handling (part of idea 2) and the restore merge (with sync).
  4. Activity multipliers to 1.40, 1.55, 1.70, 1.90?
  5. Sex options: Male, Female, In between, Prefer not to say?
  6. Supplement suggestions for Jan only, as a test?
  7. Photo test: weigh 15 to 20 meals, photo with and without hand?

## Research 2026-09-23: roadmap to going public (summary; details in docs/research/2026-09-23-research.md)
- Status 2026-09-23: Stage 1 and section (f) still apply. From Stage 2, only the server with Jan's key, per-person limits and sign-in apply (friends, option B). Domain for a public service, payments, pricing and the lawyer and accountant questions are reference only.
- Run overnight by 8 research agents plus a report writer (notes kept out of git). Legal, tax and medical points are research, not advice.
- Stage 1, Jan alone: fixes, then ideas 8, 6, 2, 4, 3, 5, 7, supplement weekly plan and quick photo log screen, all on the current app (they carry over); a sync proof on Jan's PC and phone once decision 1 is yes.
- Stage 2, closed beta (10 to 100 people): own domain off GitHub Pages (GitHub terms exclude commercial services), paid Supabase in Frankfurt, email sign-in, Claude key on the server with per-user limits, 18+, health-data consent (GDPR Art. 9), AI labels, new chat design (idea 10), recipes by pasted text or link only.
- Stage 3, public: business set up, merchant of record payments, 14-day trial, premium = Claude features, free = everything without Claude.
- Changes checkpoint decisions 1 (data on device), 4 (key in browser) and 5 (GitHub Pages) from Stage 2 on.
- Estimates: servers 0 USD now, 25 to 30 USD a month in beta, 50 to 110 USD at 10,000 users; Claude about 1.9 USD per typical premium user a month with today's prompts, 0.65 USD with lean ones; suggested price 39.99 EUR a year.

## Ideas from Jan (2026-09-22, not started; several need research first)
Each item: Jan's idea, then "Now:" what the app does today.
1. Quick photo logging: photo before eating, hand next to the plate every time as the size reference; Claude estimates while he eats; a glanceable overview (seconds, not minutes) to check it matches the meal; pick how much was eaten (100 % or less); Log writes it to the diary. Now: the Photo tab evaluates a photo and logs grams; no hand reference, no eaten share, detailed rather than glanceable.
2. Sex: more than two options. Now: Male/Female only, because the resting energy equation (Mifflin, St Jeor) has only two forms; a third option needs a rule for the calculation.
3. Goals: keep simple Lose/Maintain/Gain, add an Advanced view with selectable pills in several categories (e.g. muscle and weight; nutrient coverage so enough minerals and vitamins are eaten per day). Include a morning/evening supplement routine proposed as a weekly schedule (not generated twice a day).
4. Activity: simple (current 4 bands) plus Advanced with more options: specific goals (e.g. muscle gain with fat loss), weekly training attendance.
5. Macro split: no basis to choose from. Needs an example, a recommendation from earlier choices, or an explanation.
6. Diet goals: the current multi-select can be the Advanced view; add a Simple view with a few options (e.g. Diet: carnivore, vegetarian, vegan; My intention: ...).
7. Meal split ("How the day splits between meals", % of daily energy): vague, reword and give context like the macro split.
8. Diet style, allergies and refusals repeat the same options (e.g. vegetarian vs refusing meat, gluten free vs gluten allergy). Restructure to remove overlaps.
9. PC and phone: Jan uses a PC more than the phone; both matter for future users. Now: runs on both, but data lives per device; restore from the backup replaces data, no two-way sync. Raises a server-based version.
10. Chat limits for a public version: capped free text length; every message a fresh request (no history sent, no prompt chaining); each answer adds a short structured summary with only food and supplement information to the profile for follow-up. Now: chat sends the last 20 messages. Status 2026-09-23: kept as a way to lower Claude cost on Jan's key and to keep friends within their monthly limit.
11. Going public: this build is for Jan's own testing; later a public service, free tier (logging, archive) plus paid premium features. Jan worries the current model will be hard to change. Claude's note: a paid service with Claude features needs accounts, a server that holds the Claude key and enforces limits, and payments; that changes checkpoint decisions 1 (data on the device) and 4 (key in the browser). Hard to change, research first. Status 2026-09-23: dropped.

## Decisions (checkpoint 1, answered)
1. Storage: approved. Phone or browser first (IndexedDB), automatic backup to his private GitHub repo as in v0.1; recipe archive master on Google Drive `Reel Recipe Atlas/` (originals, extracted, records) next to `Reel Movement Atlas/`; app copy in the private backup repo under `archive/recipes/`.
2. Recipe text in ENGLISH (done in v0.2.1: starter recipes, Claude generated recipes and the pipeline all write English; `titleCs` kept for Czech search; Czech search words also match English recipe text).
3. Navigation: approved (Today, Log, Recipes, Chat, Review, + button; Czech: Dnes, Deník, Recepty, Chat, Přehled); more can be added later.
4. Claude key only in the browser, dedicated key with a spend limit, in-app budget 10 USD a month: approved.
5. Installable web app from GitHub Pages: approved. Can be wrapped as an Android package (Trusted Web Activity) later without a rewrite; data moves via the backup.
6. Reel source: a Saved collection on his Instagram. Link collecting snippet (version 2) below; the fallback is Instagram's "Download your information" (Saved only, JSON).
7. Claude GitHub App: installed and connected (did not grant push to this chat).
8. Archive originals: still images only, no videos (2026-09-21).
9. Personal project (2026-09-23, replaces going public): NutriLog serves Jan and possibly a few friends. No public service, premium tier or payments. Research and materials are kept for personal development.
10. Sharing with friends (2026-09-23): option B. Friends use the app with Jan's Claude key through a small server that enforces a monthly limit per person. Whether diaries also sync through that server: open, see Open questions.
11. Coding (2026-09-23): code is written by local models in Jan's hybrid workspace (C:\AI-Workspace on RYZEN9) through task files; Claude writes the task files, reviews and tests. The workspace is set up and in use since the night of 2026-09-24.

Link collecting snippet (version 2, current):
```
(async()=>{const m=new Map();let same=0,last=0;const q='a[href*="/p/"],a[href*="/reel/"]';const grab=()=>document.querySelectorAll(q).forEach(a=>{const x=a.href.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);if(x&&!m.has(x[2]))m.set(x[2],'https://www.instagram.com/'+x[1]+'/'+x[2]+'/')});while(same<8){grab();const all=document.querySelectorAll(q);if(all.length)all[all.length-1].scrollIntoView();window.scrollTo(0,document.documentElement.scrollHeight);await new Promise(r=>setTimeout(r,2000));grab();if(m.size===last)same++;else{same=0;last=m.size}console.log('Links found so far: '+m.size)}const t=[...m.values()].join('\n');try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/plain'}));a.download='instagram-links.txt';document.body.appendChild(a);a.click()}catch(e){}const b=document.createElement('textarea');b.value=t;b.style.cssText='position:fixed;top:10px;left:10px;width:60vw;height:60vh;z-index:99999;font-size:12px;background:#fff;color:#000';document.body.appendChild(b);b.select();console.log('DONE: '+m.size+' links. The file instagram-links.txt is in your Downloads folder.')})();
```

## Next steps
- Done 2026-09-22: live site serves 0.2.3; Drive has originals/, extracted/, records/ (index.json, report.json, thumbs/). Still open: archive in the backup repo (or loaded from file).
- Fix what Jan's PC test of v0.2.1 finds.
- Later: technique notes as a record type (for reels like DKHvNpth-eC); optional ingredients (e.g. the dessert in DDxAjM-RKWg) are currently counted in per-serving nutrition.

## Where things are
- Repo `Prastako/nutrilog` (public, GitHub Pages, https://prastako.github.io/nutrilog/). Source in `src/`, built into `index.html` by `tools/build.py`. Never edit `index.html` by hand.
- Source bundle: project doc `claude/nutrilog-v0.2.3-source-bundle.json` ({"files": {path: content}}, includes tools/fooddb/names_cs.json and the stills-only pipeline); restore = write files, `sh tools/fooddb/build.sh`, `python3 tools/build.py 0.2.3`. Older bundles were removed.
- Data contract: `docs/DATA_FORMAT.md`. Pipeline: `tools/reels/PIPELINE.md` with fetch.py, prepare.py, build_archive.py. Prepare is about 20 s per reel; whisper can misdetect the language, check transcripts that look garbled.
- Food database `data/foods.json`: 3,840 USDA SR Legacy foods, 38 nutrients, English names plus Czech names in field `cs` (from tools/fooddb/names_cs.json). Starter recipes: 12, English.
- English test: `python3 tools/e2e_test_en.py <repo_dir> <shots_dir>` (run after every change to screens or strings).
- End to end test: `python3 tools/e2e_test.py <v01_dir> <repo_dir> <shots_dir>` (phone size, Claude mocked, includes v0.1 to v0.2 migration; v0.1 is commit 9448571).
- Testing: Jan tests on his PC (Windows, Brave) for now. Camera barcode scanning does not work in desktop Brave (falls back to typing the code); photo evaluation works with the gallery upload.
