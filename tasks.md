# tasks.md

## Phase 2: External Data Ingestion (Sync Worker)
*Instructions: Copy and paste the blocks below one by one into your Antigravity IDE. Do not proceed to the next prompt until the IDE successfully completes the current one.*

### Prompt 2.1: API Client Setup
> "Create a `src/services/nflApiClient.ts` file. Define a TypeScript interface for our expected NFL Game Data (including external ID, home team, away team, kickoff time, status, and scores). Then, write a function that fetches the current week's NFL schedule and live scores. To keep things simple and free for our MVP, use the public ESPN NFL API endpoint (`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`) and map its JSON response to our custom interface."

### Prompt 2.2: The Sync Worker
> "Install the `node-cron` package and its TypeScript types. Create a new file `src/workers/syncWorker.ts`. Set up a cron job that runs every 5 minutes. Inside this job, call the `nflApiClient` function we just created to fetch the latest NFL data. For this step, just log the fetched games to the console so we can verify the data is flowing properly before writing to the database."

### Prompt 2.3: Upsert Logic
> "Update `src/workers/syncWorker.ts` to save the fetched ESPN data into our PostgreSQL database using Prisma. Iterate over the fetched games and use Prisma's `upsert` method on the `Game` model, matching on the `external_game_id`. If the game doesn't exist, `create` it. If it does exist, `update` the `status`, `home_score`, `away_score`, and `kickoff_time`. Ensure this logic accurately translates the ESPN game status into our database Enums (SCHEDULED, IN_PROGRESS, FINAL)."

### Prompt 2.4: Fallback Handling
> "Wrap the main logic inside `src/workers/syncWorker.ts` in a robust `try/catch` block. If the ESPN API fails, times out, or returns invalid data, catch the error, log a clear warning to the console ('NFL API Sync Failed, skipping cycle to preserve local state'), and exit the current worker cycle gracefully without crashing the Node process. Finally, add a script in `package.json` to start this worker, and provide me with the terminal command to run it."