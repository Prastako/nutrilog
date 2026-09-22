# NutriLog handoff (read this first in a new chat)

Last updated: 2026-09-22 (session 3, Claude Code at claude.ai/code with the repo selected). v0.2.3 is live on main (6a832e0): live index.html and sw.js show 0.2.3. Recipe archive (16 recipes) is on Drive (Jan uploaded the zip). Push route verified: this session pushes straight to main and GitHub Pages serves the change about 50 s later (deploy test commit db7c944). Standing working rules are now in CLAUDE.md (repo root), written for changes that reach main through a PR.

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
- Private backup repo name (app: Settings, API keys, Backup repository, format user/name). Needed for the archive upload and for any automation. Not `Prastako/nutrilog-data`: Jan deleted it (old version), ignore it.
- Did Jan load the recipe archive into the app (backup repo or from file)?
- Next step on the ideas below: research session (when, one or two) and what to build first.

## Ideas from Jan (2026-09-22, not started; several need research first)
Each item: Jan's idea, then "Now:" what the app does today.
1. Quick photo logging (premium later): photo before eating, hand next to the plate every time as the size reference; Claude estimates while he eats; a glanceable overview (seconds, not minutes) to check it matches the meal; pick how much was eaten (100 % or less); Log writes it to the diary. Now: the Photo tab evaluates a photo and logs grams; no hand reference, no eaten share, detailed rather than glanceable.
2. Sex: more than two options. Now: Male/Female only, because the resting energy equation (Mifflin, St Jeor) has only two forms; a third option needs a rule for the calculation.
3. Goals: keep simple Lose/Maintain/Gain, add an Advanced view with selectable pills in several categories (e.g. muscle and weight; nutrient coverage so enough minerals and vitamins are eaten per day). Include a morning/evening supplement routine proposed as a weekly schedule (not generated twice a day).
4. Activity: simple (current 4 bands) plus Advanced with more options: specific goals (e.g. muscle gain with fat loss), weekly training attendance.
5. Macro split: no basis to choose from. Needs an example, a recommendation from earlier choices, or an explanation.
6. Diet goals: the current multi-select can be the Advanced view; add a Simple view with a few options (e.g. Diet: carnivore, vegetarian, vegan; My intention: ...).
7. Meal split ("How the day splits between meals", % of daily energy): vague, reword and give context like the macro split.
8. Diet style, allergies and refusals repeat the same options (e.g. vegetarian vs refusing meat, gluten free vs gluten allergy). Restructure to remove overlaps.
9. PC and phone: Jan uses a PC more than the phone; both matter for future users. Now: runs on both, but data lives per device; restore from the backup replaces data, no two-way sync. Raises a server-based version.
10. Chat limits for a public version: capped free text length; every message a fresh request (no history sent, no prompt chaining); each answer adds a short structured summary with only food and supplement information to the profile for follow-up. Now: chat sends the last 20 messages.
11. Going public: this build is for Jan's own testing; later a public service, free tier (logging, archive) plus paid premium features. Jan worries the current model will be hard to change. Claude's note: a paid service with Claude features needs accounts, a server that holds the Claude key and enforces limits, and payments; that changes checkpoint decisions 1 (data on the device) and 4 (key in the browser). Hard to change, research first.

## Decisions (checkpoint 1, answered)
1. Storage: approved. Phone or browser first (IndexedDB), automatic backup to his private GitHub repo as in v0.1; recipe archive master on Google Drive `Reel Recipe Atlas/` (originals, extracted, records) next to `Reel Movement Atlas/`; app copy in the private backup repo under `archive/recipes/`.
2. Recipe text in ENGLISH (done in v0.2.1: starter recipes, Claude generated recipes and the pipeline all write English; `titleCs` kept for Czech search; Czech search words also match English recipe text).
3. Navigation: approved (Today, Log, Recipes, Chat, Review, + button; Czech: Dnes, Deník, Recepty, Chat, Přehled); more can be added later.
4. Claude key only in the browser, dedicated key with a spend limit, in-app budget 10 USD a month: approved.
5. Installable web app from GitHub Pages: approved. Can be wrapped as an Android package (Trusted Web Activity) later without a rewrite; data moves via the backup.
6. Reel source: a Saved collection on his Instagram. Link collecting snippet (version 2) below; the fallback is Instagram's "Download your information" (Saved only, JSON).
7. Claude GitHub App: installed and connected (did not grant push to this chat).
8. Archive originals: still images only, no videos (2026-09-21).

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
