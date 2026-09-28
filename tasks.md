# tasks.md

## Phase 4: Scoring Engine & Leaderboard
*Instructions: Copy and paste the blocks below one by one into your Antigravity IDE. Do not proceed to the next prompt until the IDE successfully completes the current one.*

### Prompt 4.1: Finalization Trigger
> "Update the `src/workers/syncWorker.ts` file. When you are upserting games into the database, check if the incoming ESPN game status is 'FINAL' and the existing database status was NOT 'FINAL'. If a game just finished, collect its `game_id` into an array. After the upsert loop is complete, if there are newly finalized games, log 'Triggering scoring engine for games: [ids]' and pass them to a new, empty placeholder function called `gradeFinalizedGames(gameIds)` which we will build in the next step."

### Prompt 4.2: Scoring Execution
> "Create a new file `src/services/scoringEngine.ts` and define the `gradeFinalizedGames(gameIds: string[])` function. For each `game_id`, query the `Game` to determine the winning team based on `home_score` and `away_score` (handle ties if applicable). Then, query all `Pick` records associated with this game. Iterate through them: if `selected_team_id` matches the winner, calculate `points_awarded` by extracting the win value from the related `Pool.settings` JSON (default to 1 point if undefined). If `selected_team_id` is null or incorrect, `points_awarded` is 0."

### Prompt 4.3: Immutability Enforcement
> "Update the `gradeFinalizedGames` function in `src/services/scoringEngine.ts` to commit the graded results to the database. For each graded pick, use Prisma to create a record in the `PickResult` table with `is_correct`, `points_awarded`, and `finalized_at = new Date()`. To ensure strict immutability and prevent double-scoring, write a Prisma query at the top of the loop that skips any `pick_id` that already has an existing record in the `PickResult` table."

### Prompt 4.4: Leaderboard Aggregation
> "In `src/server.ts`, create a new endpoint `GET /api/pools/:pool_id/leaderboard` protected by the `requireAuth` middleware. Write a query that fetches all users in the pool and sums up their `points_awarded` from the `PickResult` table. Sort the response array descending by total points to create the leaderboard. Finally, calculate the user with the absolute lowest score and append a boolean flag `is_weekly_loser: true` to their object so the frontend can easily highlight them for the penalty. Return this leaderboard as JSON."