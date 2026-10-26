# HAG-27 isolated dynamic settlement verification — follow-up

## Scope and safety

Target source is exactly local git object `790cfc84b1c044fd8db8174b2593bf12269dc804` (HAG-27), NOT checkout HEAD. Checkout remained `876b70ba3e6ec8942e6face2acdd450247ea424a`. This follow-up supersedes the earlier report's limitation that release settlement was source-inspection-only; the previous results remain historical evidence.

No checkout/worktree creation, application-code edits, commits, install, network, DB connection, environment loading, app/worker startup, deployment, migrations or production operations. All artifact additions are under the prechecked `/tmp/opencode`. Exact source contains cleanup SQL, but it is intercepted as an ordinary string and modeled by transient in-memory state changes only. No SQL command is sent anywhere and no files/real records are deleted. This is verification, NOT Week8 GO or authorization to settle Week7. Owner facts remain unverified context.

## Execution method

Built-ins only: Node v24.21.0 `node:test`, VM and TypeScript type stripping. Test/config risks and absent project dependencies were inspected in the first pass; no existing test/setup/script is invoked. Source read through local `git show`, with no checkout. No application imports and no unreviewed boot code.

Exact source slices, only export keywords/types stripped, with printed revision, line range and SHA256:

| Release source | Lines | SHA256 |
|---|---|---|
| src/services/wrapUpEngine.ts — executeWeeklyWrapUpForPool | 317–904 | c9857ba1828356996195f033277c577811a7d34b5f828ea8f89bd713957e88ca |
| src/services/wrapUpEngine.ts — runWrapUpEngine | 909–996 | 70b1df86aadb3785bd150d32283069f8e7084b9893f47bfdd40ef62cd5d668a5 |
| src/services/authoritativeSlateService.ts — getAcceptedSlateManifest | 379–417 | 6ba3c0a2749cbc9f15d8cfad1afe2b12b12c1c79365c911f78b1a0238daddaa5 |
| same — normalizeTeamCode | 73–79 | 0caf90d89ce57a72ae785e29075dda7d9ef25773bf73ca7f821f55aa071493e3 |
| src/services/tiebreakerRankingService.ts — comparator + ranking | 57–268 | f0b89b6baa535dfd23699340e47da092de8e458beb6c33f4580308b7b8b47985 |
| src/services/weeklyDesignationService.ts — Lions/default/stored designation | 60–165 | fe55bc91f0843d8da8227e4d84ca64fac947d9eecbd50022ce65cf019704ce5b |
| src/services/lockResolver.ts — exclusion predicate | 119–205 | ab07a57a779c3f02dbf42b57455ffd2ed16dda25ccb9b0654648f5233a0b3d42 |

Thus manifest selection, SQL text, claim insertion/cleanup, finality checking, designation, actual pick scoring, ranking, effects and summary writing execute their real release bodies. No canned manifest/rank/claim return values replace those functions. Dependencies at the I/O boundary are fully isolated. The VM receives no host process, require, fetch, filesystem or timers; its only process binding is a fixed frozen mock `{env:{}}`, not host environment. The job runner is a callback-only mock.

The Prisma double uses serialized snapshot transactions: normal return commits; exception rolls back; SQL failures mark the transaction aborted even if caught by application JS. It derives manifest rows, LEFT JOIN rows and claims from state. It enforces claim composite uniqueness, fixture pick/game/submission unique keys, ledger partial settlement uniqueness, and outbox/inbox dedupe keys. Unknown SQL is recorded, fails, and is asserted absent. Cleanup honors composite key and `summary IS NULL`. Control tests demonstrate rollback after effects, ready retry, successful-run dedupe and competing-attempt uniqueness. This is not PostgreSQL/MVCC integration.

## Schema interpretation at release

Do not equate game tags with pick week semantics:

