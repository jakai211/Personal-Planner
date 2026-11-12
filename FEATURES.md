# Feature checklist

☑ Implemented in source · ☐ Pending setup or validation. A checked feature is not a claim that its live cloud connection has been tested.

| Major features | Minor features |
| --- | --- |
| ☑ Shared block layout for all personal planning | ☑ Work, school, personal categories; colors; day/week/month/agenda views |
| ☑ Today dashboard | ☑ Next event; agenda; top priorities; completion progress |
| ☑ Task inbox | ☑ Priorities; subtasks; due dates; progress; completion; search |
| ☑ Scheduling | ☑ Drag/drop; resize; find open slots; task-linked focus blocks |
| ☑ Routines | ☑ Daily/weekly/monthly; intervals; weekdays; end dates; occurrence exceptions |
| ☑ Daily review | ☑ Move unfinished tasks to tomorrow; remove deadlines; undo deletion |
| ☑ Focus and breathing room | ☑ Automatic appointment buffers; protected focus blocks; quiet hours |
| ☑ Customization | ☑ Light/dark/device theme; accent; text size; density; timezone; week start; visible hours |
| ☑ Offline-first persistence | ☑ IndexedDB; app cache; backup export/restore; storage persistence request |
| ☑ Supabase sync implementation | ☑ Version checks; deletion markers; preserved conflicts; account isolation; ☐ Live account setup/testing |
| ☑ Closed-app reminder implementation | ☑ Cloudflare cron worker; Web Push; quiet hours; snooze; ☐ Live iPhone delivery test |
| ☑ Google/Outlook calendar import | ☑ Read-only access; default calendar; refresh/deduplication; .ics import; ☐ OAuth setup/live tests |
| ☑ Email event suggestion implementation | ☑ Manual scan of last 7 days/up to 50 messages; on-device date parsing; review/approve/dismiss; ☐ Provider API setup/live tests |
| ☑ Personal availability | ☑ Copy free time slots for sharing manually |
| ☑ Website/PWA | ☑ iPhone Home Screen support; ☐ Full mobile/browser QA |
| ☑ GitHub and documentation | ☑ Public repository; meaningful commit names; ☑ Detailed README and TXT guide |
| ☑ Initial verification suite | ☑ 11 passing tests: recurrence/DST, sync races/conflicts, persistence, scheduler, reminders; ☐ Import/browser/live cloud testing |

Intentionally excluded: travel alerts, shared/multi-user calendars, a native app, and native iPhone widgets. A future native app can reuse the data model and Supabase backend.
