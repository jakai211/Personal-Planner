# Personal Planner · Weekwise

**A little structure. A lot more space.**

An offline-first weekly calendar and task planner for desktop and iPhone. Work,
classes, appointments, routines, and task sessions share one modern colored-block
calendar. Built with React, TypeScript, Bootstrap, FullCalendar, and IndexedDB.
Install the website as a PWA; no native app is needed.

> **Development status:** the production build and 11 automated tests pass.
> Browser/mobile QA and live account integrations remain unfinished. The website
> is not deployed yet. See [resume notes](CHECKPOINT.md) for remaining work.

## Feature checklist

☑ Implemented in source · ☐ Pending setup or validation. Checked does not mean a
live cloud connection has been verified. [Full checklist](FEATURES.md).

| Major features | Minor features |
| --- | --- |
| ☑ Unified block calendar | ☑ Work, study, personal categories; custom colors; day/week/month/agenda |
| ☑ Today view | ☑ Next event; daily agenda; top priorities; completion progress |
| ☑ Task inbox | ☑ Undated tasks; priorities; subtasks; deadlines; progress; search |
| ☑ Quick scheduling | ☑ Drag/drop; resize; find open slots; task-linked time blocks |
| ☑ Recurring routines | ☑ Daily/weekly/monthly; every few days; weekdays; end dates; occurrence exceptions |
| ☑ Focus and breathing room | ☑ Appointment buffers; protected focus blocks; quiet hours |
| ☑ Daily review and rollover | ☑ Move tasks to tomorrow; remove deadlines; undo deletion; unfinished tasks retained |
| ☑ Customizable interface | ☑ Light/dark/device theme; accent; text size; spacing; timezone; week start; visible hours |
| ☑ Offline-first storage | ☑ IndexedDB persistence; production app cache; JSON backup/restore |
| ☑ Supabase sync implementation | ☑ Account isolation; version checks; conflict review; ☐ Live account setup/testing |
| ☑ Closed-app reminder implementation | ☑ Cloudflare cron; Web Push; quiet hours; snooze; ☐ Actual iPhone delivery test |
| ☑ Google/Outlook import | ☑ Read-only default calendar; refresh/deduplication; .ics import; ☐ OAuth setup/live tests |
| ☑ Email event suggestions | ☑ Manual Gmail/Outlook scan; local date parsing; review/approve/dismiss; ☐ API setup/live tests |
| ☑ Personal availability | ☑ Copy free slots to share manually |
| ☑ Website/PWA | ☑ Home Screen installation support; ☐ Desktop/mobile browser QA |
| ☑ GitHub and documentation | ☑ Public repo; meaningful commits; setup guide; TXT how-to; feature checklist |
| ☑ Initial verification | ☑ 11 passing behavioral tests; ☑ Production build; ☐ Browser/live integration tests |

Intentionally excluded: travel alerts, shared/multi-user calendars, a native app,
and native iPhone widgets. A future native app can reuse the data model and backend.

## How to run

Use **Node.js 24 LTS** and a browser. No Docker, local database, Android Studio,
or native app tooling is required.

```sh
npm ci
npm run dev
```

Open the address printed in the terminal. The local planner works without accounts.
For an offline-capable production preview:

```sh
npm run build
npm run preview
```

Visit once online to cache the app. The production preview includes the service
worker; the development server does not install the offline cache.

## How to use

### Today

Open **Today** for your next event, daily agenda, and top priorities. Tap an event
to edit it or a task's circle to complete it. Unfinished work remains available.

### Plan your week

Open **My week**. Click or select an empty time to add a block. Use categories for
work, school, personal plans, or anything else. Switch between Day, Week, Month,
and Agenda. Drag a block to move it and drag its lower edge to resize it. On mobile,
long-press to drag. Tap a block to edit its details. Recurring blocks support
editing the whole routine or an individual occurrence.

### Capture tasks and find time

Use **Task inbox** to capture something without deciding when to do it. Type in
the quick-add field and press Enter. Open a task to add priority, due date, notes,
subtasks, progress, or a reminder. Tap its clock to find a free slot, or drag a task
from the calendar sidebar onto the calendar. Scheduling a task creates a linked
work block; it stays in the task list until completed.

### Routines, buffers, and focus

In the editor choose Daily, Weekly, or Monthly, then set an interval, weekdays, or
end date. A repeating task needs a due time; completing it creates the next task.
Appointment buffers add breathing room after events. Set the default in Customize.
Mark a block as focus time to protect it from suggested scheduling. Quiet hours
defer reminders and are excluded from suggested task slots.

### Review and carry forward

Open **Daily review** to move unfinished tasks to tomorrow, remove an unnecessary
deadline, or let a task go. Deletion has an Undo action. Reserve tomorrow's focus
time or copy a few available slots to paste into your own message.

### Make it yours

