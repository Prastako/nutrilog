# nutrilog-260928-type-sets: Type is its own setting: three type sets, any of them with any colour look, fonts loaded as files only when used
priority: 3   depends on: nutrilog-260928-select-comet

## Pipeline
- Batch `defects-260928`. Supervisor step first (no worker): decode the sixteen base64 faces in src/fonts.css into `fonts/<family>-<style>-<weight>-<latin|ext>.woff2` (16 files, about 380 KB in total; Beaufort is not extracted), commit them on the batch branch, and rewrite src/fonts.css as sixteen `@font-face` rules pointing at those files with `font-display: swap`, the same `unicode-range` lines as today, and no Beaufort. Then two worker tasks: (a) CSS tokens, the `data-type` attribute and the Settings tiles; (b) prefs, service worker precache and Czech and English strings. No push, no rebuild until the batch ends.
- Reference: rows 1, 3 and 7 of the type-sets page (design chat 2026-09-28).

## Why
Design decision Jan 2026-09-28 (question 4). Today each colour look carries its own display and body font, so switching colour also switches type, which is too strong a change. Type becomes a separate setting with three sets; the user combines any set with any colour. Beaufort leaves the app: its file came from the "Beaufort for LoL" package with no licence text, and nothing permits bundling it. Fonts move out of the HTML into files so a set is downloaded only when someone uses it.

## Behavior (what must be true when done)
1. Three type sets, chosen independently of the colour look and the theme:
   - `fraunces` "Fraunces and Figtree" (default): display Fraunces, weight 300, italic, `font-variation-settings: 'opsz' 144, 'SOFT' 100`, letter-spacing 0; body Figtree 300 with 400 for emphasis.
   - `marcellus` "Marcellus and Raleway": display Marcellus 400 upright, letter-spacing .01em; body Raleway 300 with 400 for emphasis.
   - `jost` "Jost": display Jost 300 upright, letter-spacing -.005em, display sizes 2 percent larger than the other sets (the number on Today, h1 to h3, the primary button label); body Jost 300 with 400 for emphasis.
2. The set applies to every screen and sheet, Quick mode included, on `html[data-type]`. The colour looks no longer set any font token; `html[data-look]` changes colours only. Every place that reads `--font-display`, `--font-body`, `--display-weight`, `--display-style`, `--display-variation` keeps working through the new tokens.
3. Settings, section "Appearance and language": a new row "Type" directly under the look tiles, three tiles in one row like the look tiles, each showing the set's name in its own display face with a second line in its own body face ("Aa 1,640 kcal"), on the current ground colour. The chosen tile carries the comet mark from nutrilog-260928-select-comet. Tapping a tile applies the set at once and saves it.
4. The choice is saved in prefs as `type` (values `fraunces`, `marcellus`, `jost`), default `fraunces`, synced like `look`. An unknown value falls back to `fraunces`. Existing users with no `type` pref get `fraunces` regardless of their look.
5. Fonts are files under `fonts/`, referenced from the stylesheet, `font-display: swap`: text renders at once in the fallback face and switches when the file arrives. A face is fetched only when text on screen uses it, so choosing a set is what fetches it.
6. Offline: the service worker precaches the default set's six files (Fraunces italic latin and ext, Figtree 300 and 400 latin and ext) at install with the shell, and caches any other font file the first time it is fetched. Switching to a never-used set while offline shows the fallback face without error and corrects itself once online.
7. Beaufort does not appear in the stylesheet, the fonts folder or the built page. The comment at the top of fonts.css names the source and licence of each family (all five are SIL Open Font License).
8. Nothing else changes: sizes, colours, glow, ornaments, the number formatting (lining figures stay on).

## Acceptance rows (the supervisor turns these into hidden tests; Playwright, all three sets x three looks x two themes)
| situation | expected |
|---|---|
| fresh profile, Ember look | `html[data-type="fraunces"]`; Today's number renders in Fraunces italic (computed font-family and font-style), body in Figtree; no Jost loaded (document.fonts has no loaded Jost face) |
| Settings, tap the Jost tile | `data-type` becomes `jost`; the number and headings render in Jost 300; prefs `type` = `jost` after reload; Jost files requested from `fonts/` only now |
| Settings, tap Marcellus and Raleway, switch look to Lichen | fonts stay Marcellus and Raleway; only colours change |
| every set, every look, light and dark, all 8 screens and the 12 sheets | no font family outside the chosen set anywhere (walk computed font-family of all text nodes); Beaufort never present |
| Quick mode | takes the chosen set (Quick screen text in that set's body face) |
| service worker install | cache contains the six default files; after choosing Jost, the four Jost files are in the cache; offline reload with Jost chosen renders in Jost |
| built index.html | contains no base64 font data; is at least 500 KB smaller than the 0.2.7 build |
| prefs with `type: "nonsense"` | falls back to `fraunces`, no error |
| Czech UI | tile names "Fraunces a Figtree", "Marcellus a Raleway", "Jost"; row label "Písmo" |
| style_diff.py against the previous build with `type` = `marcellus` and look Ash | no changed computed property except font-related ones on Ember and Lichen (they now render Marcellus and Raleway) |

## Not in scope
- New font families (Cinzel, Cormorant) and a fourth set.
- Changing sizes or the glow.

## Data and texts
- Data format changes: prefs gain `type` (string, one of three ids); the sync payload carries it like `look`.
- User-facing texts, Czech / English:
  set_type "Písmo" / "Type"
  type_fraunces "Fraunces a Figtree" / "Fraunces and Figtree"
  type_marcellus "Marcellus a Raleway" / "Marcellus and Raleway"
  type_jost "Jost" / "Jost"
  type_sample "Aa 1 640 kcal" / "Aa 1,640 kcal"

## Known constraints
- Files: src/fonts.css (rewritten by the supervisor step), src/base.css (font tokens move from the `html[data-look]` blocks to `html[data-type]` blocks; `.band .val`, `h1,h2,h3`, `.btn` keep reading the tokens), src/core.js (`DEFAULT_PREFS.type`, a `TYPES` table next to `LOOKS`, `S.type`, `savePrefs`), src/app.js (`applyTheme` sets `data-type`), src/settings.js (the tiles under the look tiles, the `type` action), sw.js (`SHELL` gains the six default font paths), src/strings.js by grep only. tools/build.py is untouched: it still inlines fonts.css, which is now small.
- The worker has no internet and must not download fonts; the files come from the supervisor step.
- No new dependencies.

## Open questions
- none
