# Setup guide

The offline planner works without accounts. Complete the optional services below
when you return. Never paste secret keys into the public repository.

## 1. Run locally

Install Node.js LTS if needed (Node 24 LTS recommended), then in this folder:

```sh
npm ci
npm run dev
```

For an offline-capable production preview:

```sh
npm run build
npm run preview
```

Open the printed address. Visit once online so the service worker can cache the
app. The development server does not install the production offline cache.

## 2. Supabase sync

1. Create a Supabase project. Open SQL Editor and run `cloud/schema.sql`.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` to the project URL and `VITE_SUPABASE_ANON_KEY` to its
   public anon/publishable key. Never use the service-role key in a VITE variable.
4. Under Authentication URL configuration, set your deployed site URL and add your
   local preview URL to allowed redirect URLs during development.
5. Enable email/password authentication. Restart the dev server or rebuild.
6. In Connections create an account, confirm the email, and sign in on each device.
7. Use “Copy offline items into account” once to bring guest data into the account.
   It copies rather than deletes guest items; repeated clicks create extra copies.

Each cloud record belongs to one authenticated user. Row-level security prevents
other users reading it. Writes go through a version-checked database function.
Offline edits stay pending until an authenticated connection succeeds. If two
devices edit the same record, Connections shows both versions for a decision.
Deleting an item creates a deletion marker so it does not reappear on another device.

## 3. Cloudflare Pages

1. Create a Cloudflare account and connect the GitHub repository to Pages.
2. Build command: `npm run build`. Output directory: `dist`. Root: repository root.
3. Set the same public `VITE_...` environment variables in Pages. Use Node 24 LTS.
4. Deploy; Cloudflare supplies an HTTPS `pages.dev` address. No DuckDNS is needed.
5. Update Supabase redirect URLs and provider OAuth origins with that address.
6. A GitHub push triggers a Pages rebuild after this integration is configured.

The laptop does not need to stay on after deployment. Local preview URLs only work
while the local server is running; they are not the final phone URL.

## 4. Closed-app notifications

The included Cloudflare Worker runs each minute and sends due Web Push reminders.
This is separate from Pages. Delivery needs internet and OS permission and is not
an exact alarm: Focus modes, OS throttling, outages, or paused cloud services can
delay it. The worker catches up within a 15-minute window and expires notifications
after 15 minutes. Quiet hours defer notifications until the configured end hour.

1. Generate VAPID keys with the reputable `web-push` CLI:
   `npx web-push generate-vapid-keys`.
2. Keep the private key secret. Put only the public key in
   `VITE_VAPID_PUBLIC_KEY` in `.env.local` and the Pages environment.
3. Authenticate Cloudflare with `npx wrangler login`.
4. Set worker secrets using `npx wrangler secret put NAME --config cloud/wrangler.toml`
   for each of: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (a contact `mailto:` address).
5. Deploy using `npm run deploy:reminders`. Rebuild Pages with the public key.
6. Sign in to Weekwise. On iPhone use Safari → Share → Add to Home Screen; open
   from that icon. In Connections choose “Enable on this device.”
7. Create an event several minutes ahead, set its reminder, wait until sync says
   Synced, close the app, and verify delivery. Tap it to open and snooze.

The service-role key belongs only in worker secrets. It can bypass database RLS.
Never put it in a frontend environment variable, README, screenshot, or commit.
The worker checks allowed push service hostnames and removes expired subscriptions.
Delivery claims reduce repeated sends; networks cannot guarantee exactly-once delivery.

## 5. Google calendar and Gmail (optional)

1. Create a Google Cloud project. Enable Calendar API and, for mail scanning, Gmail API.
2. Configure the OAuth consent screen. For a personal testing app, add your own
   Google account as a test user. Gmail read access is a restricted scope; public
   distribution may require Google's verification and additional requirements.
3. Create a Web application OAuth client. Add the local and deployed origins under
   Authorized JavaScript origins. No client secret is used by this browser app.
4. Set `VITE_GOOGLE_CLIENT_ID`, restart/rebuild, and click Import Google.
5. Calendar asks for `calendar.readonly`; the separate Scan Gmail action asks for
   `gmail.readonly`. Access tokens are used in memory, never committed.

Calendar import covers your default calendar: last 30 days through the next year.
Recurring events are imported as individual occurrences. Repeat the import to
refresh changed or removed events in that window. The app never writes to Google.
Email scanning is manual, up to 50 inbox messages from the last 7 days. Parsing is
local; review every date/time. No automatic scheduling or background inbox monitoring.

## 6. Outlook calendar and email (optional)

1. In Microsoft Entra app registrations create an app supporting the account types
   you need, including personal Microsoft accounts if applicable.
2. Add a Single-page application redirect URI: `https://YOUR-SITE/auth.html`.
   Add your local origin plus `/auth.html` for development.
3. Add delegated permissions `Calendars.Read` and, if wanted, `Mail.Read`.
4. Set `VITE_MICROSOFT_CLIENT_ID` to the application/client ID. No secret is needed.
5. Rebuild. Use Import Outlook for the default calendar or Scan Outlook email.

Work/school tenants may restrict app consent and require an administrator. The app
uses a popup sign-in; allow the popup for your planner site. On iPhone, connecting
accounts in Safari may be easier than from the installed Home Screen window.

## 7. Backup and recovery

Connections → Export backup creates a JSON file of planner items and preferences.
Restore merges by ID and replaces matching records. Export the current state first.
Email review excerpts are local-only and not included in the backup or cloud sync.
Browser storage can be cleared by the browser or user; keep a cloud or exported copy.

## Checkpoint status

Read `CHECKPOINT.md` before resuming development. Live cloud/provider/iPhone testing
requires the accounts above and remains pending until credentials are configured.