Open **Customize** for planner name, light/dark/device theme, accent, text size,
spacing, categories and colors, week start, timezone, clock format, calendar hours,
default buffer, and quiet hours. Work and classes use the same block layout.

### Calendar imports

In **Connections**, import your default Google or Outlook calendar after provider
setup, or import an `.ics` file without an account. Imports cover the last 30 days
through the next year. Reimport to refresh changes; the original calendar is never
edited. Imported routines are expanded into individual occurrences.

### Email suggestions

Open **Event suggestions** and choose Scan Gmail or Scan Outlook email after API
setup. A manual scan reads up to 50 inbox messages from the last seven days. Date
parsing runs on this device; no AI service receives the emails. Review the proposed
date, time, and timezone before adding an event. Ambiguous dates and missing times
need correction. Nothing is added automatically. Suggestions and short excerpts
remain on the device and are excluded from cloud sync and planner backups.

### iPhone installation and reminders

After deployment, open the HTTPS website in Safari. Choose **Share → Add to Home
Screen**, then open it from its icon. After cloud/reminder setup, sign in and choose
**Connections → Enable on this device**. Create an event or task with a reminder
and wait for sync before closing. Tap a notification to view or snooze it.

Closed-app reminders need the included cloud worker, network access, and OS
permission. They are not exact alarms: Focus settings, outages, and cloud limits
can delay delivery. Native Home Screen widgets are outside this web-only version.

### Backup and sync

Connections includes JSON export and restore. Restore merges by ID and replaces
matching items; export first to preserve your current state. Browser storage can
be cleared, so keep a backup or cloud copy.

Guest and signed-in planners are separate. Use **Copy offline items into account**
once to migrate guest items. Signing into the same Supabase account on phone and
PC enables sync. Offline edits remain pending. Conflicts preserve both versions
for review in Connections. GitHub stores code, not your calendar data.

## Setup and deployment

Follow [START-HERE.md](START-HERE.md) for the full account/API instructions:

1. Create Supabase and run `cloud/schema.sql` with row-level security.
2. Copy `.env.example` to ignored `.env.local` and add public frontend values.
3. Connect this repo to Cloudflare Pages: build `npm run build`, output `dist`.
4. Deploy the optional reminder worker with private secrets stored in Cloudflare.
5. Configure Google/Microsoft OAuth and email permissions only if you want them.

Cloudflare supplies an HTTPS `pages.dev` address; no DuckDNS is needed. The deployed
site works when your laptop is off. Pages can rebuild after pushes once its GitHub
integration is configured. Free-plan quotas/availability still apply.

## Architecture

```text
src/main.tsx          Navigation, calendar, Today, tasks, daily review
src/panels.tsx        Editors, preferences, account/import controls
src/model.ts         Shared types, recurrence, scheduling, validation
src/store.ts         IndexedDB and version-checked Supabase sync
src/integrations.ts  Calendar OAuth/import and push registration
src/mail.tsx         Local email suggestion review
src/style.css        Responsive Bootstrap customization
src/sw.ts            Offline app cache and notification handling
cloud/schema.sql     Database tables, RLS, atomic sync and delivery claims
cloud/reminders.ts   Server-scheduled Web Push sender
cloud/wrangler.toml  Worker configuration and minute cron
tests/planner.test.ts Behavioral tests
```

Each local record has an owner partition, version, dirty flag, deletion marker,
and edit stamp. Writes save locally before cloud sync. The database function
checks versions atomically. New edits made during an upload stay pending; pulled
records cannot overwrite dirty local data. Deleted records retain tombstones.

The reminder worker reads cloud records, expands recurrences, respects quiet hours,
claims deliveries, validates push hosts, and removes expired subscriptions. It
retries within a 15-minute catch-up window; networks cannot ensure exactly-once
delivery. New offline changes must sync before the worker can act on them.

## Development and verification

```sh
npm test
npm run build
npm run deploy:reminders
```

The first two commands pass at this save point. Eleven tests cover DST-safe
recurrence, weekday exceptions, buffer/quiet-hour scheduling, invalid dates and
backups, edits during sync, conflict copies, account partitioning, deletion markers,
reminder timing, and push-host validation. Browser testing, OAuth, real two-device
cloud sync, and iPhone push delivery remain pending.

## Security and privacy

- Never commit `.env.local`, service-role keys, private VAPID keys, backups, or emails.
- `VITE_` variables are public: only public project keys and client IDs belong there.
- Supabase RLS isolates accounts; writes use authenticated version checks.
- Provider API setup can require verification or work/school administrator consent.
- Email text is displayed as text, not executed as instructions or trusted HTML.

## Guides and ongoing work

[Plain-text usage guide](HOW-TO-USE.txt) · [Detailed setup](START-HERE.md) ·
[Feature checklist](FEATURES.md) · [Resume notes](CHECKPOINT.md)

Work is saved in descriptive commits and pushed as changes are made. There is no
unattended background updater. Future requested updates should include verification,
updated documentation, and a plain-language commit naming the feature changed.
