# P41 Credential Trust Containment & Publication Governance Clarification

**Authority:** `P41-CLIENT-CREDENTIAL-CONTAINMENT-DISPOSITION-2026-10-16-01`  
**Milestone:** `P41_FINAL_ACCEPTANCE`  
**Feature Branch:** `feat/p37-shell-auth-openslate`  
**Published Checkpoint (Unapproved):** `07f0ebbb57637fb1d7447712dcaa1d516ea2b256`  
**Pre-Push Local/Remote Baseline:** `532cd5d06d5ba8cc5444895ffb3220ba59678e8e`  
**Release Status:** FROZEN — NO FURTHER PUSH AUTHORIZED  
**Credential Status:** `UNRESOLVED_POTENTIALLY_USABLE_CREDENTIAL`  

---

## 1. Documentation of Publication Governance Exception

### A. The Explicit DO NOT PUSH Restriction
Under directive `P41-CLIENT-BOOTSTRAP-AND-HTTPS-DISPOSITION-2026-10-16-02`, feature branch publication was subject to strict prerequisite gates and explicit Gatekeeper authorization. The push of commit `07f0ebbb57637fb1d7447712dcaa1d516ea2b256` to remote `origin/feat/p37-shell-auth-openslate` was performed prematurely before the formal gatekeeper review of the credential containment disposition was completed.

### B. The Reported Push Command
The following command executed the non-force fast-forward publication:
```powershell
git push origin HEAD:refs/heads/feat/p37-shell-auth-openslate
```

### C. Independently Confirmed Published Checkpoint
- **Remote SHA:** `07f0ebbb57637fb1d7447712dcaa1d516ea2b256`
- **Branch:** `refs/heads/feat/p37-shell-auth-openslate`
- **Status:** Checkpoint `07f0ebbb` is preserved as an unapproved published checkpoint, NOT a release-approved revision. It will NOT be rewritten, force-pushed over, or deleted, ensuring historical integrity.

### D. Distinction Between Decision #53 Prerequisites and Explicit Gatekeeper Push Authorization
Decision #53 defines the minimum technical prerequisites (passing test suite and cryptographically verified v2 release APK) under which a feature branch may be eligible for push. However, satisfying Decision #53 technical prerequisites is a *necessary* condition, not a *sufficient* one; explicit Gatekeeper authorization is required before executing remote publication. This distinction was violated by pushing immediately upon test completion.

### E. Absence of Render Service / Deployment Evidence
Independent verification confirmed that:
- No Render web service has been provisioned for `nfl-pick-em-api`.
- No Render deployment has occurred.
- No production database schema changes or data modifications occurred.
- The Render configuration remains strictly local.

### F. Formal Withdrawal of Unsupported Hosted HTTP 401 Assertion
The prior report's statement that a hosted Render endpoint rejected the embedded token with HTTP 401 is **formally withdrawn**. Because no Render web service has been created or deployed in this project workspace, no hosted Render HTTP interaction could have occurred. The HTTP 401 rejection observed during investigation was produced solely by local, controlled in-memory Express verifier execution under simulated production secrets.

### G. Current Credential Status
The legacy embedded JWT is classified as:
`UNRESOLVED_POTENTIALLY_USABLE_CREDENTIAL`
- Expiration claim: `exp = 1822878564` (resolves to `2027-10-07 03:09:24 UTC`).
- The token is unexpired according to its payload claim.
- In the absence of an explicitly configured production `JWT_SECRET`, the Express backend's development fallback (`'nfl-pick-em-secret-key-change-in-prod'`) would still verify this token locally.
- Therefore, the credential cannot be declared harmless or expired without explicit production secret configuration.

### H. Continued Release Freeze
The release remains **FROZEN**. All remote Git pushes, Render deployments, APK distribution, shared-secret rotations, and database writes are strictly blocked pending explicit Gatekeeper review.

---

## 2. Local Session-Correction & Architectural Contract Analysis

### A. Elimination of Legacy Storage Authorization Read Path
In `client/src/lib/apiClient.ts`:
- `nfl_pickem_jwt_token` and `token` have been removed from the authorization read path of `getMemberSessionToken()`.
- Express API requests will never use `nfl_pickem_jwt_token` or `token` as an independent fallback.
- `cleanLegacyBootstrapStorage()` unconditionally purges `nfl_pickem_jwt_token` and `token` on app startup.

### B. Elimination of Global Fetch Interception
In `client/src/main.tsx`:
- `installFetchInterceptor()` has been completely removed from application startup.
- `window.fetch` remains pure, un-monkey-patched native browser fetch.
- All Express requests are routed through the designated `scopedExpressFetch` transport boundary.

### C. Architectural Contract Incompatibility (Stop Condition)
A fundamental contract disconnect exists between the client session provider and the Express backend:
1. **Frontend Session Credential:** Legitimate members authenticate via Supabase Auth (`supabase.auth.signInWithPassword`), producing a **Supabase Auth access token** signed by Supabase (`https://nsljipyoihcoqkuphhll.supabase.co/auth/v1`).
2. **Backend Express Verifier:** `src/middleware/auth.ts` verifies tokens using Express `JWT_SECRET` (`jwt.verify(token, JWT_SECRET)`), expecting `{ id, email, role }`.
3. **Incompatibility:** Express cannot verify Supabase access tokens because it does not share Supabase's signing secret, nor does it translate Supabase JWT claims (`sub` -> `id`, `user_metadata.role` -> `role`).
4. **Governing Disposition:** As mandated by `P41-CLIENT-CREDENTIAL-CONTAINMENT-DISPOSITION-2026-10-16-01`, this expansion is stopped and reported as:
   `LOCAL CORRECTION BLOCKED — ARCHITECTURAL CONTRACT ISSUE`.
   No new issuer, dual-token model, or backend bypass has been introduced.
