# NFL Pick 'Em

A private pick'em league app for a 10-person family-and-friends league — weekly picks across the full NFL schedule, a designated tiebreaker game each week, and a season standings ladder where your finish decides what you owe.

**Status:** Live and in weekly use for the 2026 season.

## What it does

- **Full-season schedule, no app updates needed** — all 18 weeks of games are ingested, validated, and stored server-side; future weeks are browsable in advance, and scores, final statuses, and flex-schedule kickoff changes flow in as refreshes.
- **Weekly picks with kickoff locks** — pick every game each week; picks lock at kickoff and can't be changed after.
- **Tiebreaker game** — each week the commissioner designates one game (Detroit Lions game by default) where members also predict the total points scored. Closest prediction wins the week; at-or-under wins an exact-distance tie.
- **Standings ladder with placement penalties** — weekly finishes map to a penalty ladder (1st owes nothing, down to 2.5 for last place), tracked across the season.
- **Open pool matrix** — every member's picks and tiebreaker predictions are visible to the whole pool at all times. That's the fun of the league.
- **Commissioner tools** — refresh the slate from the schedule source, preview a week, and settle results against the exact slate revision members picked on.

## How it's built

| Layer | Tech |
|---|---|
| Client | React, TypeScript, Tailwind CSS |
| Mobile | Capacitor (Android; iOS later) |
| API | Node.js, Express |
| Data | PostgreSQL (Supabase), Prisma ORM |
| Auth | Supabase Auth — the API verifies member JWTs and fails closed |
| Hosting | Render |

### Architecture notes

- **Canonical persisted slate:** schedule data flows ESPN → validation → a persisted, accepted slate revision. The app reads from the database, never directly from the schedule source, and settlement runs against that same revision.
- **Atomic pick writes:** pick submissions are upserts, so a member changing a pick before kickoff never creates duplicates.
- **Server-enforced deadlines:** kickoff locks are enforced by the API, not just hidden in the UI.

## About this project

Designed and directed by a non-technical product owner working with an AI-assisted development workflow — product decisions, acceptance testing, and releases are human-led; implementation is agent-built and independently reviewed before it ships.