- `docs/evidence/P41_POST_PURGE_VALIDATION/sql/01_baseline_schema.sql:51–61`: `picks.game_id` is TEXT, `picks.week` is INTEGER NOT NULL, unique `(pool_id,user_id,game_id)`. There is no game FK on that text identity in this documented SQL baseline.
- `02_proposal_a_games_manifest.sql:5–13`: **games** season/week tags are nullable for legacy unclassified records. `:23–33` defines manifest scope/primary key.
- `05_proposal_d_settlement_ledger.sql:5–15`: claim key is `(pool_id,season,week_number)`, nullable summary; `:44–51` adds default season and partial ledger uniqueness.
- `06_proposal_e_picks_security.sql:5–8`: adds selected_team. This supports the engine query selecting both selected_team and selected_team_id.
- `prisma/schema.prisma:94–107`: Game does not expose week or season. `:109–125`: Pick has no week and has a UUID relation, unlike the raw-SQL catalog contract. The harness therefore distinguishes SQL pick rows from ORM game projection; it does not invent a Prisma Pick.week.
- `src/routes/picks.ts:384–407` checks requested week against authoritative game week and persists targetWeek. This supports requested NFL-week semantics, not an assumption about a differently named field.
- Trigger source `06_proposal_e_picks_security.sql:125–170` makes pick identity/week immutable and rejects new writes with unknown game identities. Orphan fixtures represent pre-existing historical/inconsistent state, NOT normal writes accepted by this trigger.

These are LOCAL documented schema contracts, not independent catalog verification. Actual deployed schema and generated Prisma client remain unknown. Nullable-pick and seasonless-claim profiles are explicitly hypothetical compatibility tests, not supported-production assertions. Enhanced ORM game projection exposing tags is also conditional: it is not the checked-in Prisma Game schema.

## New test outcomes

Command exited 0: **14 tests, 14 passed, 0 failed, 0 skipped** (first and only run). A pass may establish a risk, not safety.

| # | Scenario | Observed result |
|---|---|---|
| 1 | Documented schema | Rejects null-week fixture; confirms checked-in Prisma Game has no tags. |
| 2 | Manifest + W7/W8/W9 requested-week picks; W8/W9 pending | Settles W7: A=1, B=0; selects W7 designation, W7 predictions; repeated call dedupes without extra effects. |
| 3 | Manifest + W7 pending, then final | First WEEK_NOT_FINAL, normal COMMIT with claim inserted then cleanup removing it in memory; zero effects/claims remain. Ready retry applies successfully. |
| 4 | Same pending/retry on seasonless claim profile | Cleanup and retry succeed. Hypothetical compatibility schema, not proposal D production contract. |
| 5 | No manifest + ORM exposes tags | Tagged/pick-ID fallback isolates W7 from pending W8. Conditional enhanced-schema profile only. |
| 6 | No manifest + no tagged games | Pending W8 blocks final W7. Cleanup succeeds; after W8 final, retry applies with correctly week-filtered scores A=1/B=0. Thus finality leaks, but non-null-week scoring does not leak in this fixture. |
| 7 | No manifest + checked-in Prisma-style projection | Underlying DB tags are invisible to ORM result. Pending W8 blocks final W7; cleanup leaves no claim/effects. |
| 8 | No manifest + explicit previewRevision | STALE_PREVIEW_REVISION before claim; no fallback mutation. |
| 9 | Manifest table absent, previewRevision omitted | Real helper returns null; no-tags fallback lets pending W8 block W7. Cleanup succeeds. |
| 10 | Hypothetical nullable legacy pick week WITH manifest | Null-week W8/W9 picks included by actual SQL predicate; B=2 beats W7 A=1; W7 charge changes to A. Manifest still selects W7 tiebreak. NOT possible under documented NOT NULL picks.week. |
| 11 | Nullable legacy week + tagged-game fallback | Null-week W8 game expands resolved set and pending W8 blocks W7. Doubly conditional profile. |
| 12 | Manifest valid/final but ALL W7 picks fail game join, then mapping recovery | AUTHORITATIVE_SLATE_UNAVAILABLE returns normally and COMMITs one claim with null summary, no effects. After synthetic input mapping repair, retry ALREADY_WRAPPED_UP. A fresh independent in-memory control with recovered inputs and no prior claim applies successfully. |
| 13 | Injected application exception after ledger/stats/outbox effects | Entire draft (claim and effects) rolls back. Ready competing retries produce one success, one ALREADY_WRAPPED_UP; single claim/ledger charge, two unique outbox/inbox rows. |
| 14 | Exact runWrapUpEngine wrapper | Calls exact tested function with W7/season/preview revision; one pool applied, recorded accepted_revision=1. |

