# tasks.md

## Phase 1: Foundation & Persistence (Database)
### Prompt 1.1: Database Initialization
> "Initialize a new Node.js and TypeScript project. I want to use PostgreSQL as my database and Prisma as my ORM. Please generate the `package.json` with the necessary dependencies, set up a basic `tsconfig.json`, and create a `docker-compose.yml` file that spins up a local PostgreSQL 16 instance. Include a `.env.example` file with the default database connection string."

### Prompt 1.2: Core Schema Execution
> "Initialize Prisma and update the `schema.prisma` file to include the core tables for our NFL Pick'em app. Use UUIDs for all primary keys. Create models: User, Pool, PoolMembership, and Game with their defined fields."

### Prompt 1.3: Transactional Schema Execution
> "Extend the `schema.prisma` file with our transactional tables ensuring strict relational integrity. Add Pick, PickResult, and AuditLog models. Run the command to create and apply the initial database migration."

### Prompt 1.4: ORM/Database Client Setup
> "Create a `src/db/client.ts` file that instantiates and exports a singleton Prisma Client. Then write a simple `src/db/test.ts` script to verify the connection."

## Phase 2: External Data Ingestion (Sync Worker)
### Prompt 2.1: API Client Setup
> "Create a `src/services/nflApiClient.ts` file. Define a TypeScript interface for our expected NFL Game Data. Write a function that fetches the current week's NFL schedule and live scores using the public ESPN API."

### Prompt 2.2: The Sync Worker
> "Install `node-cron`. Create `src/workers/syncWorker.ts` and set up a cron job that runs every 5 minutes calling our `nflApiClient`."

### Prompt 2.3: Upsert Logic
> "Update `syncWorker.ts` to save the fetched ESPN data into PostgreSQL using Prisma's `upsert` on the `Game` model matching `external_game_id`."

### Prompt 2.4: Fallback Handling
> "Wrap the main logic inside `syncWorker.ts` in a robust try/catch block to log failures and exit gracefully without crashing if the NFL API is down."

## Phase 3: Core Backend & Game Mechanics (Picks & Locking)
### Prompt 3.1: Auth & RBAC
> "Install `express`, `jsonwebtoken`, and `bcrypt`. Create a `/api/auth/login` endpoint and `requireAuth`/`requireAdmin` middlewares."

### Prompt 3.2: Pick Submission Endpoint
> "Create a `POST /api/picks` route protected by `requireAuth` to insert or update a record in the `Pick` table using a composite key."

### Prompt 3.3: Granular Locking Engine
> "Update `POST /api/picks` to calculate lock thresholds from `game.kickoff_time` minus `pool.lock_offset`. Reject late picks with a 403 status."

### Prompt 3.4: Admin Override & Audit Logging
> "Create a `PUT /api/admin/picks` route. Safely execute a Prisma `$transaction` to update the pick and append a record to the `AuditLog` table."

## Phase 4: Scoring Engine & Leaderboard
### Prompt 4.1: Finalization Trigger
> "Update `syncWorker.ts` to detect when an incoming game status changes to 'FINAL'. Trigger a placeholder `gradeFinalizedGames` function."

### Prompt 4.2: Scoring Execution
> "Create `src/services/scoringEngine.ts`. Grade all picks for a finalized game against the winning team, assigning points based on pool settings."

### Prompt 4.3: Immutability Enforcement
> "Update the engine to commit results to the `PickResult` table. Skip any `pick_id` that already has an existing result to prevent double-scoring."

### Prompt 4.4: Leaderboard Aggregation
> "Create `GET /api/pools/:pool_id/leaderboard`. Fetch and sum up points awarded, sorting users descending, and append an `is_weekly_loser` flag to the lowest score."

## Phase 5: Client UI Integration (Frontend)
### Prompt 5.1: Auth & Navigation UI
> "Initialize a Vite/React/TypeScript frontend with Tailwind. Build a global Auth Context, a Login component, and protected routing."

### Prompt 5.2: Weekly Slate & Picks UI
> "Create a `WeeklyPicks` component. Fetch upcoming games and render visually distinct matchup cards with interactive pick selection. Apply 'Locked' visual states."

