# Pinned-release candidate — three authorized risks only

Target: `790cfc84b1c044fd8db8174b2593bf12269dc804`, not checkout
`ea686fe63b3df4767d66740062cc828102ca0b95`. No application files are changed.
No commit, deployment, settlement authorization or Week8 GO is implied.

## Artifacts and source representation

- `candidate.patch`: standard unified diff against the pinned release, preserving
  original `src/services/` paths. Review only; it has NOT been applied to checkout.
- `regression.test.cjs`: persistent, built-ins-only VM regression suite.

Instead of duplicating full application files, the runner obtains original source
snapshots with local `git show <full revision>:<path>` and constructs candidate
snapshots **in memory** by strictly applying the saved patch. It validates every
hunk's unique context, original/new line positions and old/new line counts. It
prints full-file hashes before executing candidate function bodies. No candidate
is reconstructed from current main. Source extraction removes exports and strips
TypeScript types, not function logic. The candidate feed mapper, poller tick,
settlement function and pinned manifest/normalization/ranking/exclusion helpers
are executed; imports and application startup are never executed.

## Narrow changes and exact source ranges

1. **Event identity/orientation.** Original `liveScorePoller.ts:59–83` matched only
   team pairs in either orientation. Candidate `:58–93` requires an exact external
   identity and matching normalized away/home orientation before score assignment.
   It recognizes raw ESPN IDs, `espn_<id>` and sync's upper/lower canonical
   `season_wNN_AWAY_HOME` identity. FINAL-to-live protection remains intact.
   Pinned `LiveScoreboardService.ts:43` supplies raw `event.id`; pinned
   `espnSyncService.ts:175–176` constructs the canonical identity and its upsert
   recognizes the ESPN-prefixed alias. Accordingly, the minimal third-file
   candidate change adds season/week metadata to the feed interface (`:3–4`) and
   mapper (`:46–47`, originally return block `:42–50`). Without usable metadata,
   canonical records are skipped rather than guessed from teams. Team aliases
   follow sync's WSH/WAS and JAC/JAX convention.

2. **Scoped finality.** Original `wrapUpEngine.ts:535–567` can retain all games;
   candidate `:535–574` starts empty, preserves manifest selection/completeness,
   and otherwise resolves explicit requested-week pick IDs against game UUIDs or
   external IDs. Null-week picks cannot establish fallback scope. Exposed
   conflicting week/season tags refuse resolution; all usable requested-week
   tagged games are retained, including unpicked pending games. Empty or
   unresolved fallback scope refuses and cleans the attempt claim. The existing
   scoring query (original `:643–651`, candidate `:650–658`) is unchanged: this is
   not a refactor of all pick-scoring semantics.

3. **Retryable zero-join refusal.** Original `wrapUpEngine.ts:653–661`; candidate
   `:660–669` invokes the existing cleanup helper before returning mapping
   unavailable. The helper is original **`:480–497`**, unchanged in the candidate.
   The screenshot's `498–497` is an invalid/inverted range, not evidence.
   Existing pending cleanup is original `:582–595`, candidate `:589–602`.
   Cleanup occurs only after this attempt acquired a claim, and retains the
   existing exact key and `summary IS NULL` predicate. Completed claims hit the
   earlier dedupe return and are preserved.

## Provenance (SHA-256, complete source files)

| Source | Original | Candidate |
|---|---|---|
| LiveScoreboardService.ts | `e9cb8b8e36a073be528fadffc35ae3b7d3bec4be6cdcea9f6bd2404328cc37cc` | `c1a8717a496b0b39e26c5b3d0a1274bacd7311f6a7a4babd79968582b7c90b67` |
| liveScorePoller.ts | `510b23ab6feb31d85bd4ffd337f085a6aebbf9ecb589d955591b0e1fc4fbaafd` | `fc8f01bb4565dc53bf3d16f6e75b568319d00b43720273ffa6537abcda43c5f3` |
| wrapUpEngine.ts | `737752e9d0910bb3a89ec9eac98c390180b777e7947ada168cf7f6c28b93c170` | `f3f7ad10b41af0a92c8ef110289f711da545bf23810963995c1ea4d25883079e` |

