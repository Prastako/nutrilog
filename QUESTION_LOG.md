# Question log

Gaps in briefs that the supervisor cannot resolve from the brief, README.md, the repo or earlier chat messages. Format and handling: supervisor\CLAUDE.md, section "Supervisor role: scope, questions, reporting". Answers come as a new or edited brief, or a line in the supervisor chat.

## Q-1 | brief: nutrilog-260928-catalog-pull.queued | 2026-09-28 | status: open
Question: Should the val serve /v1/catalog without a sync key, so every install gets the shared recipes without joining a profile?
Why it matters: today a phone that never joined sees only the 12 starter recipes (Jan saw 13 on 2026-09-28); an open catalog makes the 133 recipes readable by anyone with the val address, which is in the public app code, and needs a val change plus one app task.
Action taken meanwhile: none needed; the app keeps the brief's behavior (catalog only for joined profiles).

## Q-2 | brief: nutrilog-260928-catalog-pull.queued | 2026-09-28 | status: open
Question: Should the Recipe archive card's "Sync" button (GitHub backup token) be renamed, for example "Back up to GitHub", or the card retired now that the catalog exists?
Why it matters: Settings has two "Sync" buttons; Jan tapped the archive one and got a GitHub token request instead of the catalog.
Action taken meanwhile: none; the card is unchanged.

## Q-3 | brief: nutrilog-260928-recipe-resolve-ui.md | 2026-09-28 | status: open
Question: Should schema 1 recipes (starter, own, Claude) scale through resolveRecipe (rule 5), which rounds amounts (12.5 g becomes 13 g, 1/4 becomes 0.3 at half servings), or keep today's exact scaling as the "renders exactly as before" row and the byte-identical constraint require?
Why it matters: the two statements conflict for 9 of the 12 starter recipes at non-default servings; derived display names would also rename 6 starter ingredients that contain a comma.
Action taken meanwhile: schema 1 recipes render exactly as today (stored item text, stored steps, qty x factor); the resolver, display names, "to taste" and the picker apply to schema 2 recipes. Revert: one task that sends schema 1 through the resolver path in recipeView.

## Q-4 | brief: nutrilog-260928-recipe-resolve-ui.md | 2026-09-28 | status: open
Question: The coeliac row expects the flags line "Gluten-free version", but the texts give rc_flags_applied "Adjusted: {list}" with fl_gluten_free "gluten-free", which reads "Adjusted: gluten-free". Which wording is right?
Why it matters: only the wording of the line under the version picker.
Action taken meanwhile: the texts section is used ("Adjusted: gluten-free" / "Upraveno: bez lepku"). Revert: change rc_flags_applied and fl_gluten_free in src/strings.js.

## Q-5 | brief: nutrilog-260928-recipe-resolve-ui.md | 2026-09-28 | status: open
Question: Own, Claude and archive recipes carry no `written` field, which reads as omnivore; should rule 8 ("Not for your diet", hidden from Suggestions and Ideas) apply to them for pescatarian, vegetarian and vegan profiles?
Why it matters: applied literally, every recipe a vegetarian typed in or saved from chat disappears from Suggestions and is tagged "Not for your diet".
Action taken meanwhile: rule 8 applies only to recipes that carry `written` (catalog and starter); recipes without it keep today's word-based exclusion check. Revert: drop the `r.written` condition in recipeView (src/recipes.js).

## Q-6 | brief: nutrilog-260928-sync-push-on-open.md | 2026-09-28 | status: open
Question: Rule 2 (push items with updatedAt equal to or newer than the last push time) together with rule 6 (last push time = newest item sent) makes the newest item pending forever, so every app open and every return would push again; the rows "app open with nothing pending: pull only" and "wait 5 s: no second push on the next foreground" expect no push. Which wins?
Why it matters: either one extra push request per sync run (harmless on the server) or a small extra bookkeeping field on the device.
Action taken meanwhile: the device also remembers the ids sent at the last push time (S.meta.sync.lastPushIds, local only, not synced); an item counts as pending when it is newer than the last push time, or equal to it and not among those ids. Same-second changes are still sent and all rows hold. Revert: drop the id condition in syncDue in src/sync.js, which gives the plain "equal or newer" rule.

## Q-7 | brief: nutrilog-260928-review-chart.md | 2026-09-28 | status: open
Question: With today's chart maximum (1.15 x the target high, or the highest day if larger), a 78 kcal day against a 2,240 to 2,970 target is 2.3 px tall, not the 3 px in the acceptance row; should the maximum change (for example to the target high itself, which would clip every day above target at the top)?
Why it matters: the scale of every bar and the band position.
Action taken meanwhile: the maximum stays as today (rule 1: "bars keep their proportions"); heights are value / maximum x 100 px, and the browser check accepts 1 px of rounding. Revert: change the max line in dailyChart (src/review.js).

## Q-8 | brief: nutrilog-260928-select-comet.md | 2026-09-28 | status: open
Question: On radio rows with a sub-line (activity, goal), the thread 5.5 px below the title would cross the sub-line, which sits 2 px under the title; should the sub-line move down, and what exactly does "the label is set 6 px right of where it starts today" and "spacing between options is 22 px" mean in pixels?
Why it matters: the exact layout of every radio row, chip row and segmented control.
Action taken meanwhile: the sub-line gets a 9 px top margin (it clears the thread); the round mark keeps its space but is invisible and the title moves 6 px right of today's position; chips and segments get 16 px left padding (6 px more than today) and 22 px between buttons. Revert: edit the comet block at the end of src/app.css (lines marked "selection: comet").