### Source explanation

All references below are at `790cfc84`:

- `wrapUpEngine.ts:535–567`: manifest or tagged-game/pick-ID selection. Without manifest, initial `games = allGames` remains if no tags exposed/matching. This dynamically reproduces cross-week **finality blocking**, not blanket all-week scoring for non-null pick weeks.
- `:643–651`: LEFT JOIN with `(p.week = requested OR p.week IS NULL)` is separate from manifest membership. Requested non-null W8 picks are excluded; nullable legacy rows are included, even outside accepted manifest. NOT NULL SQL baseline makes the latter scenario conditional only.
- `:480–497`, `:582–595`: pending branch invokes cleanup before normal return. With modeled valid schema/permissions, cleanup succeeds and retry works. The earlier checkout's pending-claim bug is NOT reproduced here on this release branch.
- `:653–661`: when returned picks are nonempty and zero join games, returns AUTHORITATIVE_SLATE_UNAVAILABLE **without cleanup**. Marker has already been inserted at `:415–436`. This different refusal consumes the claim. Trigger/catalog assumptions determine whether such orphan state exists; no claim is made that production contains it. Recovery fixture adjusts only in-memory test inputs; it is NOT a proposed production repair path (normal pick identity changes are prohibited by trigger).
- `:363–375`: explicit preview revision blocks absent/stale manifest before claim. Admin route does not require previewRevision, so omitted-preview fallback is source-reachable, not a test-only options bypass.

## Release caller wiring

Source proof (no HTTP request, app import, or server startup):

1. `src/server.ts:16` imports adminOpsRouter; `:51` mounts at `/api/admin/ops`.
2. `src/routes/adminOps.ts:5` imports runWrapUpEngine from wrapUpEngine; `:76–100` defines authenticated/admin `POST /wrap-up`, requires explicit week, forwards season/type/previewRevision/inputFingerprint/appliedBy.
3. `src/services/wrapUpEngine.ts:944–952` calls executeWeeklyWrapUpForPool with those values.
4. Test #14 executes that exact wrapper and function together. HTTP middleware/authorization is inspected, not dynamically tested.

## Remaining blockers / limits

- Actual deployed schema, RLS/permissions, catalog, generated Prisma client and live artifact SHA cannot be established without forbidden access. Local source correspondence is exact, deployment correspondence remains owner-provided.
- Orphan mapping state is structurally possible in documented text-identity table, but normal trigger-validated new writes reject it. Test #12 proves engine behavior given this state, not production prevalence or a supported way to create/repair it.
- Nullable legacy pick week, seasonless claim schema and enhanced tagged ORM projection are not established production capabilities. They are separately labeled tests; do not promote them to live findings.
- Not a DB transaction/SQL parser/trigger/RLS integration suite. SQL semantics for reviewed queries and constraints are modeled; unrelated schema/runtime drift could fail earlier. Numeric construction/summing uses exactly representable fixture values, not full Prisma Decimal. Two synthetic members/three games, not owner's external 10-member matrix or actual schedule.
- No cleanup SQL error/permission or missing-column integration test was performed. Catching real SQL errors does not imply PostgreSQL will commit; the double marks modeled SQL failures aborted to avoid that false premise.
- No fixes or release readiness claim. No Week8 GO.

## Artifacts and exact execution commands

New artifacts:

- `/tmp/opencode/nfl-release-settlement.test.cjs`
- `/tmp/opencode/nfl-release-settlement-evidence.cjs`
- `/tmp/opencode/nfl-release-settlement-report.md`

Initial boundary check (cwd repo):

```sh
git rev-parse HEAD && git status --short && git rev-parse --verify '790cfc84^{commit}' && ls /tmp/opencode
```

Test command (cwd `/tmp/opencode`):

```sh
env -i PATH=/home/codespace/nvm/current/bin:/usr/local/bin:/usr/bin:/bin TZ=UTC /home/codespace/nvm/current/bin/node --test /tmp/opencode/nfl-release-settlement.test.cjs
```

