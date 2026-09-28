# nutrilog-260925-invite-links: A profile is joined by opening a link; Settings shows the device's own link and a QR code for adding another device
priority: 2   depends on: nutrilog-260925-sync-val

## Why
Friends and second devices should join a profile without typing a key: open a link, confirm, done. The link is the credential. Creating and revoking users happens on the val's admin page (Claude builds it, not the worker); this brief is the app side only.

## Behavior (what must be true when done)
1. Opening the app at `<app URL>#join=<key>` (installed app or browser tab) runs the same Join flow as pasting the key in the Sync card (brief sync-val rule 3): the `/v1/me` check, the confirmation sheet with the profile name and the merge or switch note, then pull and push. The key part is removed from the address bar before the sheet opens (history replaced with `#today`), so a reload or a screenshot does not show it.
2. If the link's key is rejected by the server, the app shows the error in the sheet, stores nothing, and continues to Today.
3. If the device already holds the same key, the link does nothing except a toast `sy_already`.
4. The Sync card, when joined, gets "Add another device" (`sy_share`). It opens a sheet with: the QR code fetched from `GET /v1/me/qr` (shown as an image), the join link as text, a Copy button (`copy`, existing) and the note `sy_share_note`. If the QR cannot be fetched, the sheet shows the link and the Copy button without the image, no error.
5. The join link built by the app is `<current app origin and path>#join=<key>`, so a friend who installs from a different address gets a link for that address.
6. A join link received while a sheet is open (app already running, link opened from another app) is handled after the current sheet closes, not lost.
7. The Sync card explains in one line under the state (`sy_link_is_key`) that the link is the key to the profile and should be sent privately.

## Acceptance rows (the supervisor turns these into hidden tests; the server is mocked)
| situation | expected |
|---|---|
| fresh install opened at `#join=abc` and `/v1/me` answers "Mila" | sheet "Join the profile Mila?" with the merge note; address bar shows `#today` before the sheet; Confirm stores the key and starts pull then push |
| device joined as "Jan", opened at `#join=xyz` for "Mila" | sheet shows the switch note; Cancel leaves everything as it was |
| device joined as "Jan", opened at `#join=<Jan's key>` | toast `sy_already`, no sheet, no request sent |
| link key rejected (401) | error text in the sheet, no key stored, Today shown after closing |
| joined, tap "Add another device", QR fetch answers an SVG | sheet shows the image, the link text `<origin><path>#join=<key>` and Copy |
| joined, QR fetch fails | sheet shows link and Copy, no image, no error toast |
| Copy tapped | clipboard receives exactly the link |
| link opened while the add-food sheet is open | join sheet appears after the add-food sheet closes |
| app installed at `https://example.test/app/` | generated link starts with `https://example.test/app/#join=` |

## Not in scope
- Creating, renaming, rotating or revoking users (admin page on the val).
- Sign-in by email (later, needs a sending domain).
- Any change to the GitHub backup.

## Data and texts
- No new stored fields beyond brief sync-val.
- User-facing texts, Czech / English:
  `sy_share` "Přidat další zařízení" / "Add another device"
  `sy_share_note` "Naskenujte kód nebo otevřete odkaz v druhém zařízení. Kdo má odkaz, má přístup k profilu." / "Scan the code or open the link on the other device. Anyone with the link has access to the profile."
  `sy_link_is_key` "Odkaz je klíč k profilu, posílejte ho jen soukromě." / "The link is the key to the profile, send it privately only."
  `sy_already` "Toto zařízení už je připojeno k tomuto profilu." / "This device is already joined to this profile."

## Known constraints
- The app's routing reads `location.hash` at start (`boot` in src/app.js) and accepts only known screen names; `join=` must be handled before that check.
- No QR library in the app: the image comes from the server as SVG, fetched with the key in the `Authorization` header and shown from a blob URL or inline.
- `node --test` must pass; tests stub `fetch` and `navigator.clipboard`.

## Open questions
- none
