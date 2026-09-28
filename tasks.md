# tasks.md

## Phase 5: Client UI Integration (Frontend)
*Instructions: Copy and paste the blocks below one by one into your Antigravity IDE. Do not proceed to the next prompt until the IDE successfully completes the current one.*

### Prompt 5.1: Auth & Navigation UI
> "Initialize a new frontend application in a `client` directory using Vite with React and TypeScript. Install Tailwind CSS and set it up. Install `react-router-dom`. Create a global React Context for Authentication that stores the JWT and user role. Build a `Login` component that hits our `POST /api/auth/login` endpoint, and a responsive Navbar that only shows navigation links if the user is logged in. Route all unauthenticated users to the Login page."

### Prompt 5.2: Weekly Slate & Picks UI
> "Create a `WeeklyPicks` React component. Fetch the upcoming NFL games from our backend and render them as a list of visually distinct matchup cards using Tailwind CSS. For each card, display the Home and Away teams, and the kickoff time. Add interactive buttons for the user to select their predicted winner, which triggers a `POST` to `/api/picks`. Implement visual logic: if the current time is past the kickoff time minus the pool lock offset, disable the buttons and display a 'Locked' badge."

### Prompt 5.3: Live Leaderboard & Penalty Tracker
> "Create a `Leaderboard` React component. Fetch data from `GET /api/pools/:pool_id/leaderboard`. Render the results in a clean, modern data table sorted by total points descending. Check the `is_weekly_loser` boolean flag returned by the API; if it is true, apply a distinct red background to that user's row and add a 🚨 emoji or 'PENALTY' badge next to their name so the group's weekly loser is prominently shamed."

### Prompt 5.4: Admin Dashboard
> "Create an `AdminDashboard` React component that is protected by a route checking if `user.role === 'ADMIN'`. Build a UI that fetches all users' picks for the current week. Provide a dropdown to select a user, and a set of override buttons to change their pick. When submitted, this should call our `PUT /api/admin/picks` endpoint. Add a toast notification indicating that the override was successful and the action was written to the audit log."