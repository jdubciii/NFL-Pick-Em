# Verification only — 2026-10-26

## Revision and boundary

- Checkout: `876b70ba3e6ec8942e6face2acdd450247ea424a`.
- Locally available owner HAG-27: `790cfc84b1c044fd8db8174b2593bf12269dc804`, commit subject `docs(evidence): strip trailing whitespace from HAG-27 dossier (HAG-27)`.
- Common ancestor: `0b33b2e04901a92a9ca76da56d4f1ea3110cf981`. Neither checkout should be substituted for the other. Local remote-tracking branch containing release: `remotes/origin/feat/p37-shell-auth-openslate` (not a network-fresh assertion).
- Relevant diff: index.ts modified; release liveScorePoller.ts absent in checkout; wrapUpEngine.ts modified; weeklyWrapUp.ts and lockResolver.ts unchanged between compared revisions.
- Initial and final git status empty; tracked working/index diffs empty. No app-code edits, commits, application startup, dependency installs, network requests, DB connections, deletes, migrations, or production operations.
- Owner's live endpoint, Weeks 6–18 / 209 games, v77/no v78 report, Week7 approval Oct25 but not execution, external 90 picks + 10 PIT@NO predictions 44–52, production 84 rehearsal picks, Week8 real start, Jack sole signoff and NO GO are owner-provided context, NOT independently verified. These tests use synthetic fixtures, not that matrix or production records.

## Execution

8 tests passed / 0 failed. Passing means the expected unsafe behaviors were reproduced, not that the application is safe.

Runner: installed Node v24.21.0 built-in `node:test`, `node:module.stripTypeScriptTypes`, and restricted VM contexts. Project Vitest, TypeScript and Prisma runtime are not installed/resolvable. Project Vitest config uses tests/setup.ts, which instantiates Prisma; no existing tests or scripts were invoked.

Exact function extraction, export removal, and TypeScript type stripping only; no body rewrite. Each source slice prints revision, path, line range and SHA256. No application module imported; VM has no process, require, fetch or real timer bindings. Score daemon registration uses a fake setInterval and invokes its captured callback once, never starts an interval or boot entrypoint. Release score tick uses fake feed and advisory-lock acquisition.

Transactional in-memory double snapshots state, commits on normal return, rolls back on exception, serializes transactions, enforces composite pool/week claim uniqueness, outbox dedupe-key uniqueness and inbox user/dedupe uniqueness. Unknown raw SQL fails closed. State-derived query results, not scripted result assertions. Control tests verify success deduplication, competing attempts, notification uniqueness, and injected failure after ledger/stats/outbox effects followed by rollback and successful retry.

Limitations: not PostgreSQL/Prisma integration or an MVCC/deadlock test; claim-table presence/required unique constraint are modeled, not established in any deployed DB. Decimal is a narrow Number-based substitute using exactly representable fixture arithmetic (one 1/1 penalty split), not a Prisma Decimal precision audit. Synthetic two-member, two-game fixtures deliberately isolate the risks. No HTTP endpoint, authorization or deployed artifact correspondence is verified. Release settlement was inspected but NOT executed; no release cleanup DELETE was executed even against the double.

## Results and source evidence

1. **Unrelated score updates — reproduced in BOTH revisions.**
   Checkout src/index.ts:18–32 matches only the two team codes in either orientation; no event ID, kickoff, week or season filter. HAG-27 src/services/liveScorePoller.ts:59–83 has the same matching and score assignment. One synthetic PIT-away/NO-home final event updated the intended record, same-pair other-week record, same-pair other-season record, AND reversed NO-away/PIT-home record; unrelated BUF/NYJ control unchanged. Reversed record gets PIT's 24 points as NO's away score and NO's 21 as PIT's home score. HAG-27's FINAL-to-live guard does not prevent this final-event case.

2. **Settlement not isolated by week — reproduced in checkout.**
   src/services/wrapUpEngine.ts:134–148 loads picks by poolId only and derives games from all these picks; :163–178 checks all derived games; :184 selects tiebreak game from them; :210–218 sums all results. Only predictions are week-filtered (:189–194). Week7-only control: A=1, B=0, A wins. Add final Week8 picks with B=2: settling Week7 returns B as winner at 2, A dead-place at 1; chooses Week8 tiebreak game, uses Week7 prediction, and writes Week7 penalty against A. Pending Week8 instead blocks otherwise final Week7.
   The separate older src/services/weeklyWrapUp.ts:111–130, :223–229 has the same source-level pool-only scope; it was not executed by this harness. Current adminOps route uses runWrapUpEngine, which invokes executeWeeklyWrapUpForPool.
   HAG-27 is DIFFERENT: wrapUpEngine.ts:535–567 scopes via accepted manifest or tagged-game/pick fallbacks; :643–651 filters picks by requested week OR null week. Do NOT transfer the checkout reproduction directly to HAG-27. Source caveats: absent manifest AND absent matching tagged games leaves `games = allGames`; null-week picks remain eligible. These fallback risks are source observations, not runtime reproductions.

