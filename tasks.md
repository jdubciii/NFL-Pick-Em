# tasks.md

## Phase 1: Foundation & Persistence (Database)
*Instructions: Copy and paste the blocks below one by one into your Antigravity IDE. Do not proceed to the next prompt until the IDE successfully completes the current one.*

### Prompt 1.1: Database Initialization
> "Initialize a new Node.js and TypeScript project. I want to use PostgreSQL as my database and Prisma as my ORM. Please generate the `package.json` with the necessary dependencies, set up a basic `tsconfig.json`, and create a `docker-compose.yml` file that spins up a local PostgreSQL 16 instance. Include a `.env.example` file with the default database connection string."

### Prompt 1.2: Core Schema Execution
> "Initialize Prisma and update the `schema.prisma` file to include the core tables for our NFL Pick'em app. Use UUIDs for all primary keys. 
> Create the following models:
> 1. `User`: id, email (unique), password_hash, role (Enum: ADMIN, USER), created_at.
> 2. `Pool`: id, name, admin_id (relation to User), settings (JSON for point weights/tiebreakers), status (Enum: ACTIVE, INACTIVE).
> 3. `PoolMembership`: pool_id, user_id, status (Enum: ACTIVE, INACTIVE). Make the primary key a composite of (pool_id, user_id).
> 4. `Game`: id, external_game_id (String, unique index), home_team_id, away_team_id, kickoff_time (DateTime), status (Enum: SCHEDULED, IN_PROGRESS, FINAL), home_score (Int, optional), away_score (Int, optional)."

### Prompt 1.3: Transactional Schema Execution
> "Extend the `schema.prisma` file with our transactional tables, ensuring strict relational integrity.
> Add the following models:
> 1. `Pick`: id, pool_id, user_id, game_id, selected_team_id (String, optional to handle omitted picks), submitted_by (relation to User, tracks admin vs user entry), created_at. Add a unique constraint on `[pool_id, user_id, game_id]`.
> 2. `PickResult`: pick_id (Primary Key and relation to Pick), is_correct (Boolean), points_awarded (Decimal), finalized_at (DateTime).
> 3. `AuditLog`: id, actor_id (relation to User), action (String), target_entity_id (String), old_value (JSON), new_value (JSON), timestamp (DateTime).
> Once generated, run the command to create and apply the initial database migration."

### Prompt 1.4: ORM/Database Client Setup
> "Create a `src/db/client.ts` file that instantiates and exports a singleton Prisma Client. Then, write a simple `src/db/test.ts` script that connects to the database, creates a dummy Admin user, and queries it back to verify the database connection and schema are working correctly. Provide the terminal command I need to run this test script."