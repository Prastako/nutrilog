# nutrilog-260925-reskin-looks: The app has three selectable looks (Ember, Lichen, Ash), each in light and dark; new installs start on Ash
priority: 2   depends on: none

## Why
The current skin is a generic warm card app. The new identity is three colour and type sets that a user picks in Settings, combined freely with the existing light, dark and follow-the-phone choice. This brief only installs the sets and the setting; surfaces and ornaments follow in two more briefs.

## Behavior (what must be true when done)
1. Settings, Appearance card, gets a "Look" choice above "Theme": three tiles Ember, Lichen, Ash. Exactly one is selected. Tapping another switches the whole app immediately, no reload.
2. The choice is saved on the device with the other settings and survives closing the app. Fresh installs and every existing install that has no saved look use Ash.
3. Look and Theme are independent: 3 looks x 3 theme choices (follow the phone, light, dark) all work. Follow the phone keeps switching light and dark inside the chosen look.
4. Each look defines these colours. Dark values first, light values second.
   Ember dark: ground #141110, surface #1B1714, surface2 #231E19, ink #EEE3D2, ink2 #B7A68D, ink3 #82725D, accent #D9A066, ornament #9C8A70.
   Ember light: ground #F1E8DA, surface #F8F2E7, surface2 #E8DDC8, ink #33291E, ink2 #6E5F4B, ink3 #9C8A70, accent #A9702F, ornament #8F7C61.
   Lichen dark: ground #0F1411, surface #151B17, surface2 #1C231E, ink #E3E6D8, ink2 #A6AF9D, ink3 #727D6C, accent #9FBF9C, ornament #8B9886.
   Lichen light: ground #ECEDE2, surface #F5F5EC, surface2 #DFE2D2, ink #262B24, ink2 #5B6358, ink3 #889084, accent #4E7A52, ornament #7E8A79.
   Ash dark: ground #15161A, surface #1B1C21, surface2 #23242A, ink #E8E4DE, ink2 #ABA6A0, ink3 #787471, accent #CFA3A0, ornament #8F8A88.
   Ash light: ground #ECEAE6, surface #F5F3EF, surface2 #DFDCD7, ink #26262A, ink2 #5C5A5D, ink3 #8A8788, accent #9A5F5C, ornament #7F7A79.
   Derived from the accent, same rule in every look: accent tint = accent at 9 percent opacity (8 in light); accent border = accent at 24 percent; glow strong = accent at 42 percent (26 in light); glow soft = accent at 16 percent (10 in light). Card edge = ink at 7 percent. Ink glow = ink at 16 percent (10 in light).
5. Each look defines two typefaces. Display (headings, the big kcal number, primary button label) and body (everything else).
   Ember: display Italiana regular, body Jost 300 with 400 for emphasis.
   Lichen: display Fraunces 300 italic, optical size 144, "soft" axis 100; body Figtree 300 with 400 for emphasis.
   Ash: display Marcellus regular, body Raleway 300 with 400 for emphasis.
   Fonts are bundled in the app like the current ones (the app must work offline and the worker has no internet). Latin Extended subsets, so Czech letters render in the chosen font, not in a fallback.
6. Body text weight is 300 everywhere except row titles, tab labels and segmented buttons (400). Nothing in the app is bolder than 600.
7. The old teal, garnet, olive, indigo and ochre colours and the DM Sans and Cormorant Garamond fonts are no longer used anywhere once the three briefs are merged; in this brief they may still be referenced by surfaces that brief 2 replaces.
8. The browser theme colour (the bar around the app when installed) follows the current look's ground colour, light or dark as active.
9. The Look tiles show, in the look's own colours regardless of the current look: a row of three dots (ground, ink, accent) and the look's name. The selected tile has a 1 px accent outline and a small accent dot in its top right corner.

## Acceptance rows (the supervisor turns these into hidden tests)
| situation | expected |
|---|---|
| fresh install, open Settings | Look shows Ash selected; Theme shows Follow the phone |
| install with data saved by 0.2.6, first start after update | look is Ash, all diary, profile and supplement data unchanged, theme choice unchanged |
| tap Ember, close the app, reopen | Ember is selected and applied |
| Ember selected, Theme = Dark | ground #141110, accent #D9A066 |
| Ember selected, Theme = Light | ground #F1E8DA, accent #A9702F |
| Lichen selected, Theme = Follow the phone, phone switches dark to light | ground changes #0F1411 to #ECEDE2 without reload |
| any look, Czech language, heading "Přehled" | rendered in the look's display font, not a fallback font |
| saved settings contain an unknown look value (for example "moss") | app uses Ash and shows Ash selected |
| exported settings, then restored on another device | the look travels with them |
| Look tiles on a light theme | tile colours are still the look's own dark ground, ink and accent dots |

## Not in scope
- Card, button, chip, tab and header shapes (brief 2). Ornaments and the chromatic split (brief 3).
- Any new theme choice beyond the existing three.
- Per-screen colour exceptions; a look is global.

## Data and texts
- Data format change: settings gain field `look`, string, one of "ember", "lichen", "ash", default "ash"; missing or unknown value reads as "ash". Included in export and backup like other settings.
- User-facing texts, Czech / English:
  "Vzhled" / "Look"
  "Ember" / "Ember", "Lichen" / "Lichen", "Ash" / "Ash" (names stay English in both languages)
  Existing "Motiv" / "Theme" and its three options unchanged.

## Known constraints
- Files: supervisor decides. The app's colours live in one token block today; the six sets should replace it as data, with the look applied as a class or attribute on the page root next to the existing theme attribute.
- Font files: the supervisor downloads the six families (Google Fonts, Latin plus Latin Extended, weights listed in rule 5) and bundles them the way the current fonts are bundled. Total added font size should stay under 600 KB; subset if needed.
- Existing tests: the English end-to-end test and the accessibility check must still pass on every look, light and dark.
- Contrast: ink on ground and ink2 on surface must meet WCAG AA in all six sets; if a value fails, darken or lighten that value by the smallest step and note the change in the report.

## Open questions
- none
