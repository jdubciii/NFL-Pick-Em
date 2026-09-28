# tasks.md

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

