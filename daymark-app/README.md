# DAYMARK (Expojet / Expo SDK 57)
Tasks, reminders, wishlist (GH₵) and a random purchase picker. Data is stored on the phone (expo-sqlite). Reminders use local iOS notifications.

## Run on Windows + iPhone (no Mac)
1. Install Node.js 22+ (nodejs.org). 2. Install **Expo Go** on the iPhone from the App Store.
3. In this folder: `npm install` then `npm start -- --lan`
4. PC and iPhone on the same Wi-Fi. Scan the QR code with the iPhone Camera and open in Expo Go.
(If the QR does not connect, try `npm start -- --tunnel`.)

## Notes
- Dates are typed as YYYY-MM-DD and times as HH:MM (24-hour).
- Reminders: turn on Settings → Enable notifications. They are scheduled on the phone, so no server is needed. Not verified in Expo Go on a real iPhone; if alerts fail there, a development build is the next step.
- Standalone install without Expo Go needs `npx eas build --profile preview` and a paid Apple Developer account.
- Backup: Settings → Export backup shares the JSON; paste it back to import.

## What's new in 1.1.0 (ported from the web app)
- Tasks: categories, optional due time, Overdue filter, sort by due/priority/recent/A–Z, overdue-by-time detection.
- Reminders: Today / Tomorrow / Upcoming / Overdue / Completed filters, search, +1h and "Tomorrow 09:00" snooze.
- Wishlist: totals + acquired cost, priority, notes, status/category filters, more sorts, picker budget and category filters, no immediate repeat, "Mark acquired" and "Open link" from the pick.
- Dashboard: due-today list, overdue count, high-priority blockers, wishlist summary.
- Settings: currency (GH₵, $, €, £, ₦, KSh), haptics toggle, diagnostics.
- Backup: merge or replace on import with a preview of counts; also imports backups exported from the DAYMARK web app.
- Existing v1 data migrates automatically. `npm test` runs the logic tests; `npm run typecheck` checks types.
- Known: `expo start --web` doesn't bundle (expo-sqlite web needs a wasm setup); the app targets iOS/Android.