3. **Premature settlement consumes claim and blocks retry — reproduced in checkout.**
   wrapUpEngine.ts:65 starts transaction; :80–87 inserts claim BEFORE finality checks. :154–178 returns normally for missing/pending games without removing claim or throwing; normal transaction resolution commits. :89–95 then refuses retries.
   Reproduced both (a) pending Week8 blocking final Week7 and (b) pending Week7 alone. First result SCORE_FEED_UNAVAILABLE, committed one Week7 claim, zero ledger/stats/outbox/inbox effects. After finalizing pending game in memory, retry returns ALREADY_WRAPPED_UP. Injected thrown failure control rolls back claim AND effects and permits retry, distinguishing return/commit from throw/rollback.
   HAG-27 has cleanupIncompleteClaim (:480–497), called before pending-game refusal (:582–595), so the exact checkout pending branch is not equivalent. Not runtime verified. Cleanup depends on schema and suppresses errors. Source also has a different post-claim mapping-unavailable return (:653–661) with no cleanup; no claim that all release refusal paths are retry-safe.

## Artifacts

- `/tmp/opencode/nfl-risk-verification.test.cjs`: executable 8-test reproduction and provenance hashes.
- `/tmp/opencode/nfl-release-source-evidence.cjs`: prints numbered release excerpts from local git object, read-only.
- `/tmp/opencode/nfl-risk-verification-report.md`: this report and exact shell-command inventory below.

## Exact shell-command inventory

Unless otherwise specified, cwd was `/workspaces/NFL-Pick-Em`. Source/config was additionally inspected with specialized Read/Grep/Glob tools. Files were created only via apply_patch under the prechecked `/tmp/opencode`.

```sh
git rev-parse HEAD && git status --short && git log -1 --format='%H %s' && git rev-parse --verify '790cfc84^{commit}' && git branch --all --no-color --contains 790cfc84
git diff --stat 790cfc84 HEAD && git log --oneline -8 && ls /tmp/opencode
node --version && node -p 'JSON.stringify(["typescript","vitest","@prisma/client/runtime/library"].map(x=>{try{return [x,require.resolve(x)]}catch{return [x,"NOT INSTALLED"]}}))' && git merge-base HEAD 790cfc84 && git show 790cfc84:src/index.ts && git diff 790cfc84 HEAD -- src/services/wrapUpEngine.ts src/index.ts
git show 790cfc84:src/services/liveScorePoller.ts && git show 790cfc84:src/services/liveScoreService.ts && git show 790cfc84:src/services/espnSyncService.ts && git log -1 --format='%H %s' 790cfc84 && git status --porcelain=v1
```

The first runner attempt (cwd `/tmp/opencode`) failed BEFORE execution, exit 127: node not in the deliberately minimal PATH:

```sh
env -i PATH=/usr/bin:/bin TZ=UTC node --test /tmp/opencode/nfl-risk-verification.test.cjs
```

Resolved local executables (cwd repo):

```sh
command -v node && command -v git
```

Successful reproduction (cwd `/tmp/opencode`), exit 0, 8 passed:

```sh
env -i PATH=/home/codespace/nvm/current/bin:/usr/local/bin:/usr/bin:/bin TZ=UTC /home/codespace/nvm/current/bin/node --test /tmp/opencode/nfl-risk-verification.test.cjs
```

Integrity check (cwd repo), exit 0; empty status and original HEAD:

```sh
git diff --quiet && git diff --cached --quiet && git status --porcelain=v1 && git rev-parse HEAD && git diff --name-status 790cfc84 HEAD -- src/index.ts src/services/liveScorePoller.ts src/services/wrapUpEngine.ts src/services/weeklyWrapUp.ts src/services/lockResolver.ts
```

Release excerpt inspection (cwd `/tmp/opencode`), exit 0:

```sh
env -i PATH=/home/codespace/nvm/current/bin:/usr/local/bin:/usr/bin:/bin TZ=UTC /home/codespace/nvm/current/bin/node /tmp/opencode/nfl-release-source-evidence.cjs
```

Harness subprocess commands are exclusively local `git -C /workspaces/NFL-Pick-Em rev-parse HEAD` and `git -C /workspaces/NFL-Pick-Em show 790cfc84b1c044fd8db8174b2593bf12269dc804:<source path>`. No fetch/network command is used.
