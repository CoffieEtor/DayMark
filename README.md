# DAYMARK (Expojet / Expo SDK 57) — iOS + Android, local-first
Tasks, reminders, wishlist (GH₵) and a random purchase picker. All data stays on the phone (SQLite via Drizzle). No account, no server.

## Expojet choices
Standalone · Expo Router tabs · StyleSheet · Lucide icons · dark mode · haptics · EAS profiles · SQLite + Drizzle · no auth/backend/analytics (added later).

## Run (Windows PC + phone, no Mac needed)
1. Install Node.js 22+ and the **Expo Go** app (App Store / Google Play).
2. In this folder: `npm install`, then `npm start -- --lan`
3. Same Wi-Fi: scan the QR (iPhone: Camera app; Android: inside Expo Go). If it won't connect: `npm start -- --tunnel`.
Check setup any time with `npx expojet doctor`.

## Notes
- Dates: YYYY-MM-DD. Times: HH:MM (24-hour).
- Reminders are local notifications (Settings → Enable notifications). Android uses a "Reminders" channel. Not yet tested on real devices or in Expo Go; if alerts fail there, use a development build (`npx eas build --profile development`).
- Database changes go in the append-only `MIGRATIONS` list in `src/db/client.ts`.
- Store builds: `npx eas build --profile production` (needs a free Expo account; Apple Developer account $99/yr for iOS, Google Play $25 one-off for Android).
- Backup: Settings → Export backup shares JSON; paste it back to import.
