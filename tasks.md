# tasks.md

## Phase 6: League Simulation & Seed Data
*Instructions: Copy and paste the blocks below one by one into your Antigravity IDE. Do not proceed to the next prompt until the IDE successfully completes the current one.*

### Prompt 6.1: Mock User Generation
> "Create a `prisma/seed.ts` file. Write a script that first clears out existing data (ignoring the primary admin user if possible, or recreating them). Then, generate 9 dummy users with mock emails and hashed passwords. Create a single 'Main League' Pool assigned to the admin, and insert `PoolMembership` records attaching all 9 dummy users and the admin to this pool."

### Prompt 6.2: Historical Game Seeding
> "Update `prisma/seed.ts`. Create an array of 16 mock NFL games representing a past completed week. Hardcode their `status` to 'FINAL', set their `kickoff_time` to a date in the past, and assign random integers for `home_score` and `away_score`. Use a Prisma transaction or `createMany` to insert these games into the database. Save the returned game IDs in an array for the next step."

### Prompt 6.3: Randomized Pick Distribution
> "Extend the `prisma/seed.ts` script to simulate the weekly picks. Loop through every user in the pool (the 9 mock users + the admin). For each user, loop through the array of inserted game IDs. Randomly select either the `home_team_id` or `away_team_id` (or occasionally null to simulate an omitted pick) and create a `Pick` record. Ensure `submitted_by` matches the `user_id`."

### Prompt 6.4: Leaderboard Population
> "Finally, update `prisma/seed.ts` to grade these picks so our leaderboard populates. Import the `gradeFinalizedGames(gameIds)` function from `src/services/scoringEngine.ts`. Pass the array of our seeded game IDs into this function at the very end of the seed script so it calculates points and writes the immutable `PickResult` records. Update `package.json` with a `\"seed\": \"ts-node prisma/seed.ts\"` script (or the exact tsx/vite-node equivalent you are using) and tell me the terminal command to run it."