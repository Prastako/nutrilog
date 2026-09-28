# nutrilog-260925-reskin-surfaces: Every screen uses the new surfaces: soft-edged cards, outlined actions, segmented pills, a symbol-bar header, no floating button
priority: 2   depends on: nutrilog-260925-reskin-looks

## Why
With the looks installed, the shapes still belong to the old skin: heavy card shadows, big radii, a filled teal button, a floating plus button, a logo mark with text. This brief replaces them on all screens and sheets with the quieter, glowing system from the approved mock, using the look's colours.

## Behavior (what must be true when done)
1. Cards: radius 14 px; no drop shadow below; instead a 1 px edge in "card edge", a 1 px catch-light along the inside top edge (ink at 10 percent in dark, white at 70 percent in light), an inner glow of the accent (glow soft, 36 px blur, inside), and a faint outer shadow (black at 35 percent in dark, ink at 8 percent in light, 24 px blur, 4 px down). Card background is a vertical fade from surface2 at the top to surface by 26 percent of its height.
2. Text softness: every text element carries a faint glow of its own colour: body text 9 px blur of ink glow; headings, the big kcal number and the primary button label 8 px plus 24 px blur of glow soft; small uppercase labels 6 px of ink glow.
3. Primary action button (today filled teal): background accent tint, 1 px accent border, inner glow of accent tint 30 px, outer glow of glow soft 24 px, radius 14 px, label in the display font at 20 px in accent colour, no white text anywhere on it. Height 56 px minimum.
4. The floating "+" button is removed on every screen. Where it added a meal, each meal row on Today and Log gets a round 30 px "+" at the row's right end (surface2 fill, 1 px card edge). Where it opened another sheet (supplements, recipe, photo), that sheet's own screen gets a primary action button at the bottom of its content with the same label the floating button had.
5. Secondary buttons (Set up the backup, Show, Open the profile and similar): surface2 fill, 1 px card edge, radius 12 px, ink2 text, no glow other than text softness.
6. Chips and tags (allergen tags, Pantry, To buy, supplement presets, meal pattern chips): accent tint fill, 1 px accent border, accent text, radius 9 px, 11 px text with 0.04 em tracking. A selected chip adds glow soft 8 px around it.
7. Segmented choices (Suggestions/All, Week/Month, theme, language; the Look row from brief 1 keeps its tiles): one rounded track in surface2 with a 1 px card edge, radius 10 px, 3 px padding; the active segment is a surface pill with a 1 px card edge and a 14 px blur of the outer shadow; inactive segments are ink3 text, no fill.
8. Header on every screen: the small circle mark and the word "NutriLog" are gone. The header is centred: a 34 px tall ornament slot (empty until brief 3, keeps its height), and below it the screen label in 10 px uppercase, 0.26 em tracking, ink3. The label reads: Today = the date ("Friday 25 September" in the app language), Log = the shown day's date, Recipes = "Recipes", Chat = "Chat", Review = the shown period, Profile = "Profile", Settings = "Settings". Back and Settings buttons stay where they are, as 34 px circles in surface2 with a 1 px card edge.
9. The header has no hard bottom line: a 1 px card edge only. Behind it, a faint radial vignette of the accent (glow soft, 70 percent wide, 30 percent tall, fading by 70 percent) at the top of the page, and a fainter one (half strength) rising from the tab bar.
10. Tab bar: no tinted pill behind the active tab. Active tab: accent colour text and icon, 8 px glow strong on the text, 4 px glow on the icon, plus a 9 px tall marker slot under the label (empty until brief 3). Inactive tabs ink3. Icon strokes 1.3 px.
11. Progress meter (Eaten today, and any other bar): 2 px tall, track fades in and out at both ends; the filled part fades in from transparent over its first 12 percent, in accent, with glow strong 8 px and glow soft 18 px; the end of the fill has a 14 px marker slot (empty until brief 3).
12. Section separators: the diamond-and-line ornament is replaced by a 20 px tall centred slot (empty until brief 3) with a 1 px card edge line fading out to both sides.
13. Side margins: the main content gets an 18 px empty column on the left and right on every screen (the ornament columns of brief 3), inside the existing 14 px page padding. Content width shrinks accordingly; nothing overflows on a 360 px wide phone.
14. Radii everywhere else: inputs 12 px, sheets 18 px top corners, toasts 12 px, small round buttons 50 percent. Nothing uses the old 18 and 26 px radii.
15. Chat bubbles: assistant bubble surface fill, user bubble accent tint fill; both 1 px border (card edge, accent border), 14 px radius with the corner nearest the sender at 4 px, no shadow, a 0.6 rem uppercase sender label above in ink3.
16. Motion: none added. The existing screen fade stays.

## Acceptance rows (the supervisor turns these into hidden tests)
| situation | expected |
|---|---|
| Today screen, any look | no element has a box shadow larger than 24 px blur; no floating button present |
| Today, tap the "+" on the Snack row | the add-food sheet opens for Snack |
| Supplements sheet | a primary button at the bottom with the label the floating button had |
| Recipes, Suggestions/All | one track, the active segment is a surface pill, the inactive one has no fill |
| Header on Log while viewing yesterday | label shows yesterday's date in the app language; no "NutriLog" text anywhere on screen |
| Chat, one user and one assistant message | user bubble accent tint with 4 px bottom-right corner; assistant surface with 4 px bottom-left corner |
| Any screen at 360 px width, Czech language | no horizontal scrolling, no truncated buttons |
| Light theme, any look | card catch-light present, outer shadow at 8 percent |
| Accessibility check (axe), 7 main screens plus sheets, 3 looks x light and dark | no violations |
| English end-to-end test | passes, leftover Czech: none |

## Not in scope
- Colours and fonts (brief 1). Ornament drawings and the chromatic split (brief 3): this brief only reserves their slots at the given sizes.
- Any change to what screens contain or how flows work; only shapes, spacing and surfaces.

## Data and texts
- Data format changes: none.
- User-facing texts, Czech / English: header labels reuse existing strings ("Recepty" / "Recipes", "Chat" / "Chat", "Profil" / "Profile", "Nastavení" / "Settings"). New: none.

## Known constraints
- Files: supervisor decides; expected to be the two stylesheets plus the shell markup for the header and the tab bar, plus the places that create the floating button.
- Reference: `work\briefs\nutrilog-260925-reskin-ref\nl4.css` (the approved mock's stylesheet) holds the exact values for every rule above; copy values from it rather than re-deriving them.
- The worker cannot read the strings file; header label wiring that needs strings stays with the supervisor.

## Open questions
- none