## Exact validation commands/results

Working directory `/workspaces/NFL-Pick-Em`:

```sh
env -i PATH=/home/codespace/nvm/current/bin:/usr/local/bin:/usr/bin:/bin TZ=UTC /home/codespace/nvm/current/bin/node --test release-risk-fixes/regression.test.cjs
git apply --numstat release-risk-fixes/candidate.patch
git diff --check
git diff --cached --exit-code
git status --short
git rev-parse HEAD
```

Final suite: **20 tests passed, 0 failed/skipped**, exit 0. Node v24.21.0 emits
the expected experimental TypeScript-stripping warning. First run before adding
one extra control and stricter hunk validation: 19 passed, 0 failed. Neither run
is an old unsafe-behavior reproduction counted as a fixed result.

Patch parser: exit 0, `4/0` additions/deletions for feed mapper, `17/7` for poller,
`21/13` for engine. This is parsing, not an assertion that the patch applies to
current main. The test's strict context application checks pinned-source fit.
Whitespace/index checks exited 0; HEAD remained `ea686fe…`. Final status is
expected to show only the additive directory and appended evidence reports.

### Regression coverage

- Exact event positive controls plus other-week, other-season, reversed fixture,
  reversed orientation with matching event ID, unknown/missing identity, missing
  metadata, lowercase canonical and normalized aliases. Live update, pregame
  ignore, FINAL-to-live guard and advisory-lock refusal controls.
- Actual candidate feed mapping feeds candidate tick in memory.
- W7 final settles despite pending W8/W9 with absent manifest, absent manifest
  table, and with/without ORM game tags; UUID and external-ID join controls.
- Pending intended W7 refuses with zero claims/effects, finalization permits retry;
  unpicked tagged pending game still blocks; missing manifest member refuses;
  unpicked manifest pending member still blocks. Empty/null-week-only and
  unresolved/conflicting tagged identities refuse instead of checking all games.
- Mapping missing -> zero claims/ledger/stats/outbox/inbox -> synthetic repair ->
  success -> unchanged-state dedupe; both season-keyed and hypothetical legacy
  seasonless claim profiles. Completed claims preserved with mapping still absent.
- Injected failure after writes rolls back whole draft; serialized competing
  ready retries yield one success, one dedupe, one claim and two notification
  rows per channel.
- Original-source negative controls explicitly catch AssertionError from the new
  isolation, zero-claim and poller identity assertions. Thus the suite detects
  all three original defects, rather than merely asserting original bad behavior.

## Limits / outstanding review

No database (even isolated), environment loading, application imports/startup,
network, installs, normal project tests, deployment, file deletion, wipe/import,
or commit/push occurred. All writes use apply_patch. Mock SQL cleanup affects only
transient arrays. Repair changes test inputs only; it is not a production repair
procedure and does not authorize bypassing immutable-pick triggers.

This is not TypeScript compilation or Prisma/PostgreSQL integration. The narrow
query double models reviewed SQL by state; unknown SQL throws. It is not a SQL
parser, catalog/RLS/trigger audit, concurrency/MVCC test, or SQL-error-abort audit.
Transactions are serialized cloned drafts; Decimal is a Number-backed substitute
for exactly representable fixture arithmetic. Notification uniqueness here is
established through settlement dedupe, not a full database constraint simulator.

Without a manifest or usable tags, only explicit requested-week picked games can
be established: this does not prove completeness of an unknown/unpicked slate.
The original scoring query's legacy null-week inclusion and lack of pick-season
column remain out of scope. Canonical IDs do not encode season type; the existing
sync convention and trusted feed metadata are assumed, not redesigned. Actual
deployment/schema correspondence and feed metadata availability remain unverified.
Existing cleanup suppresses errors; real database cleanup permissions/failures
are not established by successful in-memory tests. No broader readiness claim.