Numbered-source commands (cwd `/tmp/opencode`):

```sh
env -i PATH=/home/codespace/nvm/current/bin:/usr/local/bin:/usr/bin:/bin TZ=UTC /home/codespace/nvm/current/bin/node /tmp/opencode/nfl-release-settlement-evidence.cjs src/services/wrapUpEngine.ts 312 438
env -i PATH=/home/codespace/nvm/current/bin:/usr/local/bin:/usr/bin:/bin TZ=UTC /home/codespace/nvm/current/bin/node /tmp/opencode/nfl-release-settlement-evidence.cjs && env -i PATH=/home/codespace/nvm/current/bin:/usr/local/bin:/usr/bin:/bin TZ=UTC /home/codespace/nvm/current/bin/node /tmp/opencode/nfl-release-settlement-evidence.cjs docs/evidence/P41_POST_PURGE_VALIDATION/sql/06_proposal_e_picks_security.sql 120 175 && env -i PATH=/home/codespace/nvm/current/bin:/usr/local/bin:/usr/bin:/bin TZ=UTC /home/codespace/nvm/current/bin/node /tmp/opencode/nfl-release-settlement-evidence.cjs src/routes/picks.ts 373 410
```

Additional source inspection used read-only local `git show 790cfc84:<path>` and `git grep -n -E <pattern> 790cfc84 -- <paths>` for engine, schema, route, DB client, ranking, designation, authoritative helper, SQL baseline/proposals, and existing test source; none of those existing tests/scripts were executed. The harness itself runs only `git -C /workspaces/NFL-Pick-Em rev-parse --verify '790cfc84^{commit}'` and `git -C /workspaces/NFL-Pick-Em show 790cfc84b1c044fd8db8174b2593bf12269dc804:<path>` subprocesses.

Final integrity command (cwd repo):

```sh
git status --short && git diff --exit-code && git diff --cached --exit-code && git rev-parse HEAD
```

## Remediation candidate — separate from historical verification (2026-10-26)

The 14 historic passes above reproduce original behavior; they are NOT fixed-source
results. A new additive review candidate targets exactly `790cfc84b1c044fd8db8174b2593bf12269dc804`,
not current checkout `ea686fe63b3df4767d66740062cc828102ca0b95`.
Application files are unchanged; no commit or release approval occurred.

See `release-risk-fixes/README.md` for full-file original/candidate SHA-256 hashes,
exact commands, scope, source ranges, tests and limitations; `candidate.patch` is
the reviewable pinned-release patch. `regression.test.cjs` reads pinned originals
with git show, validates patch contexts/counts/positions, builds source snapshots
in memory, and executes actual candidate bodies in isolated VMs.

Final command (cwd repo):
`env -i PATH=/home/codespace/nvm/current/bin:/usr/local/bin:/usr/bin:/bin TZ=UTC /home/codespace/nvm/current/bin/node --test release-risk-fixes/regression.test.cjs`
exited 0: **20 passed, 0 failed/skipped**. An earlier candidate run had 19/19
passes before additional controls. New safety assertions fail on original source
for each of the three defects, caught as explicit negative controls.

Changes: exact event identity plus away/home orientation (including minimal feed
season/week metadata for the actual canonical ID convention); scoped no-manifest
finality fallback preserving manifest and tagged unpicked pending controls; and
cleanup before zero-join mapping refusal. Missing mapping -> zero claims/effects
-> synthetic repair -> success -> dedupe, pending retry, completed-claim
preservation, and after-effects rollback are covered.

Range correction: the screenshot's **498–497** is invalid. Supported original
cleanup helper is **wrapUpEngine.ts:480–497**, unchanged in the candidate. Original
pending cleanup is `582–595` (candidate `589–602`); original mapping refusal is
`653–661` (candidate `660–669`). Original scope is `535–567` (candidate `535–574`).
Original poller risk is `59–83` (candidate identity/assignment `58–93`).

No DB/network/environment loading, startup, installs, project tests, deployment,
deletions, wipe/import, Week8 approval or commit/push. VM/double tests do not prove
deployed schema, permissions, PostgreSQL behavior or release readiness. Legacy
null-week scoring and unrelated risks were not fixed.