### Prompt 5.3: Live Leaderboard & Penalty Tracker
> "Create a `Leaderboard` component displaying a data table sorted by total points. Highlight the row with `is_weekly_loser` in red."

### Prompt 5.4: Admin Dashboard
> "Create an `AdminDashboard` component to select users, override picks, and display toast notifications."

## Phase 6: League Simulation & Seed Data
### Prompt 6.1: Mock User Generation
> "Create a `prisma/seed.ts` script. Generate 9 dummy users and establish `PoolMembership` records attaching them to a main pool."

### Prompt 6.2: Historical Game Seeding
> "Update `seed.ts` to insert an array of 16 mock NFL games with hardcoded 'FINAL' statuses and random scores."

### Prompt 6.3: Randomized Pick Distribution
> "Extend `seed.ts` to randomly distribute picks across all mock users for all seeded games."

### Prompt 6.4: Leaderboard Population
> "Execute the `gradeFinalizedGames` function at the end of the seed script to calculate points and populate the leaderboard."

## Phase 7: Cumulative Stats & Penalty Engine
### Prompt 7.1: Schema Migrations
> "Update `schema.prisma` with `PoolMemberStat` and `PenaltyLedger` models. Generate the migration."

### Prompt 7.2: Finalization Pipeline
> "Create `executeWeeklyWrapUp(poolId, weekNo)`. Use a transaction to identify 1st and Dead Place, write to `PenaltyLedger`, and recalculate stats."

### Prompt 7.3: API Expansion
> "Add `GET /api/pools/:pool_id/leaderboard/cumulative` and `POST /api/pools/:pool_id/penalties/adjust` endpoints."

### Prompt 7.4: Wall of Shame UI
> "Build the `WallOfShame` component featuring a 'Dead Place Crown' banner, Shot Odometer, and season-long stat table."

### Prompt 7.5: Admin Controls UI
> "Build the `AdminPenaltyModal` to allow manual `PenaltyLedger` adjustments with a read-only audit history."

## Phase 8: Square Sheet Matrix & Precision Tiebreaker Engine [✅ COMPLETED]
*Instructions: Copy and paste the blocks below one by one into your Antigravity IDE. Do not proceed to the next prompt until the IDE successfully completes the current one.*

### Prompt 8.1: Precision Schema Migrations [✅]
> "Update the `schema.prisma` file. Change `total_shots_drank` in `PoolMemberStat` and `delta` in `PenaltyLedger` from `Int` to `Decimal` with a scale of 2. Add a new model called `WeeklySubmission` with `id`, `pool_id`, `member_id`, `week_number`, and `tie_breaker_prediction` (Decimal, nullable). Enforce a unique constraint on `[pool_id, member_id, week_number]`. Update the TypeScript interfaces for `PoolSettings` to include the new `tiebreaker`, `picking_mode`, and `hide_picks_until_kickoff` properties as defined in our spec. Generate and apply the Prisma migration."

### Prompt 8.2: Precision Tiebreaker Pipeline [✅]
> "Update the `executeWeeklyWrapUp` function in `src/services/weeklyWrapUp.ts`. After calculating weekly scores, find the target tiebreaker game based on `settings.tiebreaker.game_target` and calculate its actual total score. Query `WeeklySubmission` to get everyone's `tie_breaker_prediction`. Sort the users first by points (DESC) and then by absolute distance to the tiebreaker total (ASC). If there is a tie for dead place, divide the `settings.penalties.dead_place_penalty` by the number of tied users to get a `split_penalty` decimal, and write that exact decimal to the `PenaltyLedger`."

### Prompt 8.3: Matrix API Endpoint [✅]
> "Create a new route `GET /api/pools/:pool_id/matrix` protected by `requireAuth`. Build a response payload that structured exactly like our spec: an object containing `metadata` (week, picking_mode), `columns` (array of members), `rows` (array of games with spread and kickoff times), a 2D map `cells` nested by `game_id` and then `member_id`, and a `summary` object containing each member's weekly wins, tiebreaker guess, and cumulative shots. Do not return flat arrays; format it specifically as this nested map for O(1) frontend rendering."

