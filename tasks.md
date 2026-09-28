# tasks.md

## Phase 7: Cumulative Stats & Penalty Engine

### Prompt 7.1: Schema Migrations
> "Update the `schema.prisma` file to add two new models: `PoolMemberStat` and `PenaltyLedger`. 
> 1. `PoolMemberStat` must have `pool_id` and `member_id` as a composite primary key, linking to `Pool` and `PoolMembership`. Include integer fields `total_shots_drank`, `first_place_finishes`, and `dead_place_finishes` (default 0), and an `updated_at` timestamp.
> 2. `PenaltyLedger` needs an `id` (UUID), relations to `Pool` and `PoolMembership`, `week_number` (Int, optional), `delta` (Int), `reason` (String), `created_by` (relation to User), and `created_at`.
> Generate and run the Prisma migration. Finally, update our TypeScript interface for `PoolSettings` to include the new `penalties` configuration object."

### Prompt 7.2: Finalization Pipeline
> "Create a new service function `executeWeeklyWrapUp(poolId: string, weekNo: number)` in `src/services/weeklyWrapUp.ts`. It should use a Prisma transaction to: 
> 1. Query all finalized `pick_results` for the given pool and week to calculate total scores.
> 2. Identify the top scorer and increment their `first_place_finishes` in `PoolMemberStat`.
> 3. Identify the lowest scorer (the 'Dead Place'). Create a `PenaltyLedger` record for them with a delta based on `pool.settings.penalties.dead_place_penalty` and reason 'WEEKLY_DEAD_PLACE'. 
> 4. Increment their `dead_place_finishes`.
> 5. Recalculate their `total_shots_drank` by summing their records in `PenaltyLedger`. Ensure ties are handled by assigning the penalty to all tied lowest scorers."

### Prompt 7.3: API Expansion
> "Add two new API endpoints in `src/server.ts`:
> 1. `GET /api/pools/:pool_id/leaderboard/cumulative`: Returns the joined `PoolMembership` and `PoolMemberStat` data, allowing sorting by shots, wins, or dead place finishes.
> 2. `POST /api/pools/:pool_id/penalties/adjust`: Protected by `requireAdmin`. Accepts `member_id`, `delta` (integer), and `reason`. It must insert a new record into `PenaltyLedger` and then automatically trigger a recalculation of that user's `total_shots_drank` in `PoolMemberStat`."

### Prompt 7.4: Wall of Shame UI
> "In the React frontend, create a new route and component `WallOfShame`. It should fetch the cumulative leaderboard data. Build a highly visual 'Dead Place Crown' banner pinning the user with the most `dead_place_finishes`. Below it, build a 'Shot Odometer' displaying the sum of all `total_shots_drank` in the pool. Finally, build a data table showing the season-long cumulative stats (Correct Picks %, 1st Place Finishes, Dead Place Finishes, Cumulative Shots)."

### Prompt 7.5: Admin Controls UI
> "Create a new React component `AdminPenaltyModal`. It should take a `member_id` as a prop and display a stepper/number input for the `delta` (allowing positive or negative integers) and a text input for the `reason`. On submit, call the `POST /api/pools/:pool_id/penalties/adjust` endpoint. Below the form, display a read-only list of that user's past `PenaltyLedger` entries so the admin can audit the history."