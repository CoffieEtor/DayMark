# Deploying DAYMARK on Vercel (with background push reminders)

The app itself is static. Reminders that arrive while the app is closed need the small API in `/api`,
which runs as Vercel serverless functions and stores data in Redis.

## One-time setup

1. **Rotate the VAPID keys.** The previous private key was committed to this repository, so treat it as
   compromised. Generate a new pair: `npx web-push generate-vapid-keys`.
2. **Import the repo** at https://vercel.com/new. Framework preset: *Other*. No build command, no output
   directory (leave defaults). Root directory: repo root.
3. **Add a Redis database:** Vercel dashboard → Storage / Marketplace → *Upstash for Redis* → connect to the project.
   This sets `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_*`) automatically.
4. **Add environment variables** (Project → Settings → Environment Variables, all environments):

   | Name | Value |
   |---|---|
   | `VAPID_PUBLIC_KEY` | public key from step 1 |
   | `VAPID_PRIVATE_KEY` | private key from step 1 |
   | `VAPID_SUBJECT` | `mailto:you@example.com` |
   | `CRON_SECRET` | any long random string (e.g. `openssl rand -hex 32`) |

5. **Redeploy** so the variables take effect.
6. **Reminder trigger (pick one):**
   - *Free / Hobby:* in GitHub → Settings → Secrets and variables → Actions, add `APP_URL`
     (e.g. `https://your-app.vercel.app`, no trailing slash) and `CRON_SECRET` (same value as above).
     The workflow `.github/workflows/reminder-cron.yml` then calls `/api/cron` about every 5 minutes.
   - *Pro:* add to `vercel.json`: `"crons": [{ "path": "/api/cron", "schedule": "* * * * *" }]`
     and delete the workflow. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.

## Check it works

- Open `https://<your-app>/api/health` → should show `"status":"healthy"` and `"vapidConfigured":true`.
- In the installed app: Settings → enable notifications → *Send test notification*.
- On iPhone, push only works for the app installed to the Home Screen (iOS 16.4+).

## Notes

- Each device only receives its own reminders. Reminder times are interpreted in the device's timezone.
- Existing devices: open the app once after deploying so it re-registers its subscription and reminders.
- `server/` is the old local Express server, kept for local development (`npm start`, needs its own `server/.env`).
- Delivery delay with the GitHub Actions trigger is typically 5–15 minutes.