### Prompt 8.4: Anti-Peeking Middleware [✅]
> "Inside the new `GET /api/pools/:pool_id/matrix` endpoint, implement the anti-peeking security layer before sending the response. Iterate through every pick in the `cells` map. Check the pool's `hide_picks_until_kickoff` setting. If true, evaluate `game.kickoff_time`. If the game hasn't started yet, AND the pick belongs to a member other than the requesting user, AND the user is not an ADMIN: overwrite `selected_team_id` to `null` and set `is_masked: true`. Otherwise, set `is_masked: false`."

### Prompt 8.5: LeagueMatrixView UI [✅]
> "In the React frontend, create `LeagueMatrixView.tsx`. Use standard HTML `<table>` or CSS Grid to build a spreadsheet layout. The Y-axis (rows) should be the NFL games. The X-axis (columns) should be the members. Implement sticky positioning so the member names and game matchups stay visible when scrolling. For the cells: if `is_masked` is true, render a lock icon. If the game is 'FINAL', apply a light green background if `is_correct` is true, or light red if false. At the bottom, render summary footer rows displaying the Tiebreaker Guess, Weekly Wins, and Cumulative Shots (formatted to 2 decimals)."

## Phase 9: Rule Engine Expansions & Dispatch [✅ COMPLETED]
### Prompt 9.1: Schema & Settings Migrations [✅]
> "Update `schema.prisma`. Add `is_finalized` (Boolean) to `WeeklySubmission` and `commissioner_notes` (String) to `Game`. Update `PoolSettings` type to include `lockMode`, `excludedGameWindows`, and `tieBreakerType`. Generate and apply the migration."

### Prompt 9.2: Dual-Mode API Middleware [✅]
> "Update `GET /api/pools/:pool_id/matrix`. Implement Dual-Mode Visibility. If `hide_picks_until_kickoff` is true, mask unstarted games. If false, expose picks for unstarted games ONLY if the opponent's `WeeklySubmission.is_finalized` is true."

### Prompt 9.3: Scoring Exclusion Pipeline [✅]
> "Update the `executeWeeklyWrapUp` and scoring engines. Check `pool.settings.excludedGameWindows`. If a game matches an excluded window, skip point allocation entirely."

### Prompt 9.4: Matrix Dispatch & Print Styles [✅]
> "Update `LeagueMatrixView.tsx`. Add `@media print` Tailwind utilities to enforce landscape letter formatting. Add a 'Generate Dispatch' button to format the matrix state into a clipboard-ready plaintext summary block."

## Phase 10: Shot-Cam Penalty Portal (Storage Infrastructure)
### Prompt 10.1: Supabase Storage & RLS
> "Write the SQL/Supabase commands to create a `penalty-media` bucket. Apply Row-Level Security policies restricting SELECT to pool members and INSERT/UPDATE to the penalty owner or the commissioner."

### Prompt 10.2: Media CRUD API
> "Create endpoints in Express: `POST /api/pools/:pool_id/penalties/:id/media` to register the Supabase path to the `PenaltyMedia` table, and `PATCH /api/pools/:pool_id/penalties/:id/media/confirm` for the commissioner to flip the status."

### Prompt 10.3: PenaltyLedgerView UI
> "Build an upload component in React. Enforce client-side file compression (max 20MB video, 5MB image). Render a 'Shot Confirmed' status chip when `status === 'CONFIRMED'`."

## Phase 11: UX Accelerators & Social Presets
### Prompt 11.1: Gamified Viewport Selector
> "Build a top-level UI toggle component mapping to Cards, Slate, and Matrix views in the picks dashboard."

### Prompt 11.2: Standard Presets
> "Build a `PickPresetControls` component. Implement client-side deterministic functions for 'All Home', 'All Away', and 'Favorites' that iterate over the active DOM/state to auto-fill the form without hitting the backend."

### Prompt 11.3: Social Presets (Contrarian & Mirror)
> "In `PickPresetControls`, build 'Contrarian' and 'Mirror Rival' logic. These must be disabled if `hide_picks_until_kickoff` is true. They should calculate distributions from the currently visible matrix cells and auto-fill the form strictly in client memory."