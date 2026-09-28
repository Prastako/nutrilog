# NutriLog briefs

Snapshot of `C:\AI-Workspace\work\briefs` on 2026-09-29. Read-only copy for browsing; the PC folder stays the source. The supervisor does not read this branch.

Status comes from the file extension on the PC: `.queued` = tasks submitted and merged, `.held` = waiting for Jan.

## Batch push-260928 (last session)

| brief | what must be true | status |
|---|---|---|
| [nutrilog-260928-push](briefs/nutrilog-260928-push.md) | The live app at prastako.github.io/nutrilog runs build 0.2.8 | held: waiting for Jan |

Manifest: [batches/BATCH-push-260928.md](batches/BATCH-push-260928.md)

## Batch defects-260928 (last session, build 0.2.8, merge order)

| brief | what must be true | status |
|---|---|---|
| [nutrilog-260928-axis-nesting](briefs/nutrilog-260928-axis-nesting.md) | A recipe written for a stricter diet is available to every less strict profile (vegan recipes show for vegetarians, pescatarians and omnivores) | done, merged |
| [nutrilog-260928-recipe-resolve-ui](briefs/nutrilog-260928-recipe-resolve-ui.md) | Catalog recipes read like recipes: steps name the ingredients with their amounts, the version matches the profile's diet, "to taste" instead of 0 | done, merged |
| [nutrilog-260928-recipe-tombstones](briefs/nutrilog-260928-recipe-tombstones.md) | Deleting your own or a Claude recipe removes it on every device of the profile | done, merged |
| [nutrilog-260928-sync-push-on-open](briefs/nutrilog-260928-sync-push-on-open.md) | What you logged on one device is on the other device the next time you open it | done, merged |
| [nutrilog-260928-sync-join-reset](briefs/nutrilog-260928-sync-join-reset.md) | Joining another profile by link shows only that profile's data, never the previous person's | done, merged |
| [nutrilog-260928-restore-merge](briefs/nutrilog-260928-restore-merge.md) | Importing a file or restoring a snapshot while joined merges with the profile instead of silently splitting the two sides | done, merged |
| [nutrilog-260928-btn-corners](briefs/nutrilog-260928-btn-corners.md) | Every secondary button carries its four corner ornaments around its own label; no ornaments pile up at the page corners | done, merged |
| [nutrilog-260928-btn-plain](briefs/nutrilog-260928-btn-plain.md) | Secondary buttons are plain text with no corner ornaments; no ornaments pile up at the page corners | done, merged |
| [nutrilog-260928-review-chart](briefs/nutrilog-260928-review-chart.md) | The daily chart on Review keeps one height and a faint target band at every window width | done, merged |
| [nutrilog-260928-tag-wrap](briefs/nutrilog-260928-tag-wrap.md) | Tag rows never start a line with a dot, every tag namespace has a label, and labels over inputs line up | done, merged |
| [nutrilog-260928-select-comet](briefs/nutrilog-260928-select-comet.md) | One selection mark for every kind of choice: the comet | done, merged |
| [nutrilog-260928-motion](briefs/nutrilog-260928-motion.md) | The app moves softly: one tempo, four easings, reduced-motion respected, Quick mode static, and the ornament split stops twitching | done, merged |
| [nutrilog-260928-type-sets](briefs/nutrilog-260928-type-sets.md) | Type is its own setting: three type sets, any of them with any colour look, fonts loaded as files only when used | done, merged |

`btn-corners` was superseded by `btn-plain`. Manifest: [batches/BATCH-defects-260928.md](batches/BATCH-defects-260928.md)

## Earlier briefs (live in 0.2.7)

| brief | what must be true | status |
|---|---|---|
| [nutrilog-260924-activity-logic](briefs/nutrilog-260924-activity-logic.md) | Calorie targets use the reference activity values, and an optional detailed week (daily life plus training) adds training energy | done, merged |
| [nutrilog-260925-activity-detail](briefs/nutrilog-260925-activity-detail.md) | The Activity card on the Profile screen can switch to a detailed week (daily life level plus training) and shows what training adds | done, merged |
| [nutrilog-260925-ai-nosex](briefs/nutrilog-260925-ai-nosex.md) | What Claude is told about the person no longer names a sex; it gets body fat, periods and the activity description instead | done, merged |
| [nutrilog-260925-invite-links](briefs/nutrilog-260925-invite-links.md) | A profile is joined by opening a link; Settings shows the device's own link and a QR code for adding another device | done, merged |
| [nutrilog-260925-layout-wide](briefs/nutrilog-260925-layout-wide.md) | On a wide screen the app uses a side rail and two columns; the phone layout stays exactly as it is | done, merged |
| [nutrilog-260925-profile-nosex](briefs/nutrilog-260925-profile-nosex.md) | The Profile screen has no sex setting; height is optional; body fat % can be given; the periods question sits in Fine-tune | done, merged |
| [nutrilog-260925-quick-mode](briefs/nutrilog-260925-quick-mode.md) | A per-device Quick mode shows only food and supplement logging on one screen, usable on a very small touchscreen with a keypad | done, merged |
| [nutrilog-260925-recipe-schema](briefs/nutrilog-260925-recipe-schema.md) | One recipe record resolves to the user's diet, servings and session changes; allergens and nutrition follow the resolved ingredients | done, merged |
| [nutrilog-260925-reskin-looks](briefs/nutrilog-260925-reskin-looks.md) | The app has three selectable looks (Ember, Lichen, Ash), each in light and dark; new installs start on Ash | done, merged |
| [nutrilog-260925-reskin-ornaments](briefs/nutrilog-260925-reskin-ornaments.md) | Drawn ornaments with a faint chromatic split appear in the header, side columns, separators, primary button corners, meter end and active tab | done, merged |
| [nutrilog-260925-reskin-surfaces](briefs/nutrilog-260925-reskin-surfaces.md) | Every screen uses the new surfaces: soft-edged cards, outlined actions, segmented pills, a symbol-bar header, no floating button | done, merged |
| [nutrilog-260925-sync-val](briefs/nutrilog-260925-sync-val.md) | The app keeps one profile in sync across devices through Jan's Val.Town endpoint | done, merged |
| [nutrilog-260926-open-edge-controls](briefs/nutrilog-260926-open-edge-controls.md) | No text sits in a filled box any more; only inputs, the sheet and one primary action per screen stay closed | done, merged |
| [nutrilog-260926-open-edge-legibility](briefs/nutrilog-260926-open-edge-legibility.md) | Numbers, small labels and structure lines are legible in every look, and nothing shows through the content | done, merged |
| [nutrilog-260928-catalog-pull](briefs/nutrilog-260928-catalog-pull.md) | Every joined profile gets the shared recipe catalog from Jan's Val.Town and keeps it offline | done, merged |
| [nutrilog-260928-recipe-submit](briefs/nutrilog-260928-recipe-submit.md) | A joined user sends a recipe as a link or text, and it appears in everyone's catalog after Claude converts it | done, merged |

Open supervisor questions: [QUESTION_LOG.md](QUESTION_LOG.md)
