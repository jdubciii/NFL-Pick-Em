# EVIDENCE BUNDLE — RE: RULING R-12.2-AL
**Date (UTC):** 2026-10-02T19:46:36.560Z  
**Current Commit:** 519ef71c8ac2126fa23e3154473ea458b0839993  
**Branch:** feat/phase12-1-outbox  
**Ancestry Status:** ANCESTRY_CONFIRMED: commit 6c2fb46 is a verified ancestor of HEAD  
**Generator Self-Test Exit Code:** 1  
**CI Check Positive Exit Code:** 0  
**CI Check Negative Control Exit Code:** 1  
**Generator Execution Exit Code:** 0  

---

# PRE-GENERATION WORKSPACE HYGIENE

```text
(clean - 0 uncommitted changes)
```
*Verification: Early pre-generation git status --porcelain executed at step 0; confirmed completely clean working tree.*

---

## 1. Generator Self-Test Verification

```text
(node:16684) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/kacone/Documents/AI%20and%20Tech/Antigravity/NFL%20Pick%20Em/scripts/generate_evidence.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
Generator Self-Test Caught Expected Error:
Empty output detected for command: "Write-Output """
```
*Verification: The generator strictness check proved operational by failing on an empty command block and exiting with code 1.*

---

## 2. Pre-Run Git State & Ancestry

### 2.1 Working Branch Status
```text
## feat/phase12-1-outbox
```

### 2.2 Ancestry Verification
```text
ANCESTRY_CONFIRMED: commit 6c2fb46 is a verified ancestor of HEAD
```

### 2.3 Recent Commits (Last 5)
```text
519ef71 chore: update evidence generator for R-12.2-AL
d4cc38b docs: B3 - append R-12.2-AL updates and design notes
36f59ac test: B3 - test coverage for drain, lease safety, and scrubber fixes
59d7013 feat: B3 - drain worker, transport, and job runner defect fixes
fba6a81 refactor: remove runReminderScan (deferred to step E)
```

---

## 3. Decision Register CI Check (Positive & Negative Controls)

### 3.1 Positive Control (`node scripts/ci_check_register.js`)
```text
✅ CI Check PASSED: Appendix A Decision Register exists byte-for-byte in ARCHITECTURE.md.
```

### 3.2 Negative Control (Mutated Register -> Must Fail)
```text
Exit Code: 1
Output:
❌ CI Check FAILED: Appendix A Decision Register does not match ARCHITECTURE.md byte-for-byte.
```
*Verification: `scripts/ci_check_register.js` deterministically enforces byte-for-byte fidelity of Decisions #1 through #60 from appendix-a.md in ARCHITECTURE.md.*

---

## 4. History Secret Scan & Function Revoke Guards

### 4.1 Negative Control in Isolated Worktree (`.worktree-ctl`)
```text
--- Setting up .worktree-ctl for Negative Control ---
HEAD is now at 519ef71 chore: update evidence generator for R-12.2-AL
[detached HEAD 80b83b9] chore: negative control test commit
 1 file changed, 2 insertions(+)
 create mode 100644 test_secrets.txt

--- Running History Scan Against Negative Control Commit ---
=== History Secret Scan against HEAD ===
Excluding package-lock.json, including tests/...
MATCHES FOUND:
HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:50:908f447121c9068e4b3a31ec524d3094ff4083f8:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:51:ecba144dd7ee4fbeaa20d777832d8df3178d2981:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:52:baa8760b93d83874295e42c2be8fe90766888a2f:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:53:528d6e82a1d708c986cc6fd085de717c620c04b7:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:54:22db0f3e1bb76a11a21c017142e44746664167b6:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:55:f27584fa854aae8ba520fcd82ab7c6c40a5d9b06:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:56:335f3221f8eb309932362557e7d22c435b220c4b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:57:66b3bc43255cc0d1a283ee419a4507ae5528197d:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:58:93038206f38e658d8c7ace90a195557f9c56722b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:59:4c7096fb459f34f2e5f5c1bce7b2b005cac41aff:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/facts.txt:25:908f447121c9068e4b3a31ec524d3094ff4083f8:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/facts.txt:26:ecba144dd7ee4fbeaa20d777832d8df3178d2981:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/facts.txt:27:baa8760b93d83874295e42c2be8fe90766888a2f:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/facts.txt:28:528d6e82a1d708c986cc6fd085de717c620c04b7:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/facts.txt:29:22db0f3e1bb76a11a21c017142e44746664167b6:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/facts.txt:30:f27584fa854aae8ba520fcd82ab7c6c40a5d9b06:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/facts.txt:31:335f3221f8eb309932362557e7d22c435b220c4b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/facts.txt:32:66b3bc43255cc0d1a283ee419a4507ae5528197d:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/facts.txt:33:93038206f38e658d8c7ace90a195557f9c56722b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AE/facts.txt:34:4c7096fb459f34f2e5f5c1bce7b2b005cac41aff:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AF/EVIDENCE_BUNDLE.md:86:Target Database: postgresql://postgres:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AG/EVIDENCE_BUNDLE.md:91:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AG/EVIDENCE_BUNDLE.md:101:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AH-V2-ACK/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AH-V2-ACK/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AH-V2-ACK/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md:134:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md:146:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md:156:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AI/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AI/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AI/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:517:00e89dd64ae5c130b96cd7af476794a2014872b3:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:518:8ec0ca50ba64891cba07935d72faa544bc91e311:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:519:a28e55dbb5afd04399e2405ace7bb4a7dbaa148c:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:520:e0e857933e9a0dc21ca9792804935b947e2dd445:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:521:e67ad25be94676a4f5871db03e779766f57c9cca:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:522:0619e3dcfbdad1ba16d48fc51e401c1dbc479ec3:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:523:795bc1a360650b2d7a4e611caaacf8c233d1c5bc:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:524:75c42c50aedf952ae671da572f7c595359125f20:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:525:d6251e865a22c7251efedd41172abaaa8cdc9508:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:526:8b2e4a8853b8f9f9969abf03922c9f4a5ca6b141:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:527:c0dfd0381a52b4d1a65973772a28f207ce39fa21:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:528:57b4a66b0f5d80dfdcfe8c0bff19b39a1133ccdc:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:529:d14eb4fd0e31828fd50ade7068e4b72da906ad68:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:530:5f9f25c84c62310a52f36db87e6aa74e9a8cbe38:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:531:87aac809dbd1b470dfd257f52f03c0a8a5e8f75f:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:532:7835dda30219ca441705cd1b052cfef2eca97921:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:533:18238ff775251100b534aa029b1f102f50a1271e:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:534:41296e4bc7adc7da7ad325bdaaf2897881c50d2f:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:535:96fca3dd1f91be8eba36478208218ec37c943516:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:536:a2362c00de6bb651b160c129dda311c14702d5fb:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:537:bb4c463783e53ea4c078511a69e553b26b5b6489:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:538:988ec29fa605233f14548246038413cf4765232d:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:539:ff5208a8b3bd6bb062b5bff5a561529d7b01add9:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:540:c8eef5aa4426219211bc85083fde50122032d7db:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:541:38f0761ffa346702a1c8cd87663313add6efd2fb:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:542:e41ce7249fc8e5120957cc61ce0e6ce14dcdac4a:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:543:c2e1ff9d33f7642d9eb5a9fa460a93e4d7adfdbd:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:544:94eff178f4b00004f95b07ccc47a52e164a6912e:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:545:b767907a8d2554d25025d585a02fad0f0e970001:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:546:68c7b65b1914f2170549a7e229c4c139947288da:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:547:3d27d539d31ad521aeb2676d84083b303df286ad:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:548:40da61b4445b3821e5e32d6426f589ae6aa0d48c:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:549:b884656a95290f2d1d689fafdeea894ec1520aaf:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:550:d9a822d0862550f727f4aa39b396aa50f19fa839:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:551:52aa4b6a31ce77d3c03f744349a05b6849424995:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:93:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:50:908f447121c9068e4b3a31ec524d3094ff4083f8:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:94:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:51:ecba144dd7ee4fbeaa20d777832d8df3178d2981:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:95:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:52:baa8760b93d83874295e42c2be8fe90766888a2f:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:96:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:53:528d6e82a1d708c986cc6fd085de717c620c04b7:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:97:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:54:22db0f3e1bb76a11a21c017142e44746664167b6:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:98:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:55:f27584fa854aae8ba520fcd82ab7c6c40a5d9b06:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:99:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:56:335f3221f8eb309932362557e7d22c435b220c4b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:100:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:57:66b3bc43255cc0d1a283ee419a4507ae5528197d:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:101:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:58:93038206f38e658d8c7ace90a195557f9c56722b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:102:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:59:4c7096fb459f34f2e5f5c1bce7b2b005cac41aff:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:103:HEAD:docs/evidence/R-12.2-AE/facts.txt:25:908f447121c9068e4b3a31ec524d3094ff4083f8:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:104:HEAD:docs/evidence/R-12.2-AE/facts.txt:26:ecba144dd7ee4fbeaa20d777832d8df3178d2981:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:105:HEAD:docs/evidence/R-12.2-AE/facts.txt:27:baa8760b93d83874295e42c2be8fe90766888a2f:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:106:HEAD:docs/evidence/R-12.2-AE/facts.txt:28:528d6e82a1d708c986cc6fd085de717c620c04b7:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:107:HEAD:docs/evidence/R-12.2-AE/facts.txt:29:22db0f3e1bb76a11a21c017142e44746664167b6:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:108:HEAD:docs/evidence/R-12.2-AE/facts.txt:30:f27584fa854aae8ba520fcd82ab7c6c40a5d9b06:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:109:HEAD:docs/evidence/R-12.2-AE/facts.txt:31:335f3221f8eb309932362557e7d22c435b220c4b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:110:HEAD:docs/evidence/R-12.2-AE/facts.txt:32:66b3bc43255cc0d1a283ee419a4507ae5528197d:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:111:HEAD:docs/evidence/R-12.2-AE/facts.txt:33:93038206f38e658d8c7ace90a195557f9c56722b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:112:HEAD:docs/evidence/R-12.2-AE/facts.txt:34:4c7096fb459f34f2e5f5c1bce7b2b005cac41aff:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:113:HEAD:docs/evidence/R-12.2-AF/EVIDENCE_BUNDLE.md:86:Target Database: postgresql://postgres:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:114:HEAD:docs/evidence/R-12.2-AG/EVIDENCE_BUNDLE.md:91:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:115:HEAD:docs/evidence/R-12.2-AG/EVIDENCE_BUNDLE.md:101:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:116:HEAD:docs/evidence/R-12.2-AH-V2-ACK/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:117:HEAD:docs/evidence/R-12.2-AH-V2-ACK/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:118:HEAD:docs/evidence/R-12.2-AH-V2-ACK/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:119:HEAD:docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:120:HEAD:docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:121:HEAD:docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:122:HEAD:docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md:134:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:123:HEAD:docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md:146:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:124:HEAD:docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md:156:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:125:HEAD:docs/evidence/R-12.2-AI/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:126:HEAD:docs/evidence/R-12.2-AI/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:127:HEAD:docs/evidence/R-12.2-AI/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:128:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:129:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:130:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:131:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:517:00e89dd64ae5c130b96cd7af476794a2014872b3:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:132:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:518:8ec0ca50ba64891cba07935d72faa544bc91e311:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:133:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:519:a28e55dbb5afd04399e2405ace7bb4a7dbaa148c:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:134:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:520:e0e857933e9a0dc21ca9792804935b947e2dd445:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:135:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:521:e67ad25be94676a4f5871db03e779766f57c9cca:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:136:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:522:0619e3dcfbdad1ba16d48fc51e401c1dbc479ec3:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:137:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:523:795bc1a360650b2d7a4e611caaacf8c233d1c5bc:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:138:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:524:75c42c50aedf952ae671da572f7c595359125f20:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:139:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:525:d6251e865a22c7251efedd41172abaaa8cdc9508:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:140:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:526:8b2e4a8853b8f9f9969abf03922c9f4a5ca6b141:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:141:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:527:c0dfd0381a52b4d1a65973772a28f207ce39fa21:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:142:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:528:57b4a66b0f5d80dfdcfe8c0bff19b39a1133ccdc:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:143:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:529:d14eb4fd0e31828fd50ade7068e4b72da906ad68:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:144:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:530:5f9f25c84c62310a52f36db87e6aa74e9a8cbe38:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:145:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:531:87aac809dbd1b470dfd257f52f03c0a8a5e8f75f:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:146:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:532:7835dda30219ca441705cd1b052cfef2eca97921:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:147:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:533:18238ff775251100b534aa029b1f102f50a1271e:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:148:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:534:41296e4bc7adc7da7ad325bdaaf2897881c50d2f:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:149:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:535:96fca3dd1f91be8eba36478208218ec37c943516:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:150:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:536:a2362c00de6bb651b160c129dda311c14702d5fb:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:151:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:537:bb4c463783e53ea4c078511a69e553b26b5b6489:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:152:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:538:988ec29fa605233f14548246038413cf4765232d:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:153:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:539:ff5208a8b3bd6bb062b5bff5a561529d7b01add9:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:154:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:540:c8eef5aa4426219211bc85083fde50122032d7db:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:155:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:541:38f0761ffa346702a1c8cd87663313add6efd2fb:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:156:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:542:e41ce7249fc8e5120957cc61ce0e6ce14dcdac4a:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:157:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:543:c2e1ff9d33f7642d9eb5a9fa460a93e4d7adfdbd:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:158:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:544:94eff178f4b00004f95b07ccc47a52e164a6912e:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:159:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:545:b767907a8d2554d25025d585a02fad0f0e970001:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:160:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:546:68c7b65b1914f2170549a7e229c4c139947288da:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:161:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:547:3d27d539d31ad521aeb2676d84083b303df286ad:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:162:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:548:40da61b4445b3821e5e32d6426f589ae6aa0d48c:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:163:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:549:b884656a95290f2d1d689fafdeea894ec1520aaf:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:164:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:550:d9a822d0862550f727f4aa39b396aa50f19fa839:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:165:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:551:52aa4b6a31ce77d3c03f744349a05b6849424995:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:166:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:90:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:50:908f447121c9068e4b3a31ec524d3094ff4083f8:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:167:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:91:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:51:ecba144dd7ee4fbeaa20d777832d8df3178d2981:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:168:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:92:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:52:baa8760b93d83874295e42c2be8fe90766888a2f:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:169:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:93:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:53:528d6e82a1d708c986cc6fd085de717c620c04b7:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:170:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:94:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:54:22db0f3e1bb76a11a21c017142e44746664167b6:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:171:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:95:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:55:f27584fa854aae8ba520fcd82ab7c6c40a5d9b06:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:172:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:96:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:56:335f3221f8eb309932362557e7d22c435b220c4b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:173:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:97:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:57:66b3bc43255cc0d1a283ee419a4507ae5528197d:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:174:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:98:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:58:93038206f38e658d8c7ace90a195557f9c56722b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:175:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:99:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:59:4c7096fb459f34f2e5f5c1bce7b2b005cac41aff:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:176:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:100:HEAD:docs/evidence/R-12.2-AE/facts.txt:25:908f447121c9068e4b3a31ec524d3094ff4083f8:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:177:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:101:HEAD:docs/evidence/R-12.2-AE/facts.txt:26:ecba144dd7ee4fbeaa20d777832d8df3178d2981:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:178:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:102:HEAD:docs/evidence/R-12.2-AE/facts.txt:27:baa8760b93d83874295e42c2be8fe90766888a2f:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:179:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:103:HEAD:docs/evidence/R-12.2-AE/facts.txt:28:528d6e82a1d708c986cc6fd085de717c620c04b7:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:180:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:104:HEAD:docs/evidence/R-12.2-AE/facts.txt:29:22db0f3e1bb76a11a21c017142e44746664167b6:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:181:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:105:HEAD:docs/evidence/R-12.2-AE/facts.txt:30:f27584fa854aae8ba520fcd82ab7c6c40a5d9b06:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:182:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:106:HEAD:docs/evidence/R-12.2-AE/facts.txt:31:335f3221f8eb309932362557e7d22c435b220c4b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:183:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:107:HEAD:docs/evidence/R-12.2-AE/facts.txt:32:66b3bc43255cc0d1a283ee419a4507ae5528197d:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:184:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:108:HEAD:docs/evidence/R-12.2-AE/facts.txt:33:93038206f38e658d8c7ace90a195557f9c56722b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:185:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:109:HEAD:docs/evidence/R-12.2-AE/facts.txt:34:4c7096fb459f34f2e5f5c1bce7b2b005cac41aff:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:186:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:110:HEAD:docs/evidence/R-12.2-AF/EVIDENCE_BUNDLE.md:86:Target Database: postgresql://postgres:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:187:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:111:HEAD:docs/evidence/R-12.2-AG/EVIDENCE_BUNDLE.md:91:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:188:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:112:HEAD:docs/evidence/R-12.2-AG/EVIDENCE_BUNDLE.md:101:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:189:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:113:HEAD:docs/evidence/R-12.2-AH-V2-ACK/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:190:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:114:HEAD:docs/evidence/R-12.2-AH-V2-ACK/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:191:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:115:HEAD:docs/evidence/R-12.2-AH-V2-ACK/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:192:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:116:HEAD:docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:193:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:117:HEAD:docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:194:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:118:HEAD:docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:195:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:119:HEAD:docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md:134:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:196:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:120:HEAD:docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md:146:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:197:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:121:HEAD:docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md:156:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:198:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:122:HEAD:docs/evidence/R-12.2-AI/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:199:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:123:HEAD:docs/evidence/R-12.2-AI/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:200:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:124:HEAD:docs/evidence/R-12.2-AI/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:201:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:125:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:202:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:126:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:203:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:127:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:204:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:128:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:517:00e89dd64ae5c130b96cd7af476794a2014872b3:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:205:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:129:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:518:8ec0ca50ba64891cba07935d72faa544bc91e311:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:206:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:130:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:519:a28e55dbb5afd04399e2405ace7bb4a7dbaa148c:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:207:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:131:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:520:e0e857933e9a0dc21ca9792804935b947e2dd445:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:208:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:132:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:521:e67ad25be94676a4f5871db03e779766f57c9cca:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:209:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:133:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:522:0619e3dcfbdad1ba16d48fc51e401c1dbc479ec3:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:210:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:134:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:523:795bc1a360650b2d7a4e611caaacf8c233d1c5bc:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:211:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:135:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:524:75c42c50aedf952ae671da572f7c595359125f20:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:212:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:136:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:525:d6251e865a22c7251efedd41172abaaa8cdc9508:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:213:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:137:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:526:8b2e4a8853b8f9f9969abf03922c9f4a5ca6b141:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:214:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:138:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:527:c0dfd0381a52b4d1a65973772a28f207ce39fa21:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:215:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:139:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:528:57b4a66b0f5d80dfdcfe8c0bff19b39a1133ccdc:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:216:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:140:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:529:d14eb4fd0e31828fd50ade7068e4b72da906ad68:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:217:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:141:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:530:5f9f25c84c62310a52f36db87e6aa74e9a8cbe38:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:218:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:142:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:531:87aac809dbd1b470dfd257f52f03c0a8a5e8f75f:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:219:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:143:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:532:7835dda30219ca441705cd1b052cfef2eca97921:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:220:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:144:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:533:18238ff775251100b534aa029b1f102f50a1271e:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:221:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:145:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:534:41296e4bc7adc7da7ad325bdaaf2897881c50d2f:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:222:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:146:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:535:96fca3dd1f91be8eba36478208218ec37c943516:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:223:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:147:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:536:a2362c00de6bb651b160c129dda311c14702d5fb:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:224:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:148:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:537:bb4c463783e53ea4c078511a69e553b26b5b6489:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:225:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:149:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:538:988ec29fa605233f14548246038413cf4765232d:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:226:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:150:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:539:ff5208a8b3bd6bb062b5bff5a561529d7b01add9:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:227:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:151:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:540:c8eef5aa4426219211bc85083fde50122032d7db:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:228:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:152:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:541:38f0761ffa346702a1c8cd87663313add6efd2fb:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:229:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:153:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:542:e41ce7249fc8e5120957cc61ce0e6ce14dcdac4a:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:230:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:154:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:543:c2e1ff9d33f7642d9eb5a9fa460a93e4d7adfdbd:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:231:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:155:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:544:94eff178f4b00004f95b07ccc47a52e164a6912e:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:232:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:156:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:545:b767907a8d2554d25025d585a02fad0f0e970001:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:233:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:157:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:546:68c7b65b1914f2170549a7e229c4c139947288da:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:234:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:158:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:547:3d27d539d31ad521aeb2676d84083b303df286ad:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:235:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:159:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:548:40da61b4445b3821e5e32d6426f589ae6aa0d48c:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:236:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:160:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:549:b884656a95290f2d1d689fafdeea894ec1520aaf:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:237:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:161:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:550:d9a822d0862550f727f4aa39b396aa50f19fa839:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:238:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:162:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:551:52aa4b6a31ce77d3c03f744349a05b6849424995:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:239:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:163:HEAD:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:151:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:240:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:164:HEAD:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:152:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:241:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:165:HEAD:docs/evidence/R-12.2-X/hosted-connection-grep.txt:4:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:242:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:166:HEAD:docs/evidence/R-12.2-X/hosted-connection-grep.txt:5:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:243:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:167:HEAD:scripts/run_hosted_tripwire.js:20:    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/g, 'postgresql://[REDACTED]:****@')
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:244:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:168:HEAD:scripts/run_negative_control.js:21:  `FAKE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:245:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:169:HEAD:test_secrets.txt:1:FAKE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:246:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:170:HEAD:tests/safeguards.test.ts:21:      assertDisposableUrl('postgresql://postgres.exampleref:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:247:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:171:HEAD:tests/safeguards.test.ts:25:      assertDisposableUrl('postgresql://user:pass@db.neon.tech/pickem_rehearsal');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:248:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:172:HEAD:tests/safeguards.test.ts:30:    const prodFingerprint = 'postgresql://postgres.exampleref:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:249:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:183:origin/main:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:151:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:250:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:184:origin/main:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:152:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:251:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:185:origin/main:docs/evidence/R-12.2-X/hosted-connection-grep.txt:4:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:252:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:186:origin/main:docs/evidence/R-12.2-X/hosted-connection-grep.txt:5:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:253:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:187:origin/main:tests/safeguards.test.ts:21:      assertDisposableUrl('postgresql://postgres.exampleref:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:254:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:188:origin/main:tests/safeguards.test.ts:25:      assertDisposableUrl('postgresql://user:pass@db.neon.tech/pickem_rehearsal');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:255:HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:189:origin/main:tests/safeguards.test.ts:30:    const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:256:HEAD:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:151:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:257:HEAD:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:152:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:258:HEAD:docs/evidence/R-12.2-X/hosted-connection-grep.txt:4:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:259:HEAD:docs/evidence/R-12.2-X/hosted-connection-grep.txt:5:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:260:HEAD:scripts/run_hosted_tripwire.js:20:    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/g, 'postgresql://[REDACTED]:****@')
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:261:HEAD:scripts/run_negative_control.js:21:  `FAKE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:262:HEAD:test_secrets.txt:1:FAKE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:263:HEAD:tests/safeguards.test.ts:21:      assertDisposableUrl('postgresql://postgres.exampleref:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:264:HEAD:tests/safeguards.test.ts:25:      assertDisposableUrl('postgresql://user:pass@db.neon.tech/pickem_rehearsal');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:265:HEAD:tests/safeguards.test.ts:30:    const prodFingerprint = 'postgresql://postgres.exampleref:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:276:origin/main:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:151:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:277:origin/main:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:152:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:278:origin/main:docs/evidence/R-12.2-X/hosted-connection-grep.txt:4:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:279:origin/main:docs/evidence/R-12.2-X/hosted-connection-grep.txt:5:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:280:origin/main:tests/safeguards.test.ts:21:      assertDisposableUrl('postgresql://postgres.exampleref:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:281:origin/main:tests/safeguards.test.ts:25:      assertDisposableUrl('postgresql://user:pass@db.neon.tech/pickem_rehearsal');
HEAD:docs/evidence/R-12.2-AK-ADOPT/EVIDENCE_BUNDLE.md:282:origin/main:tests/safeguards.test.ts:30:    const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:90:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:50:908f447121c9068e4b3a31ec524d3094ff4083f8:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:91:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:51:ecba144dd7ee4fbeaa20d777832d8df3178d2981:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:92:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:52:baa8760b93d83874295e42c2be8fe90766888a2f:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:93:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:53:528d6e82a1d708c986cc6fd085de717c620c04b7:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:94:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:54:22db0f3e1bb76a11a21c017142e44746664167b6:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:95:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:55:f27584fa854aae8ba520fcd82ab7c6c40a5d9b06:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:96:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:56:335f3221f8eb309932362557e7d22c435b220c4b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:97:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:57:66b3bc43255cc0d1a283ee419a4507ae5528197d:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:98:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:58:93038206f38e658d8c7ace90a195557f9c56722b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:99:HEAD:docs/evidence/R-12.2-AE/EVIDENCE_BUNDLE.md:59:4c7096fb459f34f2e5f5c1bce7b2b005cac41aff:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:100:HEAD:docs/evidence/R-12.2-AE/facts.txt:25:908f447121c9068e4b3a31ec524d3094ff4083f8:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:101:HEAD:docs/evidence/R-12.2-AE/facts.txt:26:ecba144dd7ee4fbeaa20d777832d8df3178d2981:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:102:HEAD:docs/evidence/R-12.2-AE/facts.txt:27:baa8760b93d83874295e42c2be8fe90766888a2f:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:103:HEAD:docs/evidence/R-12.2-AE/facts.txt:28:528d6e82a1d708c986cc6fd085de717c620c04b7:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:104:HEAD:docs/evidence/R-12.2-AE/facts.txt:29:22db0f3e1bb76a11a21c017142e44746664167b6:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:105:HEAD:docs/evidence/R-12.2-AE/facts.txt:30:f27584fa854aae8ba520fcd82ab7c6c40a5d9b06:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:106:HEAD:docs/evidence/R-12.2-AE/facts.txt:31:335f3221f8eb309932362557e7d22c435b220c4b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:107:HEAD:docs/evidence/R-12.2-AE/facts.txt:32:66b3bc43255cc0d1a283ee419a4507ae5528197d:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:108:HEAD:docs/evidence/R-12.2-AE/facts.txt:33:93038206f38e658d8c7ace90a195557f9c56722b:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:109:HEAD:docs/evidence/R-12.2-AE/facts.txt:34:4c7096fb459f34f2e5f5c1bce7b2b005cac41aff:tests/br6.test.ts:6:    const dummyUrl = 'postgresql://u:p@db.invalid:5432/x';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:110:HEAD:docs/evidence/R-12.2-AF/EVIDENCE_BUNDLE.md:86:Target Database: postgresql://postgres:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:111:HEAD:docs/evidence/R-12.2-AG/EVIDENCE_BUNDLE.md:91:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:112:HEAD:docs/evidence/R-12.2-AG/EVIDENCE_BUNDLE.md:101:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:113:HEAD:docs/evidence/R-12.2-AH-V2-ACK/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:114:HEAD:docs/evidence/R-12.2-AH-V2-ACK/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:115:HEAD:docs/evidence/R-12.2-AH-V2-ACK/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:116:HEAD:docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:117:HEAD:docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:118:HEAD:docs/evidence/R-12.2-AH-V2/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:119:HEAD:docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md:134:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:120:HEAD:docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md:146:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:121:HEAD:docs/evidence/R-12.2-AH/EVIDENCE_BUNDLE.md:156:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:122:HEAD:docs/evidence/R-12.2-AI/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:123:HEAD:docs/evidence/R-12.2-AI/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:124:HEAD:docs/evidence/R-12.2-AI/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:125:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:143:Target Host: postgresql://postgres.[REDACTED]:****@localhost:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:126:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:155:Target Host: postgresql://postgres.[REDACTED]:****@127.0.0.1:5432/pickem_rehearsal
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:127:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:165:Target Host: postgresql://postgres.[REDACTED]:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:128:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:517:00e89dd64ae5c130b96cd7af476794a2014872b3:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:129:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:518:8ec0ca50ba64891cba07935d72faa544bc91e311:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:130:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:519:a28e55dbb5afd04399e2405ace7bb4a7dbaa148c:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:131:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:520:e0e857933e9a0dc21ca9792804935b947e2dd445:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:132:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:521:e67ad25be94676a4f5871db03e779766f57c9cca:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:133:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:522:0619e3dcfbdad1ba16d48fc51e401c1dbc479ec3:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:134:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:523:795bc1a360650b2d7a4e611caaacf8c233d1c5bc:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:135:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:524:75c42c50aedf952ae671da572f7c595359125f20:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:136:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:525:d6251e865a22c7251efedd41172abaaa8cdc9508:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:137:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:526:8b2e4a8853b8f9f9969abf03922c9f4a5ca6b141:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:138:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:527:c0dfd0381a52b4d1a65973772a28f207ce39fa21:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:139:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:528:57b4a66b0f5d80dfdcfe8c0bff19b39a1133ccdc:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:140:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:529:d14eb4fd0e31828fd50ade7068e4b72da906ad68:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:141:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:530:5f9f25c84c62310a52f36db87e6aa74e9a8cbe38:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:142:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:531:87aac809dbd1b470dfd257f52f03c0a8a5e8f75f:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:143:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:532:7835dda30219ca441705cd1b052cfef2eca97921:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:144:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:533:18238ff775251100b534aa029b1f102f50a1271e:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:145:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:534:41296e4bc7adc7da7ad325bdaaf2897881c50d2f:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:146:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:535:96fca3dd1f91be8eba36478208218ec37c943516:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:147:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:536:a2362c00de6bb651b160c129dda311c14702d5fb:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:148:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:537:bb4c463783e53ea4c078511a69e553b26b5b6489:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:149:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:538:988ec29fa605233f14548246038413cf4765232d:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:150:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:539:ff5208a8b3bd6bb062b5bff5a561529d7b01add9:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:151:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:540:c8eef5aa4426219211bc85083fde50122032d7db:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:152:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:541:38f0761ffa346702a1c8cd87663313add6efd2fb:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:153:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:542:e41ce7249fc8e5120957cc61ce0e6ce14dcdac4a:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:154:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:543:c2e1ff9d33f7642d9eb5a9fa460a93e4d7adfdbd:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:155:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:544:94eff178f4b00004f95b07ccc47a52e164a6912e:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:156:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:545:b767907a8d2554d25025d585a02fad0f0e970001:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:157:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:546:68c7b65b1914f2170549a7e229c4c139947288da:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:158:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:547:3d27d539d31ad521aeb2676d84083b303df286ad:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:159:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:548:40da61b4445b3821e5e32d6426f589ae6aa0d48c:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:160:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:549:b884656a95290f2d1d689fafdeea894ec1520aaf:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:161:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:550:d9a822d0862550f727f4aa39b396aa50f19fa839:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:162:HEAD:docs/evidence/R-12.2-AJ/EVIDENCE_BUNDLE.md:551:52aa4b6a31ce77d3c03f744349a05b6849424995:client/package-lock.json:889:      "integrity": "sha512-V7Qr52IhZmdKPVr+Vtw8o+WLsQJYCTd8loIfpDaMRWGUZfBOYEJeyJIkqGIDMZPwPx24pUMfwSxxI8phr/MbOA==",
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:163:HEAD:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:151:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:164:HEAD:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:152:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:165:HEAD:docs/evidence/R-12.2-X/hosted-connection-grep.txt:4:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:166:HEAD:docs/evidence/R-12.2-X/hosted-connection-grep.txt:5:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:167:HEAD:scripts/run_hosted_tripwire.js:20:    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/g, 'postgresql://[REDACTED]:****@')
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:168:HEAD:scripts/run_negative_control.js:21:  `FAKE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:169:HEAD:test_secrets.txt:1:FAKE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:170:HEAD:tests/safeguards.test.ts:21:      assertDisposableUrl('postgresql://postgres.exampleref:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:171:HEAD:tests/safeguards.test.ts:25:      assertDisposableUrl('postgresql://user:pass@db.neon.tech/pickem_rehearsal');
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:172:HEAD:tests/safeguards.test.ts:30:    const prodFingerprint = 'postgresql://postgres.exampleref:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:183:origin/main:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:151:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:184:origin/main:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:152:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:185:origin/main:docs/evidence/R-12.2-X/hosted-connection-grep.txt:4:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:186:origin/main:docs/evidence/R-12.2-X/hosted-connection-grep.txt:5:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:187:origin/main:tests/safeguards.test.ts:21:      assertDisposableUrl('postgresql://postgres.exampleref:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:188:origin/main:tests/safeguards.test.ts:25:      assertDisposableUrl('postgresql://user:pass@db.neon.tech/pickem_rehearsal');
HEAD:docs/evidence/R-12.2-AK/EVIDENCE_BUNDLE.md:189:origin/main:tests/safeguards.test.ts:30:    const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
HEAD:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:151:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:152:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:docs/evidence/R-12.2-X/hosted-connection-grep.txt:4:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:docs/evidence/R-12.2-X/hosted-connection-grep.txt:5:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
HEAD:scripts/run_hosted_tripwire.js:20:    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/g, 'postgresql://[REDACTED]:****@')
HEAD:scripts/run_negative_control.js:21:  `FAKE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
HEAD:test_secrets.txt:1:FAKE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
HEAD:tests/safeguards.test.ts:21:      assertDisposableUrl('postgresql://postgres.exampleref:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
HEAD:tests/safeguards.test.ts:25:      assertDisposableUrl('postgresql://user:pass@db.neon.tech/pickem_rehearsal');
HEAD:tests/safeguards.test.ts:30:    const prodFingerprint = 'postgresql://postgres.exampleref:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

--- Cleaning up .worktree-ctl ---
```
*Verification: Negative control commit containing fake JWT and database credentials was successfully detected.*

### 4.2 History Scan Output against origin/main
```text
=== History Secret Scan against origin/main ===
Excluding package-lock.json, including tests/...
MATCHES FOUND:
origin/main:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:151:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
origin/main:docs/evidence/R-12.2-X/EVIDENCE_BUNDLE.md:152:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
origin/main:docs/evidence/R-12.2-X/hosted-connection-grep.txt:4:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         21       assertDisposableUrl('postgresql://postgres.nsljipyoihcoqkuphhll:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
origin/main:docs/evidence/R-12.2-X/hosted-connection-grep.txt:5:C:\Users\kacone\Documents\AI and Tech\Antigravity\NFL Pick Em\tests\safeguards.test.ts         30     const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';                    
origin/main:tests/safeguards.test.ts:21:      assertDisposableUrl('postgresql://postgres.exampleref:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
origin/main:tests/safeguards.test.ts:25:      assertDisposableUrl('postgresql://user:pass@db.neon.tech/pickem_rehearsal');
origin/main:tests/safeguards.test.ts:30:    const prodFingerprint = 'postgresql://postgres:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
```

### 4.3 CI Function Revoke Guard Check (`scripts/ci_check_functions.sh`)
```text
=== CI Function Revoke Guard Check (Decision #15) ===
✅ Function 'penalty_ledger_prevent_update_delete' in prisma/migrations/20260929144500_br_1_ledger_append_only/migration.sql verified with REVOKE ALL.
✅ Function 'penalty_ledger_prevent_truncate' in prisma/migrations/20260929144500_br_1_ledger_append_only/migration.sql verified with REVOKE ALL.
✅ Function 'check_reminder_offsets' in prisma/migrations/20261001160000_12_1_a_outbox_inbox_core/migration.sql verified with REVOKE ALL.
✅ CI Check PASSED: All database functions properly revoked from PUBLIC, anon, authenticated.
```

---

## 5. Implementation Report (`report.txt`)

```text
=== R-12.2-AL Implementation Report ===

1. package.json script entry for jobs:drain:
"jobs:drain": "tsx src/jobs/cli.ts drain"

2. Scheduler file structure:
- Controlled by environment flag: INTERNAL_JOBS_ENABLED=true (default: false).
- File structure: src/jobs/scheduler.ts initializing background outbox drain intervals.
- Graceful shutdown details: SIGTERM / SIGINT process hooks clear active setInterval / setTimeout timers, await in-flight batch drain executions, and release uncompleted worker leases back to PostgreSQL.

3. Sync and scoring instrumentation status with withJobRun:
Deferred to Step B4 under INV-5 characterization tests.
```

---

## 6. Clean-Room Database Header & Full Test Suite Execution (`npm run test:db`)

### 6.1 Decision #50 Database Header
```text
=== DB Header & Rehearsal Verification ===

1. Database Identity:
[
  {
    "current_database": "pickem_rehearsal",
    "current_user": "postgres",
    "inet_server_addr": "::1",
    "inet_server_port": 5432
  }
]

2. Applied Migrations:
[
  {
    "migration_name": "20260927000000_init",
    "started_at": "2026-10-02T19:46:13.581Z",
    "finished_at": "2026-10-02T19:46:13.684Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928051824_add_pool_member_stats_and_penalty_ledger",
    "started_at": "2026-10-02T19:46:13.685Z",
    "finished_at": "2026-10-02T19:46:13.716Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928124900_precision_and_weekly_submissions",
    "started_at": "2026-10-02T19:46:13.717Z",
    "finished_at": "2026-10-02T19:46:13.759Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928170000_weekly_submission_finalized_and_game_notes",
    "started_at": "2026-10-02T19:46:13.761Z",
    "finished_at": "2026-10-02T19:46:13.766Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260928180000_shot_cam_penalty_media_and_rls",
    "started_at": "2026-10-02T19:46:13.768Z",
    "finished_at": "2026-10-02T19:46:13.793Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260929144500_br_1_ledger_append_only",
    "started_at": "2026-10-02T19:46:13.794Z",
    "finished_at": "2026-10-02T19:46:13.800Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930010000_br_2b_ledger_api_lockdown",
    "started_at": "2026-10-02T19:46:13.801Z",
    "finished_at": "2026-10-02T19:46:13.805Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20260930020000_br_2c_public_tables_api_lockdown",
    "started_at": "2026-10-02T19:46:13.807Z",
    "finished_at": "2026-10-02T19:46:13.814Z",
    "applied_steps_count": 1
  },
  {
    "migration_name": "20261001160000_12_1_a_outbox_inbox_core",
    "started_at": "2026-10-02T19:46:13.816Z",
    "finished_at": "2026-10-02T19:46:13.884Z",
    "applied_steps_count": 1
  }
]

3. Prisma Migrate Status:
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "pickem_rehearsal", schema "public" at "localhost:5432"

9 migrations found in prisma/migrations

Database schema is up to date!
```

### 6.2 Raw Prisma Generate Output
```text
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 218ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Curious about the SQL queries Prisma ORM generates? Optimize helps you enhance your visibility: https://pris.ly/tip-2-optimize
```

### 6.3 Full Test Suite Execution Log (Verbose)
```text
RUN  v5.0.2 C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 401 when Authorization header is missing 56ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 400 when pool_id query parameter is missing or malformed 11ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 404 when pool does not exist 43ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 403 when user is not the pool commissioner 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: "query" })) > returns 200 and game slate snapshot when user is the verified commissioner 15ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 401 when Authorization header is missing 24ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts
penalty_media row count = 0

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 400 when pool_id is missing or malformed in request body 8ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 404 when pool does not exist in request body 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 403 when user is not the pool commissioner 3ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: "body" })) > returns 200 and upserts pick when authenticated user is the commissioner 23ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403 15ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > verifies zero penalty_media rows exist after denied upload attempts 2ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success 15ms
stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403
penalty_media row count = 0

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)
pool count before = 1
pool count after = 1
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)
pool count before = 1
pool count after = 1
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write)
pool count before = 1
pool count after = 1
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write)
pool count before = 1
pool count after = 1
pool count invariant = PASS

stdout | tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot
pool count before = 1
pool count after = 1
pool count invariant = PASS
member response byte equality = PASS
commissioner response byte equality = PASS

 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) > PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success 10ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write) 10ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write) 5ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 400 when explicit pool_id is not a valid UUID (no pool write) 4ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 403 when user is not a member or commissioner of the requested pool (no pool write) 6ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) > returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot 15ms
 ✓ tests/br5b_routes.test.ts > BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan > Decision #49: CI Route Scan & Route Guard Verification > verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted 1ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > strips database URLs, API keys, passwords, tokens and truncates to 200 chars 83ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > preserves key names for passwords and tokens while redacting values 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > scrubs ECONNREFUSED host:port patterns 6ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Error Scrubber > handles extremely long error messages by truncating to 200 chars 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Console Mail Transport > appends formatted json logs to outbox-dev.log 11ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > SMTP Mail Transport & Timeouts > fake hanging SMTP transporter times out and maps to error failure 7ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > HTML escaping verification for interpolated markup in pool names and fields 6ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > HTML Escaping & Message-ID SHA256 > Message-ID SHA256 stability across executions 6ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > drains pending outbox event, sets status SENT and records sentAt 34ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > sets status SUPPRESSED when user email preference is disabled 29ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > applies discrete backoff schedule on transport failure 20ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > transitions to DEAD on 5th failure 18ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD 13ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > Drain Worker Lifecycle & Invariants > Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test) 93ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > creates JobRun with RUNNING and transitions to OK with itemsProcessed 23ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > records FAILED status and scrubbed errorCode when job execution throws 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > transitions to PARTIAL status when succeeded > 0 and failed + dead > 0 9ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > database write failure does not fail or abort the underlying job execution 12ms
 ✓ tests/outbox_drain.test.ts > 12.1 Step B: Transport, Drain Worker, and Job Runners > withJobRun Lifecycle & Job Runners > runOutboxDrain integrates with withJobRun 10ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables 49ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables 128ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables 64ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof) 5ms
 ✓ tests/br2.test.ts > BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix > BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions 8ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > both rows created 97ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > duplicate enqueue creates no second outbox OR inbox row 18ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > caller transaction that throws after enqueue leaves zero rows in both tables 18ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > IN_APP-only writes no outbox row 16ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > EMAIL-only writes no inbox row 17ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > disallowed payload key is stripped 16ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink 7ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > rejects non-transaction client or root prisma instance 6ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > skips EMAIL channel if emailEnabled is false in NotificationPreference 17ms
 ✓ tests/notifications.test.ts > 12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) > static test fails if the module imports nodemailer, net, http(s) or fetch 8ms
 ✓ tests/br4b.test.ts > BR-4b: Fail-Closed Claim Store Invariant (Decision #52) > Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed 38ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE) 9ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001 20ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 7ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001 6ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001 11ms
 ✓ tests/br1.test.ts > BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints > BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503 4ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header is absent 3ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 when Authorization header does not start with Bearer 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > returns 401 for an invalid / expired token 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAuth > decodes valid JWT and attaches user to req.user, then calls next() 7ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 401 if req.user is undefined 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > returns 403 if req.user is not ADMIN 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requireAdmin > calls next() if user is ADMIN 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 401 if req.user is missing 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 400 for a malformed non-UUID pool_id 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 404 when the pool does not exist in DB 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > returns 403 when user is neither commissioner nor member 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > calls next() and attaches pool when user is the pool commissioner 1ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: query - extracts pool_id from query params and authorizes commissioner 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: query - returns 400 when pool_id query parameter is missing 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: body - extracts pool_id from request body and authorizes commissioner 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolCommissioner > from: body - returns 400 when pool_id body parameter is missing 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > returns 403 if user is not a member and not the commissioner 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > calls next() when user is active pool member 0ms
 ✓ tests/authMiddleware.test.ts > BR-5 middleware unit tests (pure mock) > requirePoolMember > calls next() when user is the pool commissioner (even without explicit membership row) 0ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock: enforces lock per-game at kickoff boundary 3ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Rolling lock with offset: enforces lock at (kickoff - offset) 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Global lock vs Rolling lock: handles first game vs later games 1ms
 ✓ tests/characterization.test.ts > INV-5 Lock Logic & Boundary Characterization > Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF 2ms
 ✓ tests/characterization.test.ts > BR-4 splitPenalty Math Characterization > Worked matrix: confirms exact zero-diff decimal split amounts 4ms
 ✓ tests/characterization.test.ts > BR-4b Set-Equality: Wrap-Up vs Scoring Resolver > Asserts 100% game ID set equality between wrap-up and scoring resolvers 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > allows valid local disposable database URLs 3ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.) 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects URLs using ?schema= parameter to bypass host isolation 0ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > rejects non-disposable production database names on localhost 1ms
 ✓ tests/safeguards.test.ts > BR-6 Safeguards: assertDisposableUrl > sabotage test: throws when TEST_DATABASE_URL is empty string or undefined 1ms

 Test Files  9 passed (9)
      Tests  97 passed (97)
   Start at  12:46:26
   Duration  5.78s (tests 53%, import 20%, setup 14%, transform 11%, worker 2%)

    Isolate  9 workers spawned · ~234ms startup each (spawn + environment, per file)
             at least ~1.87s faster with isolate: false — reuses workers across files instead of one per file

JSON report written to C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/docs/evidence/R-12.2-AL/test_summary.json
```

### 6.4 Test Summary JSON Artifact
```json
{"numTotalTestSuites":35,"numPassedTestSuites":35,"numFailedTestSuites":0,"numPendingTestSuites":0,"numTotalTests":97,"numPassedTests":97,"numFailedTests":0,"numPendingTests":0,"numTodoTests":0,"snapshot":{"added":0,"failure":false,"filesAdded":0,"filesRemoved":0,"filesRemovedList":[],"filesUnmatched":0,"filesUpdated":0,"matched":0,"total":0,"unchecked":0,"uncheckedKeysByFile":[],"unmatched":0,"updated":0,"didUpdate":false},"startTime":1790970386824,"success":true,"testResults":[{"assertionResults":[{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth returns 401 when Authorization header is absent","status":"passed","title":"returns 401 when Authorization header is absent","duration":3.2736999999999625,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth returns 401 when Authorization header does not start with Bearer","status":"passed","title":"returns 401 when Authorization header does not start with Bearer","duration":0.6206999999999994,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth returns 401 for an invalid / expired token","status":"passed","title":"returns 401 for an invalid / expired token","duration":0.8464999999999918,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAuth"],"fullName":"BR-5 middleware unit tests (pure mock) requireAuth decodes valid JWT and attaches user to req.user, then calls next()","status":"passed","title":"decodes valid JWT and attaches user to req.user, then calls next()","duration":6.735500000000002,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAdmin"],"fullName":"BR-5 middleware unit tests (pure mock) requireAdmin returns 401 if req.user is undefined","status":"passed","title":"returns 401 if req.user is undefined","duration":0.8458000000000538,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAdmin"],"fullName":"BR-5 middleware unit tests (pure mock) requireAdmin returns 403 if req.user is not ADMIN","status":"passed","title":"returns 403 if req.user is not ADMIN","duration":0.5144999999999982,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requireAdmin"],"fullName":"BR-5 middleware unit tests (pure mock) requireAdmin calls next() if user is ADMIN","status":"passed","title":"calls next() if user is ADMIN","duration":0.5437999999999192,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 401 if req.user is missing","status":"passed","title":"returns 401 if req.user is missing","duration":0.9490999999999303,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 400 for a malformed non-UUID pool_id","status":"passed","title":"returns 400 for a malformed non-UUID pool_id","duration":1.0416999999999916,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 404 when the pool does not exist in DB","status":"passed","title":"returns 404 when the pool does not exist in DB","duration":1.1578999999999269,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner returns 403 when user is neither commissioner nor member","status":"passed","title":"returns 403 when user is neither commissioner nor member","duration":0.6878000000000384,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects","status":"passed","title":"Decision #20 & R-12.2-W: global ADMIN who is not the pool commissioner -> 403, no req.pool, zero side effects","duration":0.7393999999999323,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner calls next() and attaches pool when user is the pool commissioner","status":"passed","title":"calls next() and attaches pool when user is the pool commissioner","duration":0.5500000000000682,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: query - extracts pool_id from query params and authorizes commissioner","status":"passed","title":"from: query - extracts pool_id from query params and authorizes commissioner","duration":0.3734000000000606,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: query - returns 400 when pool_id query parameter is missing","status":"passed","title":"from: query - returns 400 when pool_id query parameter is missing","duration":0.259900000000016,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: body - extracts pool_id from request body and authorizes commissioner","status":"passed","title":"from: body - extracts pool_id from request body and authorizes commissioner","duration":0.2907999999999902,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolCommissioner"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolCommissioner from: body - returns 400 when pool_id body parameter is missing","status":"passed","title":"from: body - returns 400 when pool_id body parameter is missing","duration":0.19910000000004402,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember returns 403 if user is not a member and not the commissioner","status":"passed","title":"returns 403 if user is not a member and not the commissioner","duration":0.4133000000000493,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool","status":"passed","title":"Decision #20 & R-12.2-W: global ADMIN who is not a member and not commissioner -> 403, no req.pool","duration":0.268100000000004,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember calls next() when user is active pool member","status":"passed","title":"calls next() when user is active pool member","duration":0.23139999999989413,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5 middleware unit tests (pure mock)","requirePoolMember"],"fullName":"BR-5 middleware unit tests (pure mock) requirePoolMember calls next() when user is the pool commissioner (even without explicit membership row)","status":"passed","title":"calls next() when user is the pool commissioner (even without explicit membership row)","duration":0.17960000000005039,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790970391753,"endTime":1790970391775.1797,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/authMiddleware.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE)","status":"passed","title":"BR-1: asserts trigger and function definitions match requirements (BEFORE ROW/STATEMENT, plpgsql, prosecdef=false, unconditional RAISE)","duration":8.948999999999955,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001","status":"passed","title":"BR-1: UPDATE (including no-op update) is blocked with count >= 1 and SQLSTATE P0001","duration":19.82310000000001,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","status":"passed","title":"BR-1: DELETE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","duration":6.793799999999976,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","status":"passed","title":"BR-1: TRUNCATE on penalty_ledger is blocked with count >= 1 and SQLSTATE P0001","duration":6.223799999999983,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001","status":"passed","title":"BR-1: membership-row DELETE cascades to penalty_ledger and is intercepted by trigger with P0001","duration":10.6952,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints"],"fullName":"BR-1: Append-Only Trigger Definitions, Immutability & Cascading Constraints BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503","status":"passed","title":"BR-1: DELETE FROM pools fixture asserts exact foreign key constraint pool_memberships_pool_id_fkey and SQLSTATE 23503","duration":4.327599999999961,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790970391124,"endTime":1790970391181.3276,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br1.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables","status":"passed","title":"BR-2b/2c: asserts RLS is ENABLED (relrowsecurity=true) and relforcerowsecurity=false on all application public tables","duration":49.09949999999998,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables","status":"passed","title":"BR-2b/2c: asserts anon role is denied SELECT (SQLSTATE 42501) across all public tables","duration":127.8843,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables","status":"passed","title":"BR-2b/2c: asserts authenticated role is denied SELECT (SQLSTATE 42501) across all public tables","duration":64.32490000000001,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof)","status":"passed","title":"BR-2b: asserts anon role is denied UPDATE on penalty_ledger with SQLSTATE 42501 (privilege proof)","duration":5.38110000000006,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix"],"fullName":"BR-2b & BR-2c: Row-Level Security & Privilege Lockdown Matrix BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions","status":"passed","title":"BR-2c: asserts has_function_privilege returns false for anon and authenticated on BR-1 trigger functions","duration":8.019800000000032,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790970389471,"endTime":1790970389726.0198,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br2.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-4b: Fail-Closed Claim Store Invariant (Decision #52)"],"fullName":"BR-4b: Fail-Closed Claim Store Invariant (Decision #52) Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed","status":"passed","title":"Decision #52: executeWeeklyWrapUp returns CLAIM_STORE_UNAVAILABLE when claim table is absent or fails closed","duration":37.568899999999985,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790970390718,"endTime":1790970390755.5688,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br4b.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 401 when Authorization header is missing","status":"passed","title":"returns 401 when Authorization header is missing","duration":56.246399999999994,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 400 when pool_id query parameter is missing or malformed","status":"passed","title":"returns 400 when pool_id query parameter is missing or malformed","duration":11.338999999999942,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 404 when pool does not exist","status":"passed","title":"returns 404 when pool does not exist","duration":43.054700000000025,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 403 when user is not the pool commissioner","status":"passed","title":"returns 403 when user is not the pool commissioner","duration":5.4138000000000375,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan GET /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"query\" })) returns 200 and game slate snapshot when user is the verified commissioner","status":"passed","title":"returns 200 and game slate snapshot when user is the verified commissioner","duration":14.544199999999933,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 401 when Authorization header is missing","status":"passed","title":"returns 401 when Authorization header is missing","duration":23.776200000000017,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 400 when pool_id is missing or malformed in request body","status":"passed","title":"returns 400 when pool_id is missing or malformed in request body","duration":7.530999999999949,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 404 when pool does not exist in request body","status":"passed","title":"returns 404 when pool does not exist in request body","duration":4.790899999999965,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 403 when user is not the pool commissioner","status":"passed","title":"returns 403 when user is not the pool commissioner","duration":3.29099999999994,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" }))"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan PUT /api/admin/picks (Guarded by requirePoolCommissioner({ from: \"body\" })) returns 200 and upserts pick when authenticated user is the commissioner","status":"passed","title":"returns 200 and upserts pick when authenticated user is the commissioner","duration":22.67439999999999,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403","status":"passed","title":"POST /api/pools/:pool_id/penalties/:id/media: global ADMIN who is neither owner nor commissioner -> 403","duration":14.94010000000003,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403","status":"passed","title":"POST /api/pools/:pool_id/penalties/:id/media: member who is NOT the penalty owner -> 403","duration":6.330500000000029,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) verifies zero penalty_media rows exist after denied upload attempts","status":"passed","title":"verifies zero penalty_media rows exist after denied upload attempts","duration":1.560699999999997,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success","status":"passed","title":"POST /api/pools/:pool_id/penalties/:id/media: penalty OWNER -> 201 success","duration":14.518800000000056,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403","status":"passed","title":"PATCH /api/pools/:pool_id/penalties/:id/media/confirm: global ADMIN who is not commissioner -> 403","duration":5.926999999999907,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-7: Shot-Cam Media Routes Scoping (No Global Admin Bypass) PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success","status":"passed","title":"PATCH /api/pools/:pool_id/penalties/:id/media/confirm: pool COMMISSIONER -> 200 success","duration":10.108400000000074,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)","status":"passed","title":"returns 404 POOL_NOT_FOUND when user is not member/commissioner of any pool and pool_id is omitted (no pool write)","duration":9.538900000000012,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)","status":"passed","title":"returns 404 POOL_NOT_FOUND when explicit pool_id does not exist (no pool write)","duration":5.089400000000069,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 400 when explicit pool_id is not a valid UUID (no pool write)","status":"passed","title":"returns 400 when explicit pool_id is not a valid UUID (no pool write)","duration":3.7490999999999985,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 403 when user is not a member or commissioner of the requested pool (no pool write)","status":"passed","title":"returns 403 when user is not a member or commissioner of the requested pool (no pool write)","duration":5.841699999999946,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET)"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan S-8: GET /api/games Pool Scoping (No Pool Auto-Creation / Write-on-GET) returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot","status":"passed","title":"returns 200 with pool and games when pool_id is valid, with zero pool writes and identical schema snapshot","duration":15.048900000000003,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan","Decision #49: CI Route Scan & Route Guard Verification"],"fullName":"BR-5b: Admin Picks Routes Scoping & Decision #49 CI Route Scan Decision #49: CI Route Scan & Route Guard Verification verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted","status":"passed","title":"verifies all routes with pool parameters are guarded; only /api/health and GET /api/admin/users allowlisted","duration":0.8358000000000629,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790970387660,"endTime":1790970388015.8357,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/br5b_routes.test.ts"},{"assertionResults":[{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Rolling lock: enforces lock per-game at kickoff boundary","status":"passed","title":"Rolling lock: enforces lock per-game at kickoff boundary","duration":2.981200000000001,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Rolling lock with offset: enforces lock at (kickoff - offset)","status":"passed","title":"Rolling lock with offset: enforces lock at (kickoff - offset)","duration":0.5912000000000148,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Global lock vs Rolling lock: handles first game vs later games","status":"passed","title":"Global lock vs Rolling lock: handles first game vs later games","duration":0.5053000000000338,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["INV-5 Lock Logic & Boundary Characterization"],"fullName":"INV-5 Lock Logic & Boundary Characterization Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF","status":"passed","title":"Excluded windows: correctly identifies TNF, MNF, Sunday Early/Late, SNF","duration":1.952600000000018,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-4 splitPenalty Math Characterization"],"fullName":"BR-4 splitPenalty Math Characterization Worked matrix: confirms exact zero-diff decimal split amounts","status":"passed","title":"Worked matrix: confirms exact zero-diff decimal split amounts","duration":3.799699999999973,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-4b Set-Equality: Wrap-Up vs Scoring Resolver"],"fullName":"BR-4b Set-Equality: Wrap-Up vs Scoring Resolver Asserts 100% game ID set equality between wrap-up and scoring resolvers","status":"passed","title":"Asserts 100% game ID set equality between wrap-up and scoring resolvers","duration":1.1994999999999436,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790970392257,"endTime":1790970392269.1995,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/characterization.test.ts"},{"assertionResults":[{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) both rows created","status":"passed","title":"both rows created","duration":96.85410000000002,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) duplicate enqueue creates no second outbox OR inbox row","status":"passed","title":"duplicate enqueue creates no second outbox OR inbox row","duration":17.880799999999965,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) caller transaction that throws after enqueue leaves zero rows in both tables","status":"passed","title":"caller transaction that throws after enqueue leaves zero rows in both tables","duration":18.382599999999968,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) IN_APP-only writes no outbox row","status":"passed","title":"IN_APP-only writes no outbox row","duration":15.725799999999992,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) EMAIL-only writes no inbox row","status":"passed","title":"EMAIL-only writes no inbox row","duration":17.389499999999998,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) disallowed payload key is stripped","status":"passed","title":"disallowed payload key is stripped","duration":16.48739999999998,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink","status":"passed","title":"reminder payload keys are exactly poolName, windowLabel, lockAtUtc, deepLink","duration":6.9529,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) rejects non-transaction client or root prisma instance","status":"passed","title":"rejects non-transaction client or root prisma instance","duration":6.150500000000022,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) skips EMAIL channel if emailEnabled is false in NotificationPreference","status":"passed","title":"skips EMAIL channel if emailEnabled is false in NotificationPreference","duration":16.790599999999984,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant)"],"fullName":"12.1 Core Schema & enqueueNotification Helper (INV-6 Compliant) static test fails if the module imports nodemailer, net, http(s) or fetch","status":"passed","title":"static test fails if the module imports nodemailer, net, http(s) or fetch","duration":8.312800000000038,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790970390070,"endTime":1790970390291.3127,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/notifications.test.ts"},{"assertionResults":[{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","Error Scrubber"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners Error Scrubber strips database URLs, API keys, passwords, tokens and truncates to 200 chars","status":"passed","title":"strips database URLs, API keys, passwords, tokens and truncates to 200 chars","duration":83.48969999999997,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","Error Scrubber"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners Error Scrubber preserves key names for passwords and tokens while redacting values","status":"passed","title":"preserves key names for passwords and tokens while redacting values","duration":6.711700000000064,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","Error Scrubber"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners Error Scrubber scrubs ECONNREFUSED host:port patterns","status":"passed","title":"scrubs ECONNREFUSED host:port patterns","duration":5.53959999999995,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","Error Scrubber"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners Error Scrubber handles extremely long error messages by truncating to 200 chars","status":"passed","title":"handles extremely long error messages by truncating to 200 chars","duration":6.550899999999956,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","Console Mail Transport"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners Console Mail Transport appends formatted json logs to outbox-dev.log","status":"passed","title":"appends formatted json logs to outbox-dev.log","duration":10.518899999999917,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","SMTP Mail Transport & Timeouts"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners SMTP Mail Transport & Timeouts throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing","status":"passed","title":"throws error on construction if MAIL_TRANSPORT=smtp and SMTP_FROM is missing","duration":7.412199999999984,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","SMTP Mail Transport & Timeouts"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners SMTP Mail Transport & Timeouts fake hanging SMTP transporter times out and maps to error failure","status":"passed","title":"fake hanging SMTP transporter times out and maps to error failure","duration":6.7690000000000055,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","HTML Escaping & Message-ID SHA256"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners HTML Escaping & Message-ID SHA256 HTML escaping verification for interpolated markup in pool names and fields","status":"passed","title":"HTML escaping verification for interpolated markup in pool names and fields","duration":5.919899999999984,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","HTML Escaping & Message-ID SHA256"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners HTML Escaping & Message-ID SHA256 Message-ID SHA256 stability across executions","status":"passed","title":"Message-ID SHA256 stability across executions","duration":5.937000000000012,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","Drain Worker Lifecycle & Invariants"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners Drain Worker Lifecycle & Invariants drains pending outbox event, sets status SENT and records sentAt","status":"passed","title":"drains pending outbox event, sets status SENT and records sentAt","duration":34.370199999999954,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","Drain Worker Lifecycle & Invariants"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners Drain Worker Lifecycle & Invariants sets status SUPPRESSED when user email preference is disabled","status":"passed","title":"sets status SUPPRESSED when user email preference is disabled","duration":28.764499999999998,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","Drain Worker Lifecycle & Invariants"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners Drain Worker Lifecycle & Invariants applies discrete backoff schedule on transport failure","status":"passed","title":"applies discrete backoff schedule on transport failure","duration":19.854299999999967,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","Drain Worker Lifecycle & Invariants"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners Drain Worker Lifecycle & Invariants transitions to DEAD on 5th failure","status":"passed","title":"transitions to DEAD on 5th failure","duration":17.831299999999942,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","Drain Worker Lifecycle & Invariants"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners Drain Worker Lifecycle & Invariants Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD","status":"passed","title":"Event repeatedly crashing during worker processing increments attempts to 5 and transitions to DEAD","duration":12.955900000000042,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","Drain Worker Lifecycle & Invariants"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners Drain Worker Lifecycle & Invariants Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test)","status":"passed","title":"Two concurrent workers with slow fake transport never duplicate sends (conditional renewal test)","duration":93.46379999999999,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","withJobRun Lifecycle & Job Runners"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners withJobRun Lifecycle & Job Runners creates JobRun with RUNNING and transitions to OK with itemsProcessed","status":"passed","title":"creates JobRun with RUNNING and transitions to OK with itemsProcessed","duration":23.160099999999943,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","withJobRun Lifecycle & Job Runners"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners withJobRun Lifecycle & Job Runners records FAILED status and scrubbed errorCode when job execution throws","status":"passed","title":"records FAILED status and scrubbed errorCode when job execution throws","duration":9.28570000000002,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","withJobRun Lifecycle & Job Runners"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners withJobRun Lifecycle & Job Runners transitions to PARTIAL status when succeeded > 0 and failed + dead > 0","status":"passed","title":"transitions to PARTIAL status when succeeded > 0 and failed + dead > 0","duration":9.277699999999982,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","withJobRun Lifecycle & Job Runners"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners withJobRun Lifecycle & Job Runners database write failure does not fail or abort the underlying job execution","status":"passed","title":"database write failure does not fail or abort the underlying job execution","duration":11.665700000000015,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["12.1 Step B: Transport, Drain Worker, and Job Runners","withJobRun Lifecycle & Job Runners"],"fullName":"12.1 Step B: Transport, Drain Worker, and Job Runners withJobRun Lifecycle & Job Runners runOutboxDrain integrates with withJobRun","status":"passed","title":"runOutboxDrain integrates with withJobRun","duration":10.383800000000065,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790970388725,"endTime":1790970389136.3838,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/outbox_drain.test.ts"},{"assertionResults":[{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl allows valid local disposable database URLs","status":"passed","title":"allows valid local disposable database URLs","duration":2.9039000000000215,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.)","status":"passed","title":"rejects remote / hosted database URLs (Supabase, AWS, Neon, etc.)","duration":0.7323999999999842,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection","status":"passed","title":"Decision #32 Sabotage Test: point TEST_DATABASE_URL at production fingerprint -> aborts before connection","duration":0.40100000000001046,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl rejects URLs using ?schema= parameter to bypass host isolation","status":"passed","title":"rejects URLs using ?schema= parameter to bypass host isolation","duration":0.3645999999999958,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl rejects non-disposable production database names on localhost","status":"passed","title":"rejects non-disposable production database names on localhost","duration":0.9504000000000019,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]},{"ancestorTitles":["BR-6 Safeguards: assertDisposableUrl"],"fullName":"BR-6 Safeguards: assertDisposableUrl sabotage test: throws when TEST_DATABASE_URL is empty string or undefined","status":"passed","title":"sabotage test: throws when TEST_DATABASE_URL is empty string or undefined","duration":0.557200000000023,"failureMessages":[],"meta":{},"tags":[],"benchmarks":[]}],"startTime":1790970392606,"endTime":1790970392612.5571,"status":"passed","message":"","name":"C:/Users/kacone/Documents/AI and Tech/Antigravity/NFL Pick Em/tests/safeguards.test.ts"}]}
```

---

## 7. Migration State & Schema Parity

### 7.1 Migration SQL (`prisma/migrations/20261001160000_12_1_a_outbox_inbox_core/migration.sql`)
```sql
-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('RUNNING', 'OK', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "inbox_messages" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_expires_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "sent_at" TIMESTAMP(3),
    "retried_by" UUID,
    "retried_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_offsets_hours" integer[] NOT NULL DEFAULT ARRAY[24,2],
    "unsubscribe_token" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" UUID NOT NULL,
    "job_name" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "items_processed" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "meta" JSONB,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inbox_messages_user_id_read_at_created_at_idx" ON "inbox_messages"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inbox_messages_user_id_dedupe_key_key" ON "inbox_messages"("user_id", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_dedupe_key_key" ON "outbox_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "outbox_events_status_next_attempt_at_idx" ON "outbox_events"("status", "next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_unsubscribe_token_key" ON "notification_preferences"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "job_runs_job_name_started_at_idx" ON "job_runs"("job_name", "started_at");

-- AddForeignKey
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_retried_by_fkey" FOREIGN KEY ("retried_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Decision #15: Deny-by-default Data API access
REVOKE ALL ON inbox_messages FROM anon, authenticated;
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON outbox_events FROM anon, authenticated;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON notification_preferences FROM anon, authenticated;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON job_runs FROM anon, authenticated;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;

-- Enforce constraints per Directive 4.2 and R-12.2-AK
ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_attempts_check CHECK (attempts >= 0);

CREATE OR REPLACE FUNCTION check_reminder_offsets(offsets integer[])
RETURNS boolean AS $$
BEGIN
    IF offsets IS NULL THEN
        RETURN false;
    END IF;
    IF cardinality(offsets) > 5 THEN
        RETURN false;
    END IF;
    RETURN (SELECT COALESCE(bool_and(x BETWEEN 1 AND 168), true) FROM unnest(offsets) x);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

REVOKE ALL ON FUNCTION check_reminder_offsets(integer[]) FROM PUBLIC, anon, authenticated;

ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_offsets_check CHECK (check_reminder_offsets(reminder_offsets_hours));
```

### 7.2 Schema Diff Output (`prisma migrate diff`)
```text
No difference detected.
```

---

## 8. Source Code Deliverables (B3 Defect Fixes)

### 8.1 Notifications Service (`src/services/notifications.ts`)
```typescript
import { Prisma } from '@prisma/client';

export type NotificationChannel = 'IN_APP' | 'EMAIL';

export const REMINDER_PAYLOAD_KEYS = ['poolName', 'windowLabel', 'lockAtUtc', 'deepLink'] as const;

export const ALLOWED_PAYLOAD_KEYS_BY_TYPE: Record<string, readonly string[]> = {
  REMINDER: REMINDER_PAYLOAD_KEYS,
  PICK_REMINDER: REMINDER_PAYLOAD_KEYS,
  WRAPUP_REMINDER: REMINDER_PAYLOAD_KEYS,
};

export interface EnqueueNotificationInput {
  poolId: string;
  userId: string;
  type: string;
  payload: any;
  dedupeKey: string;
  channels: NotificationChannel[];
}

export interface EnqueueNotificationResult {
  inboxMessageCreated: boolean;
  outboxEventCreated: boolean;
  dedupeKey: string;
}

/**
 * DEFAULT-DENY payload sanitizer.
 * Only keys explicitly declared in the registry for the given notification type are allowed.
 * Unregistered types or keys are stripped and logged as errors (does not throw).
 */
export function sanitizePayload(type: string, payload: any): Record<string, any> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  const allowedKeys = ALLOWED_PAYLOAD_KEYS_BY_TYPE[type];
  if (!allowedKeys) {
    console.error(`[notifications] DEFAULT-DENY: Unregistered notification type '${type}', payload stripped`);
    return {};
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowedKeys.includes(key)) {
      if (key === 'deepLink' && typeof value === 'string' && !/^https?:\/\//i.test(value)) {
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
        sanitized[key] = `${baseUrl.replace(/\/+$/, '')}/${value.replace(/^\/+/, '')}`;
      } else {
        sanitized[key] = value;
      }
    } else {
      console.error(`[notifications] Stripped unregistered payload key '${key}' for notification type '${type}'`);
    }
  }
  return sanitized;
}

/**
 * Enqueues an in-app inbox message and/or an outbox event transactionally.
 * Conforms to Decision #5 (Inbox is the source of truth; email is best-effort),
 * Decision #54 (No writes on GET),
 * Decision #57 (Every table written by a re-running job carries a database-enforced dedupe key),
 * and INV-6 (Non-blocking outbound: Zero network calls, DB transaction only).
 *
 * Idempotency is guaranteed via unique constraints on (user_id, dedupe_key) for inbox_messages
 * and dedupe_key on outbox_events with skipDuplicates: true.
 */
export async function enqueueNotification(
  tx: Prisma.TransactionClient | any,
  input: EnqueueNotificationInput
): Promise<EnqueueNotificationResult> {
  // Reject non-transaction or missing clients
  if (!tx || '$transaction' in (tx as object) || !(tx as any).inboxMessage) {
    throw new Error('Transaction client required; received root client');
  }

  const { poolId, userId, type, payload, dedupeKey, channels = ['IN_APP', 'EMAIL'] } = input;

  if (!poolId || !userId || !type || !dedupeKey) {
    throw new Error('poolId, userId, type, and dedupeKey are required to enqueue a notification');
  }

  const cleanPayload = sanitizePayload(type, payload);

  let inboxMessageCreated = false;
  if (channels.includes('IN_APP')) {
    const inboxResult = await tx.inboxMessage.createMany({
      data: [
        {
          poolId,
          userId,
          type,
          payload: cleanPayload,
          dedupeKey,
        },
      ],
      skipDuplicates: true,
    });
    inboxMessageCreated = inboxResult.count > 0;
  }

  let outboxEventCreated = false;
  if (channels.includes('EMAIL')) {
    const pref = await tx.notificationPreference.findUnique({
      where: { userId },
      select: { emailEnabled: true },
    });

    // Skip EMAIL channel if user preference emailEnabled === false
    if (pref === null || pref.emailEnabled !== false) {
      const outboxResult = await tx.outboxEvent.createMany({
        data: [
          {
            poolId,
            recipientUserId: userId,
            type,
            payload: cleanPayload,
            dedupeKey,
            status: 'PENDING',
            attempts: 0,
          },
        ],
        skipDuplicates: true,
      });
      outboxEventCreated = outboxResult.count > 0;
    }
  }

  return {
    inboxMessageCreated,
    outboxEventCreated,
    dedupeKey,
  };
}

```

### 8.2 Mail Transport Interface & Adapters (`src/transport/mail.ts`)
```typescript
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  messageId?: string;
  headers?: Record<string, string>;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MailTransport {
  sendMail(options: SendMailOptions): Promise<SendMailResult>;
}

/**
 * Development / console mail transport.
 * Writes formatted JSON email payloads to logs/outbox-dev.log.
 */
export class ConsoleMailTransport implements MailTransport {
  private logPath: string;

  constructor(logPath: string = path.resolve(process.cwd(), 'logs', 'outbox-dev.log')) {
    this.logPath = logPath;
  }

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      to: options.to,
      subject: options.subject,
      messageId: options.messageId,
      headers: options.headers,
      text: options.text,
      html: options.html,
    };

    fs.appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n', 'utf8');

    return {
      success: true,
      messageId: options.messageId || `console-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  }
}

/**
 * Production SMTP mail transport using nodemailer.
 */
export class SmtpMailTransport implements MailTransport {
  private transporter: nodemailer.Transporter;

  constructor(transporter?: nodemailer.Transporter) {
    if (transporter) {
      this.transporter = transporter;
    } else {
      if (!process.env.SMTP_FROM) {
        throw new Error('SMTP_FROM is required when MAIL_TRANSPORT=smtp');
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
      });
    }
  }

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    try {
      const from = process.env.SMTP_FROM;
      if (!from) {
        throw new Error('SMTP_FROM is required');
      }

      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        messageId: options.messageId,
        headers: options.headers,
      });

      return {
        success: true,
        messageId: info.messageId || options.messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export function getMailTransport(): MailTransport {
  if (process.env.MAIL_TRANSPORT === 'smtp') {
    return new SmtpMailTransport();
  }
  return new ConsoleMailTransport();
}

```

### 8.3 Error Scrubber Utility (`src/utils/errorScrubber.ts`)
```typescript
/**
 * Error scrubber utility for background jobs and outbox events.
 * Strips URLs, tokens, passwords, and sensitive credentials.
 * Preserves key names (e.g. password=[REDACTED]).
 * Scrubs connection failures (e.g. ECONNREFUSED host:port).
 * Enforces a maximum length of 200 characters.
 */
export function scrubErrorMessage(error: unknown): string {
  if (!error) {
    return 'UNKNOWN_ERROR';
  }

  let message = typeof error === 'string' ? error : (error as any)?.message || String(error);

  // Strip database / connection URLs: postgresql://..., postgres://..., mongodb://..., etc.
  message = message.replace(/(?:postgresql|postgres|mysql|mongodb|redis|smtp|smtps|https?):\/\/[^\s"'<>]+/gi, '[REDACTED_URL]');

  // Strip credentials in query strings / key-value patterns while preserving key names: password=..., token=...
  message = message.replace(/(password|passwd|pwd|token|secret|api_?key|auth_?token|authorization)=[^&\s]+/gi, '$1=[REDACTED]');

  // Strip ECONNREFUSED host:port or IP:port patterns
  message = message.replace(/ECONNREFUSED\s+[^\s:]+:\d+/gi, 'ECONNREFUSED [REDACTED_HOST]:[REDACTED_PORT]');

  // Strip Bearer tokens and Basic auth headers
  message = message.replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]');
  message = message.replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [REDACTED]');

  // Strip JWT tokens (eyJ...)
  message = message.replace(/eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, '[REDACTED_JWT]');

  // Clean excessive whitespace
  message = message.trim().replace(/\s+/g, ' ');

  // Truncate to maximum 200 characters
  if (message.length > 200) {
    message = message.substring(0, 197) + '...';
  }

  return message;
}

```

### 8.4 Outbox Drain Worker (`src/workers/drain.ts`)
```typescript
import crypto from 'crypto';
import { OutboxStatus } from '@prisma/client';
import prisma from '../db/client';
import { MailTransport, getMailTransport } from '../transport/mail';
import { scrubErrorMessage } from '../utils/errorScrubber';

export const BACKOFF_SCHEDULE_SECONDS = [60, 300, 1800, 7200, 43200] as const; // 1m, 5m, 30m, 2h, 12h
export const MAX_ATTEMPTS = 5;
export const LEASE_DURATION_MS = 60 * 1000; // 60 seconds

export interface DrainOptions {
  batchSize?: number;
  transport?: MailTransport;
}

export interface DrainResult {
  processed: number;
  succeeded: number;
  failed: number;
  dead: number;
  suppressed: number;
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Renders subject, plain text, and HTML-escaped body content from an outbox event.
 */
export function formatEmailContent(event: { type: string; payload: any }): { subject: string; text: string; html: string } {
  const payload = event.payload || {};
  const rawPoolName = payload.poolName || 'NFL Pick Em';
  const rawWindowLabel = payload.windowLabel || 'Upcoming Games';
  const rawLockAtUtc = payload.lockAtUtc ? new Date(payload.lockAtUtc).toUTCString() : '';
  const rawDeepLink = payload.deepLink || '/';

  const poolName = escapeHtml(rawPoolName);
  const windowLabel = escapeHtml(rawWindowLabel);
  const lockAtUtc = escapeHtml(rawLockAtUtc);
  const deepLink = escapeHtml(rawDeepLink);

  let subject = `[${rawPoolName}] Reminder: ${rawWindowLabel}`;
  let text = `Hello,\n\nThis is a reminder for ${rawPoolName} (${rawWindowLabel}). Picks lock at ${rawLockAtUtc}.\n\nMake your picks here: ${rawDeepLink}\n`;
  let html = `<p>Hello,</p><p>This is a reminder for <strong>${poolName}</strong> (<em>${windowLabel}</em>). Picks lock at <strong>${lockAtUtc}</strong>.</p><p><a href="${deepLink}">Make your picks here</a></p>`;

  if (event.type === 'WRAPUP_REMINDER') {
    subject = `[${rawPoolName}] Weekly Wrap-up Available: ${rawWindowLabel}`;
    text = `Hello,\n\nThe weekly results and penalty standings for ${rawPoolName} are now finalized for ${rawWindowLabel}.\n\nView standings: ${rawDeepLink}\n`;
    html = `<p>Hello,</p><p>The weekly results and penalty standings for <strong>${poolName}</strong> are now finalized for <em>${windowLabel}</em>.</p><p><a href="${deepLink}">View standings here</a></p>`;
  }

  return { subject, text, html };
}

/**
 * Claims and processes a batch of pending outbox events using PostgreSQL FOR UPDATE SKIP LOCKED.
 * Conforms to:
 * - Decision #5: Outbox is best-effort dispatch
 * - Decision #57: Dedupe key used as basis for provider Message-ID
 * - Decision #59: FOR UPDATE SKIP LOCKED with explicit lease timeouts and discrete backoff
 * - Decision #60: Every claim of a leased job item counts as an attempt; verified before send and when recorded
 */
export async function drainOutbox(options: DrainOptions = {}): Promise<DrainResult> {
  const batchSize = options.batchSize || 10;
  const transport = options.transport || getMailTransport();

  const stats: DrainResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    dead: 0,
    suppressed: 0,
  };

  // Step 1: Claim batch with FOR UPDATE SKIP LOCKED and increment attempts on expired leases
  const { eventsToProcess, deadCount } = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        pool_id: string;
        recipient_user_id: string;
        type: string;
        payload: any;
        dedupe_key: string;
        status: OutboxStatus;
        attempts: number;
        next_attempt_at: Date;
        lease_expires_at: Date | null;
      }>
    >`
      SELECT id, pool_id, recipient_user_id, type, payload, dedupe_key, status, attempts, next_attempt_at, lease_expires_at
      FROM outbox_events
      WHERE (
        (status = 'PENDING'::"OutboxStatus" AND next_attempt_at <= NOW() AND (lease_expires_at IS NULL OR lease_expires_at <= NOW()))
        OR
        (status = 'PROCESSING'::"OutboxStatus" AND lease_expires_at IS NOT NULL AND lease_expires_at <= NOW())
      )
      ORDER BY next_attempt_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED;
    `;

    if (rows.length === 0) {
      return { eventsToProcess: [], deadCount: 0 };
    }

    let deadCount = 0;
    const eventsToProcess: typeof rows = [];

    for (const row of rows) {
      if (row.status === 'PROCESSING') {
        const newAttempts = row.attempts + 1;
        if (newAttempts >= MAX_ATTEMPTS) {
          await tx.$executeRaw`
            UPDATE outbox_events
            SET status = 'DEAD'::"OutboxStatus",
                attempts = ${newAttempts},
                lease_expires_at = NULL
            WHERE id = ${row.id}::uuid
          `;
          deadCount++;
        } else {
          await tx.$executeRaw`
            UPDATE outbox_events
            SET status = 'PROCESSING'::"OutboxStatus",
                attempts = ${newAttempts},
                lease_expires_at = ${leaseExpiresAt}
            WHERE id = ${row.id}::uuid
          `;
          eventsToProcess.push({ ...row, attempts: newAttempts });
        }
      } else {
        await tx.$executeRaw`
          UPDATE outbox_events
          SET status = 'PROCESSING'::"OutboxStatus",
              lease_expires_at = ${leaseExpiresAt}
          WHERE id = ${row.id}::uuid
        `;
        eventsToProcess.push(row);
      }
    }

    return { eventsToProcess, deadCount };
  });

  stats.processed += deadCount;
  stats.dead += deadCount;

  if (eventsToProcess.length === 0) {
    return stats;
  }

  // Step 2: Process each claimed event
  for (const event of eventsToProcess) {
    stats.processed++;

    try {
      // Check recipient email notification preferences (SUPPRESSED check)
      const pref = await prisma.notificationPreference.findUnique({
        where: { userId: event.recipient_user_id },
      });

      if (pref && pref.emailEnabled === false) {
        // Suppress email dispatch - Must include WHERE id = $1 AND status = 'PROCESSING'
        const updated = await prisma.$executeRaw`
          UPDATE outbox_events
          SET status = 'SUPPRESSED'::"OutboxStatus",
              lease_expires_at = NULL,
              last_error_code = NULL
          WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus"
        `;
        if (updated > 0) {
          stats.suppressed++;
        }
        continue;
      }

      // Lookup recipient user
      const user = await prisma.user.findUnique({
        where: { id: event.recipient_user_id },
        select: { email: true },
      });

      if (!user || !user.email) {
        throw new Error(`Recipient user ${event.recipient_user_id} has no valid email`);
      }

      // Lease safety check: conditional renewal before each send
      const renewed = await prisma.$executeRaw`
        UPDATE outbox_events
        SET lease_expires_at = now() + interval '60 seconds'
        WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus" AND lease_expires_at > now()
      `;

      if (renewed === 0) {
        // Lease lost or expired; skip sending
        continue;
      }

      const { subject, text, html } = formatEmailContent(event);

      // Format Message-ID as <sha256(dedupe_key)@MAIL_DOMAIN> with raw key in X-Dedupe-Key
      const mailDomain = process.env.MAIL_DOMAIN || 'localhost';
      const hashedKey = crypto.createHash('sha256').update(event.dedupe_key).digest('hex');
      const messageId = `<${hashedKey}@${mailDomain}>`;

      const sendResult = await transport.sendMail({
        to: user.email,
        subject,
        text,
        html,
        messageId,
        headers: {
          'X-Dedupe-Key': event.dedupe_key,
        },
      });

      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Mail transport reported failure');
      }

      // Mark SENT on success - Must include WHERE id = $1 AND status = 'PROCESSING'
      const updated = await prisma.$executeRaw`
        UPDATE outbox_events
        SET status = 'SENT'::"OutboxStatus",
            sent_at = NOW(),
            lease_expires_at = NULL,
            last_error_code = NULL
        WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus"
      `;

      if (updated > 0) {
        stats.succeeded++;
      }
    } catch (err: any) {
      const scrubbed = scrubErrorMessage(err);
      const nextAttempts = event.attempts + 1;
      const isDead = nextAttempts >= MAX_ATTEMPTS;
      const nextStatus: OutboxStatus = isDead ? 'DEAD' : 'PENDING';

      // Compute discrete backoff schedule
      const backoffSec = BACKOFF_SCHEDULE_SECONDS[Math.min(nextAttempts - 1, BACKOFF_SCHEDULE_SECONDS.length - 1)];
      const nextAttemptAt = new Date(Date.now() + backoffSec * 1000);

      // Record result - Must include WHERE id = $1 AND status = 'PROCESSING'
      const updated = await prisma.$executeRaw`
        UPDATE outbox_events
        SET status = ${nextStatus}::"OutboxStatus",
            attempts = ${nextAttempts},
            next_attempt_at = ${nextAttemptAt},
            lease_expires_at = NULL,
            last_error_code = ${scrubbed}
        WHERE id = ${event.id}::uuid AND status = 'PROCESSING'::"OutboxStatus"
      `;

      if (updated > 0) {
        if (isDead) {
          stats.dead++;
        } else {
          stats.failed++;
        }
      }
    }
  }

  return stats;
}

```

### 8.5 Job Runner Infrastructure (`src/jobs/jobRunner.ts`)
```typescript
import { JobRun, JobStatus, Prisma } from '@prisma/client';
import prisma from '../db/client';
import { drainOutbox, DrainResult } from '../workers/drain';
import { scrubErrorMessage } from '../utils/errorScrubber';

export interface JobExecutionResult {
  itemsProcessed: number;
  succeeded?: number;
  failed?: number;
  dead?: number;
  meta?: any;
}

/**
 * Wraps a background job function with transactional lifecycle auditing in job_runs.
 * Creates a RUNNING record, executes the function, and updates status to OK, PARTIAL, or FAILED.
 * Resilient against database write failures (logs failure, never throws or skips the underlying job).
 */
export async function withJobRun(
  jobName: string,
  fn: (jobRunId: string) => Promise<JobExecutionResult>
): Promise<JobRun> {
  let jobRunRecord: JobRun | null = null;
  const startedAt = new Date();

  // 1. Attempt initial JobRun creation
  try {
    jobRunRecord = await prisma.jobRun.create({
      data: {
        jobName,
        status: JobStatus.RUNNING,
        startedAt,
        itemsProcessed: 0,
      },
    });
  } catch (err) {
    console.error(`[withJobRun] Failed to create JobRun record for ${jobName}:`, err);
  }

  const jobRunId = jobRunRecord?.id || `fallback-${Date.now()}`;

  try {
    const result = await fn(jobRunId);

    const succeeded = result.succeeded ?? result.meta?.succeeded ?? 0;
    const failed = result.failed ?? result.meta?.failed ?? 0;
    const dead = result.dead ?? result.meta?.dead ?? 0;

    const isPartial = succeeded > 0 && (failed + dead) > 0;
    const finalStatus: JobStatus = isPartial ? JobStatus.PARTIAL : JobStatus.OK;
    const finishedAt = new Date();

    if (jobRunRecord) {
      try {
        jobRunRecord = await prisma.jobRun.update({
          where: { id: jobRunRecord.id },
          data: {
            status: finalStatus,
            finishedAt,
            itemsProcessed: result.itemsProcessed || 0,
            meta: result.meta ? result.meta : Prisma.DbNull,
          },
        });
      } catch (updateErr) {
        console.error(`[withJobRun] Failed to update JobRun record ${jobRunRecord.id}:`, updateErr);
      }
    }

    return (
      jobRunRecord || {
        id: jobRunId,
        jobName,
        status: finalStatus,
        startedAt,
        finishedAt,
        itemsProcessed: result.itemsProcessed || 0,
        errorCode: null,
        meta: result.meta || null,
      }
    );
  } catch (error: any) {
    const scrubbedError = scrubErrorMessage(error);
    const finishedAt = new Date();

    if (jobRunRecord) {
      try {
        jobRunRecord = await prisma.jobRun.update({
          where: { id: jobRunRecord.id },
          data: {
            status: JobStatus.FAILED,
            finishedAt,
            errorCode: scrubbedError,
          },
        });
      } catch (updateErr) {
        console.error(`[withJobRun] Failed to update JobRun error status ${jobRunRecord.id}:`, updateErr);
      }
    }

    return (
      jobRunRecord || {
        id: jobRunId,
        jobName,
        status: JobStatus.FAILED,
        startedAt,
        finishedAt,
        itemsProcessed: 0,
        errorCode: scrubbedError,
        meta: null,
      }
    );
  }
}

/**
 * Executes the outbox drain worker within a tracked JobRun.
 */
export async function runOutboxDrain(options: { batchSize?: number } = {}): Promise<{ jobRun: JobRun; drainResult: DrainResult }> {
  let drainResult: DrainResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    dead: 0,
    suppressed: 0,
  };

  const jobRun = await withJobRun('outbox_drain', async () => {
    drainResult = await drainOutbox(options);
    return {
      itemsProcessed: drainResult.processed,
      succeeded: drainResult.succeeded,
      failed: drainResult.failed,
      dead: drainResult.dead,
      meta: drainResult,
    };
  });

  return { jobRun, drainResult };
}

```

---

## 9. Deviations from Ruling

```text
None. All specifications from Phase B3 (B3.1 removals, B3.2 schema & migration, B3.3 drain worker / transport / job runner defect fixes, B3.4 test coverage, B3.5 documentation, and Decision #60 synchronization) implemented strictly as ruled.
```

---

## 10. Documentation Invariant Audit (Append-Only Verification)

```text
Line Counts:
  648 ARCHITECTURE.md
  139 ROADMAP.md
  417 tasks.md
  1204 total

Numstat vs Baseline (e41ce72):
355	0	ARCHITECTURE.md
61	0	ROADMAP.md
271	0	tasks.md
```
*Verification: Strictly 0 deletions across ARCHITECTURE.md, ROADMAP.md, and tasks.md.*

---

## 11. Acceptance Criteria Checklist

- [ ] B3.1: runReminderScan and its tests removed from src/jobs/, src/workers/, and tests/ in their own commit.
- [ ] B3.2: Schema and migration updated (reminderOffsetsHours Int[] @default([24, 2]), check function returns false for NULL, REVOKE ALL ON FUNCTION check_reminder_offsets), ci_check_functions.sh script passing, zero migration drift.
- [ ] B3.3: Drain worker defect fixes (claim counting for expired PROCESSING leases, transition to DEAD at 5 attempts, default batchSize 10, conditional renewal before each send, WHERE id = $1 AND status = 'PROCESSING' on status updates, HTML escaping for interpolated values, absolute deepLink URLs from APP_BASE_URL, SHA256 dedupe key Message-IDs with X-Dedupe-Key header), SmtpMailTransport timeouts (8000ms) and required SMTP_FROM, scrubErrorMessage with capturing groups and ECONNREFUSED pattern handling, withJobRun DB write error resilience and PARTIAL status transition, .env.example updated.
- [ ] B3.4: Test coverage for drain worker crashing lifecycle, concurrent non-duplication conditional renewal, hanging SMTP timeout, HTML escaping, Message-ID SHA256 stability, withJobRun error resilience and PARTIAL transition, scrubber key preservation and ECONNREFUSED handling.
- [ ] B3.5: Documentation & reporting (report.txt created, Section 9 appended to docs/design/12.1.md, ARCHITECTURE.md and ROADMAP.md updated, Decision #60 synchronized).
- [ ] B3.6: Evidence bundle bound at docs/evidence/R-12.2-AL/EVIDENCE_BUNDLE.md.

---

# MILESTONE 12.1 DESIGN SPECIFICATION

The following is the complete, verbatim content of `docs/design/12.1.md`:

# Phase 12.1 Design Note: Resilient Outbox, Inbox & Background Job Architecture

## 1. Overview & Objectives
Phase 12.1 establishes an asynchronous, resilient background processing architecture for NFL Pick'em. The primary goal is to decouple critical transactional mutations (e.g. pick submissions, pool membership updates, weekly wrap-ups) from downstream side-effects (e.g. notification dispatch, audit streaming, statistical rollups, reminder triggers) via an Outbox Pattern.

---

## 2. Planned Architecture & Components

### 2.1 Files to Add
The following files are planned for addition in Phase 12.1 (strictly keeping application code out of `src/` during Phase 12.0 / R-12.2-AG):
- `src/services/outbox.ts`: Transactional outbox event publisher and queue processor.
- `src/services/inbox.ts`: Idempotent inbox message deduplication and consumer.
- `src/workers/drain.ts`: Outbox drain worker for processing pending outbox events.
- `src/workers/reminder.ts`: Background worker for pick deadline reminders and alerts.
- `src/services/lockResolver.ts`: Extracted, centralized game/pool lock resolution engine and window evaluation.
- `src/jobs/scheduler.ts`: Internal job scheduler loop managing interval timers for background tasks.
- `tests/outbox.test.ts`: Integration tests for outbox transactional persistence, processing, and retry lifecycles.
- `tests/inbox.test.ts`: Idempotency and deduplication tests for incoming events.
- `tests/lockResolver.test.ts`: Unit and characterization tests for lock-offset and window exclusions (`isGameInExcludedWindow`).
- `tests/scheduler.test.ts`: Concurrency and timer tests for the internal scheduler.

---

## 3. Lock-Resolver Extraction Plan

### Current State
Game locking logic (`isGameLocked`), lock offset evaluation (`lock_offset` from `pool.settings`), and window exclusions (`isGameInExcludedWindow` for TNF, MNF, Sunday Early/Late, SNF) are currently distributed across `src/services/scoringEngine.ts`, `src/server.ts`, `src/routes/games.ts`, and `src/services/weeklyWrapUp.ts`.

### Target Extraction
Extract all lock calculation, offset evaluation, and window exclusion rules into a single dedicated, pure module: `src/services/lockResolver.ts` (or `src/utils/lockResolver.ts`).

#### Interface Specification
```typescript
export interface LockContext {
  kickoffTime: Date;
  lockOffsetMinutes: number;
  now?: Date;
}

export interface LockStatus {
  isLocked: boolean;
  effectiveLockTime: Date;
  minutesRemaining: number;
}

export function computeGameLockStatus(context: LockContext): LockStatus;
export function isGameLocked(kickoffTime: Date, lockOffsetMinutes: number, now?: Date): boolean;
export function assertGameUnlocked(kickoffTime: Date, lockOffsetMinutes: number, now?: Date): void;
export function isGameInExcludedWindow(kickoffTimeIso: string | Date, excludedWindows: string[]): boolean;
```

#### Migration Strategy
1. Centralize `isGameInExcludedWindow` and `isGameLocked` in `src/services/lockResolver.ts` with comprehensive unit tests across edge cases (negative offsets, 0 offsets, post-kickoff, timezone variations).
2. Refactor route handlers (`/api/picks`, `/api/games`) and services (`scoringEngine.ts`, `weeklyWrapUp.ts`) to consume `assertGameUnlocked` and `isGameInExcludedWindow`.
3. Verify zero behavioral regression against `tests/characterization.test.ts` and `tests/br5b_routes.test.ts`.

---

## 4. Scheduler Trigger Mechanism

### Constraints
- **No external cron library** (e.g., `node-cron`, `cron`, `agenda`) to maintain a dependency-safe, lightweight, and deterministic runtime.
- Controlled exclusively via environment flags: `INTERNAL_JOBS_ENABLED=true`.

### Implementation Pattern
- **Scheduler Loop**: Native `setInterval` / recursive `setTimeout` loop initialized conditionally upon server startup:
  ```typescript
  if (process.env.INTERNAL_JOBS_ENABLED === 'true') {
    startSchedulerLoop();
  }
  ```
- **Manual Trigger Endpoint**:
  - Secure commissioner/admin endpoint `POST /api/admin/jobs/run` guarded by `requireAuth` and `requireAdmin` for on-demand execution and test harness invocations.
- **Fail-Safe Graceful Shutdown**:
  - Register `SIGTERM` / `SIGINT` hooks to clear active intervals and await completion of in-flight outbox batches.

---

## 5. Outbox & Inbox Event Lifecycle

```
[ HTTP Route Handler ]
       │ (Prisma Transaction)
       ├─── Writes Domain Entity (e.g. Pick, WrapUp)
       └─── Writes OutboxEvent (topic, payload, status: PENDING)
       │
[ Database / PostgreSQL ]
       │
[ Polling Job / Scheduler / drain.ts ] (INTERNAL_JOBS_ENABLED=true)
       │
       ├─── SELECT ... FROM outbox_events WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED
       ├─── Execute Handlers / Dispatchers
       └─── UPDATE outbox_events SET status = 'PROCESSED', processed_at = NOW()
```

---

## 6. Open Questions & Architectural Considerations
1. **Advisory Locking / Multi-Instance Concurrency**:
   - If multiple server instances run simultaneously, should we use PostgreSQL advisory locks (`pg_try_advisory_lock`) or `FOR UPDATE SKIP LOCKED` for outbox polling?
2. **Dead Letter Queue (DLQ) & Retry Policy**:
   - What max-retry count (e.g., 3 or 5) and exponential backoff interval should be enforced before marking an event `FAILED`?
3. **Event Retention / Cleanup**:
   - Should processed outbox events be retained permanently for audit trails or purged after a configurable TTL (e.g., 30 days)?

---

## 7. R-12.2-AJ Section 3 Design Corrections & Amendments

### 7.1 Rename Concept & Architecture Scope
- The notification dispatch and job execution architecture is formalized as the **Resilient Outbox & Event-Driven Notification Engine**.
- Decouples domain write operations from downstream notification delivery.
- Guarantees strict transactional isolation (INV-6) with zero network transport or I/O in API mutation paths.
- Inbox messages serve as the canonical source of truth (Decision #5), while outbox events manage best-effort delivery.
- Every table written by a re-running job carries a database-enforced dedupe key (Decision #57).

### 7.2 Replace POST /api/admin/jobs/run with Internal Worker Invocations
- The proposed generic endpoint `POST /api/admin/jobs/run` is **REMOVED** and replaced by dedicated internal job runners and isolated scheduled workers.
- No public or commissioner HTTP endpoints can trigger arbitrary or unsanitized background jobs.
- Testing harnesses and scheduled triggers execute through direct internal service invocations (`runOutboxDrainWorker()`, `runPickReminderScanner()`) under strict transactional boundaries.

### 7.3 Lifecycle Statuses, Lease Expiration & Exponential Backoff
- Outbox event lifecycle states: `PENDING` -> `PROCESSING` -> `SENT` / `FAILED` -> `DEAD`.
- Job run lifecycle states: `RUNNING` -> `OK` / `PARTIAL` / `FAILED`.
- Exponential Backoff Schedule: Next retry attempt scheduled with delay formula `nextAttemptAt = now + baseDelay * (2 ^ attempts)` (base delay: 60s, max attempts: 5).
- Lease expiration: Processing workers acquire leases with `lease_expires_at = now + 5 minutes`; stale leases are reclaimed automatically on subsequent worker passes.

### 7.4 Lock Resolver Pure Module Extraction
- `src/services/lockResolver.ts` extracted as a pure, stateless computation engine.
- Zero database queries, mutations, or network calls inside `lockResolver.ts`.
- Evaluates `kickoffTime`, `lockOffsetMinutes`, and `excludedWindows` deterministically for both client and server consumers.

### 7.5 Open Questions Resolution
1. **Advisory Locking / Multi-Instance Concurrency:**
   - Standardized on `FOR UPDATE SKIP LOCKED` for outbox event batch polling and claim processing.
2. **Dead Letter Queue (DLQ) & Retry Policy:**
   - Max retry limit set to 5 attempts with exponential backoff. Events reaching 5 failed attempts transition to `DEAD` for manual commissioner triage.
3. **Event Retention & Cleanup:**
   - Sent and dead events retained for 30 days for audit and delivery verification before scheduled background archival.

---

## 8. Supersession

### 8.1 Step A Amendments (B0)
- Foreign keys in `inbox_messages`, `outbox_events`, and `notification_preferences` enforce `ON DELETE RESTRICT ON UPDATE RESTRICT`.
- `notification_preferences.reminder_offsets_hours` defaults to `[24, 2]` with CHECK constraint enforcing `cardinality <= 5` and values between 1 and 168.
- `OutboxStatus` enum includes `SUPPRESSED`.
- `sanitizePayload` operates as DEFAULT-DENY against an explicit per-type allowlist registry, stripping unauthorized keys and logging errors without throwing.
- `enqueueNotification` strictly rejects non-transaction callers.
- Email dispatch is skipped when `NotificationPreference.emailEnabled === false`.

### 8.2 Transport, Drain Worker & Runners (B2)
- `MailTransport` interface decouples email dispatch with `ConsoleMailTransport` (logging to `logs/outbox-dev.log`) and `SmtpMailTransport` (via `nodemailer`).
- `scrubErrorMessage` strips URLs and credentials, enforcing a 200-character maximum length.
- Outbox drain worker utilizes `FOR UPDATE SKIP LOCKED`, a 60-second lease expiration, discrete backoff schedule `[60, 300, 1800, 7200, 43200]` seconds (1m, 5m, 30m, 2h, 12h), transitions to `DEAD` after 5 failed attempts, and sets `SUPPRESSED` when email is disabled.
- Dedupe keys are formatted as provider Message-IDs (`<dedupe_key@nflpickem.local>`).
- Background jobs run via `withJobRun` with full audit logging in `job_runs`.

---

## 9. R-12.2-AL Updates

### 9.1 Scanner Deferred to Step E & Per-Week Dedupe
- `runReminderScan` and reminder scanning logic is removed from Step B3 and deferred to Step E.
- Step E will re-introduce pick deadline reminder scanning using per-week deduplication keys (`reminder-${pool.id}-${user.id}-${weekNumber}-${offset}h`) and lock window awareness.

### 9.2 Claim Counting & Lease Verification (Decision #60)
- Expired `PROCESSING` leases reclaimed by workers increment the attempt counter upon claim.
- If reclaiming an expired lease reaches 5 attempts, the event transitions directly to `DEAD` without re-dispatching.
- Conditional renewal (`UPDATE outbox_events SET lease_expires_at = now() + interval '60 seconds' WHERE id = $1 AND status = 'PROCESSING' AND lease_expires_at > now()`) is executed before each send; if 0 rows are updated, the event send is skipped.
- All post-send status updates strictly assert `WHERE id = $1 AND status = 'PROCESSING'`.

---

# LIVE REPOSITORY CONTEXT

## prisma/schema.prisma

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  USER
}

enum Status {
  ACTIVE
  INACTIVE
}

enum GameStatus {
  SCHEDULED
  IN_PROGRESS
  FINAL
}

enum PenaltyMediaStatus {
  PENDING
  CONFIRMED
  REJECTED
}

model User {
  id                     String                  @id @default(uuid()) @db.Uuid
  email                  String                  @unique
  passwordHash           String                  @map("password_hash")
  role                   Role                    @default(USER)
  createdAt              DateTime                @default(now()) @map("created_at")
  pools                  Pool[]                  @relation("AdministeredPools")
  memberships            PoolMembership[]
  picks                  Pick[]                  @relation("UserPicks")
  submittedPicks         Pick[]                  @relation("SubmittedPicks")
  auditLogs              AuditLog[]              @relation("UserAuditLogs")
  createdPenalties       PenaltyLedger[]         @relation("CreatedPenalties")
  weeklySubmissions      WeeklySubmission[]
  penaltyMedia           PenaltyMedia[]          @relation("UserPenaltyMedia")
  confirmedMedia         PenaltyMedia[]          @relation("ConfirmedPenaltyMedia")
  inboxMessages          InboxMessage[]
  outboxEventsReceived   OutboxEvent[]           @relation("OutboxEventRecipient")
  outboxEventsRetried    OutboxEvent[]           @relation("OutboxEventRetrier")
  notificationPreference NotificationPreference?

  @@map("users")
}

model Pool {
  id                String             @id @default(uuid()) @db.Uuid
  name              String
  adminId           String             @map("admin_id") @db.Uuid
  admin             User               @relation("AdministeredPools", fields: [adminId], references: [id])
  settings          Json
  status            Status             @default(ACTIVE)
  memberships       PoolMembership[]
  picks             Pick[]
  memberStats       PoolMemberStat[]
  penaltyLedger     PenaltyLedger[]
  weeklySubmissions WeeklySubmission[]
  penaltyMedia      PenaltyMedia[]
  inboxMessages     InboxMessage[]
  outboxEvents      OutboxEvent[]

  @@map("pools")
}

model PoolMembership {
  poolId String @map("pool_id") @db.Uuid
  userId String @map("user_id") @db.Uuid
  status Status @default(ACTIVE)

  pool Pool @relation(fields: [poolId], references: [id])
  user User @relation(fields: [userId], references: [id])

  stat              PoolMemberStat?
  penaltyLedger     PenaltyLedger[]
  weeklySubmissions WeeklySubmission[]

  @@id([poolId, userId])
  @@map("pool_memberships")
}

model Game {
  id                String     @id @default(uuid()) @db.Uuid
  externalGameId    String     @unique @map("external_game_id")
  homeTeamId        String     @map("home_team_id")
  awayTeamId        String     @map("away_team_id")
  kickoffTime       DateTime   @map("kickoff_time")
  status            GameStatus @default(SCHEDULED)
  homeScore         Int?       @map("home_score")
  awayScore         Int?       @map("away_score")
  commissionerNotes String?    @map("commissioner_notes")
  picks             Pick[]

  @@map("games")
}

model Pick {
  id             String      @id @default(uuid()) @db.Uuid
  poolId         String      @map("pool_id") @db.Uuid
  userId         String      @map("user_id") @db.Uuid
  gameId         String      @map("game_id") @db.Uuid
  selectedTeamId String?     @map("selected_team_id")
  submittedById  String      @map("submitted_by") @db.Uuid
  createdAt      DateTime    @default(now()) @map("created_at")

  pool        Pool        @relation(fields: [poolId], references: [id])
  user        User        @relation("UserPicks", fields: [userId], references: [id])
  game        Game        @relation(fields: [gameId], references: [id])
  submittedBy User        @relation("SubmittedPicks", fields: [submittedById], references: [id])
  result      PickResult?

  @@unique([poolId, userId, gameId])
  @@map("picks")
}

model PickResult {
  pickId        String   @id @map("pick_id") @db.Uuid
  isCorrect     Boolean  @map("is_correct")
  pointsAwarded Decimal  @map("points_awarded") @db.Decimal(5, 2)
  finalizedAt   DateTime @default(now()) @map("finalized_at")

  pick Pick @relation(fields: [pickId], references: [id], onDelete: Cascade)

  @@map("pick_results")
}

model AuditLog {
  id             String   @id @default(uuid()) @db.Uuid
  actorId        String   @map("actor_id") @db.Uuid
  action         String
  targetEntityId String   @map("target_entity_id")
  oldValue       Json?    @map("old_value")
  newValue       Json?    @map("new_value")
  timestamp      DateTime @default(now())

  actor User @relation("UserAuditLogs", fields: [actorId], references: [id])

  @@map("audit_logs")
}

model PoolMemberStat {
  poolId             String   @map("pool_id") @db.Uuid
  userId             String   @map("user_id") @db.Uuid
  totalShotsDrank    Decimal  @default(0.00) @map("total_shots_drank") @db.Decimal(5, 2)
  firstPlaceFinishes Int      @default(0) @map("first_place_finishes")
  deadPlaceFinishes  Int      @default(0) @map("dead_place_finishes")
  updatedAt          DateTime @default(now()) @updatedAt @map("updated_at")

  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)

  @@id([poolId, userId])
  @@map("pool_member_stats")
}

model PenaltyLedger {
  id          String        @id @default(uuid()) @db.Uuid
  poolId      String        @map("pool_id") @db.Uuid
  userId      String        @map("user_id") @db.Uuid
  weekNumber  Int?          @map("week_number")
  delta       Decimal       @map("delta") @db.Decimal(5, 2)
  reason      String
  createdById String        @map("created_by") @db.Uuid
  createdAt   DateTime      @default(now()) @map("created_at")

  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)
  createdBy  User           @relation("CreatedPenalties", fields: [createdById], references: [id])
  media      PenaltyMedia?

  @@index([poolId, userId])
  @@map("penalty_ledger")
}

model WeeklySubmission {
  id                   String   @id @default(uuid()) @db.Uuid
  poolId               String   @map("pool_id") @db.Uuid
  userId               String   @map("user_id") @db.Uuid
  weekNumber           Int      @map("week_number")
  tieBreakerPrediction Decimal? @map("tie_breaker_prediction") @db.Decimal(5, 2)
  isFinalized          Boolean  @default(false) @map("is_finalized")
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @default(now()) @updatedAt @map("updated_at")

  pool       Pool           @relation(fields: [poolId], references: [id], onDelete: Cascade)
  membership PoolMembership @relation(fields: [poolId, userId], references: [poolId, userId], onDelete: Cascade)
  user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([poolId, userId, weekNumber])
  @@index([poolId, weekNumber, isFinalized])
  @@map("weekly_submissions")
}

model PenaltyMedia {
  id          String             @id @default(uuid()) @db.Uuid
  penaltyId   String             @unique @map("penalty_id") @db.Uuid
  poolId      String             @map("pool_id") @db.Uuid
  userId      String             @map("user_id") @db.Uuid
  storagePath String             @map("storage_path")
  mediaType   String             @map("media_type")
  status      PenaltyMediaStatus @default(PENDING)
  confirmedBy String?            @map("confirmed_by") @db.Uuid
  createdAt   DateTime           @default(now()) @map("created_at")

  penalty   PenaltyLedger @relation(fields: [penaltyId], references: [id], onDelete: Cascade)
  pool      Pool          @relation(fields: [poolId], references: [id], onDelete: Cascade)
  user      User          @relation("UserPenaltyMedia", fields: [userId], references: [id], onDelete: Cascade)
  confirmer User?         @relation("ConfirmedPenaltyMedia", fields: [confirmedBy], references: [id])

  @@index([poolId, userId])
  @@map("penalty_media")
}

enum OutboxStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
  DEAD
  SUPPRESSED
}

enum JobStatus {
  RUNNING
  OK
  PARTIAL
  FAILED
}

model InboxMessage {
  id        String    @id @default(uuid()) @db.Uuid
  poolId    String    @map("pool_id") @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  type      String
  payload   Json
  dedupeKey String    @map("dedupe_key")
  readAt    DateTime? @map("read_at") @db.Timestamp(3)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamp(3)

  pool Pool @relation(fields: [poolId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  user User @relation(fields: [userId], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@unique([userId, dedupeKey])
  @@index([userId, readAt, createdAt])
  @@map("inbox_messages")
}

model OutboxEvent {
  id              String       @id @default(uuid()) @db.Uuid
  poolId          String       @map("pool_id") @db.Uuid
  recipientUserId String       @map("recipient_user_id") @db.Uuid
  type            String
  payload         Json
  dedupeKey       String       @unique @map("dedupe_key")
  status          OutboxStatus @default(PENDING)
  attempts        Int          @default(0)
  nextAttemptAt   DateTime     @default(now()) @map("next_attempt_at") @db.Timestamp(3)
  leaseExpiresAt  DateTime?    @map("lease_expires_at") @db.Timestamp(3)
  lastErrorCode   String?      @map("last_error_code")
  sentAt          DateTime?    @map("sent_at") @db.Timestamp(3)
  retriedBy       String?      @map("retried_by") @db.Uuid
  retriedAt       DateTime?    @map("retried_at") @db.Timestamp(3)
  createdAt       DateTime     @default(now()) @map("created_at") @db.Timestamp(3)

  pool      Pool  @relation(fields: [poolId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  recipient User  @relation("OutboxEventRecipient", fields: [recipientUserId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  retrier   User? @relation("OutboxEventRetrier", fields: [retriedBy], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@index([status, nextAttemptAt])
  @@map("outbox_events")
}

model NotificationPreference {
  userId               String   @id @map("user_id") @db.Uuid
  emailEnabled         Boolean  @default(true) @map("email_enabled")
  reminderOffsetsHours Int[]    @default([24, 2]) @map("reminder_offsets_hours")
  unsubscribeToken     String   @unique @default(uuid()) @map("unsubscribe_token")
  updatedAt            DateTime @updatedAt @map("updated_at") @db.Timestamp(3)

  user User @relation(fields: [userId], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@map("notification_preferences")
}

model JobRun {
  id             String    @id @default(uuid()) @db.Uuid
  jobName        String    @map("job_name")
  status         JobStatus
  startedAt      DateTime  @default(now()) @map("started_at") @db.Timestamp(3)
  finishedAt     DateTime? @map("finished_at") @db.Timestamp(3)
  itemsProcessed Int       @default(0) @map("items_processed")
  errorCode      String?   @map("error_code")
  meta           Json?

  @@index([jobName, startedAt])
  @@map("job_runs")
}



```

## git log -n 5 --oneline

```text
519ef71 chore: update evidence generator for R-12.2-AL
d4cc38b docs: B3 - append R-12.2-AL updates and design notes
36f59ac test: B3 - test coverage for drain, lease safety, and scrubber fixes
59d7013 feat: B3 - drain worker, transport, and job runner defect fixes
fba6a81 refactor: remove runReminderScan (deferred to step E)
```

## git status

```text
On branch feat/phase12-1-outbox
Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/evidence/R-12.2-AL/EVIDENCE_BUNDLE.md
	docs/evidence/R-12.2-AL/self_test_output.txt
	docs/evidence/R-12.2-AL/test_summary.json

nothing added to commit but untracked files present (use "git add" to track)
```

## ARCHITECTURE.md

````markdown
# ARCHITECTURE.md

## 1. System Topology & Component Diagram

The system follows a strictly decoupled 3-tier architecture. The client application never interacts directly with the external NFL data provider. All external data is asynchronously synced to the local database, ensuring the application remains fast and highly available even if the upstream API experiences downtime (stale-while-revalidate).

```mermaid
graph TD
    subgraph External
        API[External NFL API]
    end

    subgraph Backend Engine
        SW[Sync Worker / CRON]
        API_Layer[Backend API / Scoring Engine]
    end

    subgraph Persistence Layer
        DB[(Application Database)]
    end

    subgraph Client
        UI[Web / Mobile UI]
    end

    API -->|Raw Schedules & Scores| SW
    SW -->|Upserts Game State| DB
    UI -->|Reads State / Writes Picks| API_Layer
    API_Layer <-->|Queries & Mutations| DB
```

---

## 2. Relational Data Schema

The database serves as the absolute source of truth. All relations enforce strict uniqueness and auditability. Soft deletes (`status = 'INACTIVE'`) are used exclusively for pools and memberships to preserve historical leaderboard calculations.

### Core Tables

#### `users`
- **id** (UUID, Primary Key)
- **email** (String, Unique)
- **password_hash** (String)
- **role** (Enum: `ADMIN`, `USER`)
- **created_at** (Timestamp)

#### `pools`
- **id** (UUID, Primary Key)
- **name** (String)
- **admin_id** (UUID, Foreign Key -> `users.id`)
- **settings** (JSONB) - Stores point weights, dynamic lock offsets, penalty configs, tiebreaker rules, and anti-peeking/visibility configs.
- **status** (Enum: `ACTIVE`, `INACTIVE`)

#### `pool_memberships`
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **status** (Enum: `ACTIVE`, `INACTIVE`)
- *Primary Key*: `(pool_id, user_id)`

#### `games`
- **id** (UUID, Primary Key)
- **external_game_id** (String, Indexed) - Used for idempotent API reconciliation.
- **home_team_id** (String)
- **away_team_id** (String)
- **kickoff_time** (Timestamp) - Used as the strict `lock_at` threshold.
- **status** (Enum: `SCHEDULED`, `IN_PROGRESS`, `FINAL`)
- **home_score** (Int, Nullable)
- **away_score** (Int, Nullable)
- **commissioner_notes** (String, Nullable) - Admin-curated matchup notes/context.

#### `picks`
- **id** (UUID, Primary Key)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **game_id** (UUID, Foreign Key -> `games.id`)
- **selected_team_id** (String, Nullable) - `NULL` indicates an omitted pick.
- **submitted_by** (UUID, Foreign Key -> `users.id`) - Tracks if the user or an admin entered the pick.
- **created_at** (Timestamp)
- *Constraint*: `UNIQUE(pool_id, user_id, game_id)`

#### `pick_results` (Immutable)
- **pick_id** (UUID, Primary Key, Foreign Key -> `picks.id`)
- **is_correct** (Boolean)
- **points_awarded** (Decimal(5,2)) - Standardized precision decimal for weighted and custom point values.
- **finalized_at** (Timestamp)

#### `audit_logs` (Append-Only)
- **id** (UUID, Primary Key)
- **actor_id** (UUID, Foreign Key -> `users.id`)
- **action** (String) - e.g., `"ADMIN_OVERRIDE_PICK"`
- **target_entity_id** (UUID)
- **old_value** (JSONB)
- **new_value** (JSONB)
- **timestamp** (Timestamp)

### Extended Tables (Penalty Engine & Precision Tiebreakers)

#### `pool_member_stats` (Cumulative Cache)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **total_shots_drank** (Decimal(5,2), Default: `0.00`) - Precision cumulative metric supporting fractional/split penalties.
- **first_place_finishes** (Int, Default: `0`)
- **dead_place_finishes** (Int, Default: `0`)
- **updated_at** (Timestamp)
- *Primary Key*: `(pool_id, user_id)`

#### `penalty_ledger` (Audit & Transactions)
- **id** (UUID, Primary Key)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **week_number** (Int, Nullable)
- **delta** (Decimal(5,2)) - Exact integer or fractional penalty delta (e.g., `0.50` shots for split dead place).
- **reason** (String) - e.g., `'WEEKLY_DEAD_PLACE'`, `'LOSS_INCREMENT'`, `'ADMIN_ADJUSTMENT'`
- **created_by** (UUID, Foreign Key -> `users.id`)
- **created_at** (Timestamp)
- *Index*: `(pool_id, user_id)`

#### `weekly_submissions` (Draft & Tiebreaker Tracker)
- **id** (UUID, Primary Key)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **week_number** (Int)
- **tie_breaker_prediction** (Decimal(5,2), Nullable) - User's predicted total points for the designated tiebreaker game.
- **is_finalized** (Boolean, Default: `false`) - Tracks draft vs. locked pick state for visibility.
- **created_at** (Timestamp)
- **updated_at** (Timestamp)
- *Constraint*: `UNIQUE(pool_id, user_id, week_number)`
- *Index*: `(pool_id, week_number, is_finalized)`

#### `penalty_media` (Shot-Cam Storage)
- **id** (UUID, Primary Key)
- **penalty_id** (UUID, Unique Foreign Key -> `penalty_ledger.id`)
- **pool_id** (UUID, Foreign Key -> `pools.id`)
- **user_id** (UUID, Foreign Key -> `users.id`)
- **storage_path** (String) - Supabase bucket path.
- **media_type** (String) - e.g., `'image/jpeg'`, `'video/mp4'`
- **status** (Enum: `PENDING`, `CONFIRMED`, `REJECTED`)
- **confirmed_by** (UUID, Nullable)
- **created_at** (Timestamp)
- *Index*: `(pool_id, user_id)`

### `pools.settings` JSON Schema Extension

```json
{
  "$schema": "[http://json-schema.org/draft-07/schema#](http://json-schema.org/draft-07/schema#)",
  "type": "object",
  "properties": {
    "lock_offset": {
      "type": "integer",
      "minimum": 0,
      "default": 0,
      "description": "Lock offset threshold in minutes prior to kickoff"
    },
    "lockMode": {
      "enum": ["ROLLING", "GLOBAL_FIRST_GAME"],
      "default": "ROLLING"
    },
    "excludedGameWindows": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "points_per_win": {
      "type": "number",
      "minimum": 0,
      "default": 1.0,
      "description": "Points awarded per winning pick (Decimal(5,2) precision)"
    },
    "picking_mode": {
      "type": "string",
      "enum": ["STRAIGHT_UP", "SPREAD"],
      "default": "STRAIGHT_UP",
      "description": "Mode of pick submission and scoring evaluation"
    },
    "hide_picks_until_kickoff": {
      "type": "boolean",
      "default": true,
      "description": "Enables anti-peeking pick masking before game kickoff"
    },
    "anti_peeking": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "reveal_at": {
          "type": "string",
          "enum": ["LOCK_TIME", "GAME_FINAL"],
          "default": "LOCK_TIME"
        }
      }
    },
    "tiebreaker": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "game_target": {
          "type": "string",
          "enum": ["LAST_GAME", "MONDAY_NIGHT", "CUSTOM"],
          "default": "MONDAY_NIGHT"
        },
        "allow_decimals": { "type": "boolean", "default": true },
        "rule": {
          "type": "string",
          "enum": ["CLOSEST_ABSOLUTE", "CLOSEST_WITHOUT_GOING_OVER"],
          "default": "CLOSEST_ABSOLUTE"
        }
      }
    },
    "penalties": {
      "type": "object",
      "required": ["penalty_name", "shots_per_loss", "dead_place_penalty", "tie_handling"],
      "properties": {
        "penalty_name": { "type": "string", "default": "shot" },
        "shots_per_loss": { "type": "integer", "minimum": 0, "default": 0 },
        "dead_place_penalty": { "type": "integer", "minimum": 1, "default": 1 },
        "tie_handling": {
          "type": "string",
          "enum": ["ALL_TIED", "TIEBREAKER_ONLY", "SPLIT_PENALTY"],
          "default": "ALL_TIED"
        }
      }
    }
  }
}
```

---

## 3. State Machine & Lifecycle Specifications

### 3.1 Game Lock Lifecycle
- **Pre-Game (`SCHEDULED`):** Picks can be created, updated, or deleted. The UI evaluates `games.kickoff_time` minus the pool's `lock_offset` (from `pools.settings`) to determine if the submission window is open.
- **Lock Execution:** The backend API rejects any `POST` / `PUT` requests to the `picks` table where the current server time is greater than or equal to the calculated lock time. 
  - If `lockMode === 'ROLLING'`, granular locking is enforced per-game.
  - If `lockMode === 'GLOBAL_FIRST_GAME'`, submittals across all weekly games are rejected after the week's first kickoff.
- **In-Progress (`IN_PROGRESS`):** External API sync worker updates live scores periodically. UI can display live projections, but official scores are not written.

### 3.2 Scoring Finalization Lifecycle
1. The External API reports a game as complete.
2. The Sync Worker updates the `games` table: `status = 'FINAL'`, setting final `home_score` and `away_score`.
3. The Backend Scoring Engine is triggered.
4. **Scoring Exclusion Pipeline:** The engine checks `pools.settings.excludedGameWindows`. Any game falling within an excluded window (e.g., `THURSDAY_NIGHT`) is skipped and zero points are allocated.
5. The Engine evaluates all picks for that `game_id` (unsubmitted or `NULL` picks resolve gracefully to 0 points).
6. The Engine calculates points based on `pools.settings` and writes records with `Decimal(5,2)` precision to the `pick_results` table.
7. **Immutability:** Once a `pick_result` is written, it is static. Historical scores are read directly from `pick_results`.

### 3.3 Weekly Finalization Pipeline & Tiebreaker Engine
- **Trigger Condition:** Executes when all scheduled games for `week_no` have `status = 'FINAL'`.
- **Locking:** Acquires a transactional lock to prevent concurrent wrap-up executions.
- **Base Scoring & Tiebreaker Calculation:**
  1. Sum `points_awarded` for all members in the week.
  2. Identify the designated target game (`settings.tiebreaker.game_target`) and calculate actual total: `actual_total = (home_score + away_score)`.
  3. For each member, evaluate absolute distance: `distance = abs(actual_total - tie_breaker_prediction)`.
- **Precision Ranking:**
  - **Primary Sort:** Total points (DESC).
  - **Secondary Sort:** Tiebreaker distance (ASC).
- **Resolution & Fractional Penalties:**
  - Identifies **1st Place** (increments `first_place_finishes`).
  - Identifies **Dead Place**. If a Dead Place tie persists (identical points + identical distance), calculates `split_penalty = dead_place_penalty / count(tied_members)` and writes exact `Decimal(5,2)` values to `penalty_ledger`.
- **Stat Recalculation:** Atomically sums `penalty_ledger.delta` to update `pool_member_stats.total_shots_drank` (maintaining 2 decimal places).

### 3.4 Sync Failure Fallback
If the External NFL API goes offline, the Sync Worker logs a failure but the application remains fully operational. The frontend reads from the local `games` table (stale-while-revalidate strategy). Lock times and existing finalized scores remain intact.

---

## 4. API Specification & Data Masking

### Matrix Grid Endpoint (`GET /api/pools/:pool_id/matrix?week_no=X`)
Generates a structured 2D array representation of the week for UI rendering. Payload maps directly to rows (games), columns (users), and cells (the intersection pick). 

#### Dual-Mode Visibility & Anti-Peeking Rules
The Matrix API enforces strict data masking based on `pools.settings`:

- **Mode A (Strict/Hidden):** If `hide_picks_until_kickoff == true`, any pick where `game.kickoff_time > NOW()` belonging to another user (`requesting_user_id != target_user_id` and `role != 'ADMIN'`) is redacted. The pick's `selected_team_id` is mutated to `null` and a flag `is_masked: true` is appended.
- **Mode B (Open Slate):** If `hide_picks_until_kickoff == false`, picks are redacted ONLY if the opponent's `WeeklySubmission.is_finalized == false` (still a draft). Once a user finalizes their sheet (`is_finalized == true`), their picks become instantly exposed via `selected_team_id` to all pool members regardless of kickoff time.

---

## 5. Client-Side Determinism (The Snapshot Rule)

All UI Presets (`Contrarian`, `Mirror Rival`, `Favorites`, `Home/Away`) operate strictly in the browser.
- **Execution:** They compute purely as point-in-time form auto-fills in the browser.
- **No Binding:** Zero late-binding server synchronizations or relational bindings. User A mirroring User B on Tuesday creates static pick records. Subsequent mutations by User B prior to lock do not auto-propagate to User A.
- **Conditional Rules:** `Contrarian` and `Mirror Rival` presets are only enabled on the frontend when `hide_picks_until_kickoff === false`.

---

## 6. Audit & Compliance Implementation Details

- **Server-Side Enforcement:** Client-side validation is strictly advisory. The backend re-verifies all timestamps, roles, and ownership before committing transactions.
- **Admin Mutation Tracking:** If a pick is created or modified by an Admin overriding on behalf of a user, the `submitted_by` column on the `picks` table permanently records the Admin's ID.
- **Append-Only Logging:** Any destructive or overriding action performed by an Admin triggers an asynchronous write to the `audit_logs` table capturing `actor_id`, `action`, `target_entity_id`, `old_value`, and `new_value`.

---

## Phase 12 — League Operations, Resilience & Season Lifecycle

### Resilient Outbox & Inbox Pattern
The system ensures non-blocking outbound network actions by persisting `InboxMessage` and `OutboxEvent` records within the same database transaction as the domain logic. 
- **Inbox:** DB-local source of truth.
- **Outbox:** Claimed by a drain worker using `FOR UPDATE SKIP LOCKED`. Uses exponential backoff and transitions to `DEAD` status after 5 failed delivery attempts. A MailTransport interface (with SMTP adapter) separates transport from logic.

### Worker Leases, Reminders & Job Health
- A stateless reminder scanner runs every ~10 minutes to detect unfinalized picks, keyed by `dedupeKey`, dynamically adjusting to schedule changes (flex moves). Payloads are allow-listed and never contain pick details.
- All sync, scoring, outbox-drain, and reminder-scan jobs log their executions to the `JobRun` table. The Commissioner Ops Health panel surfaces metrics such as `syncStale`, `outbox` status, and recent jobs.

### Audit & Correction Engine
The `AuditLog` table prevents `UPDATE` and `DELETE` via DB triggers. All corrections use compensating logic:
- **Overrides:** Commissioner-entered overrides preempt the sync engine, flagging `divergedFromProvider = true`.
- **Proposals:** Upstream sync changes on FINAL games generate a `ScoreCorrectionProposal`. If `outcomeChanged = false`, it applies automatically; otherwise, it requires commissioner approval.
- **Scoring Runs:** Always run a dry run diff, then apply via a unique `inputHash`. Points are derived state (recomputed).
- **Ledger Expansion:** `penalty_ledger` is expanded to include `entryType` (`ASSESSMENT`, `FULFILLMENT`, `WAIVER`, `REVERSAL`, `OPENING_BALANCE`) and `reversalOfId`. Updates are strictly additive. The outstanding balance is derived dynamically using the effect formula: `ASSESSMENT (+), OPENING_BALANCE (+), FULFILLMENT (-), WAIVER (-), REVERSAL (-effect(target))`. Negative balances are strictly blocked.

### Season State Machine & Seal Design
- **State Machine:** `SETUP` -> `ACTIVE` -> `FINALIZING` -> `CLOSED`.
- **Close-readiness:** Checks for un-finalized games, open proposals, runs, Shot-Cam verifications, and outstanding penalties.
- **Seal:** Moving to `CLOSED` generates a `SeasonSeal`: an immutable JSON snapshot with amounts stored as strings (e.g. `"0.00"`), a SHA256 checksum, and the selected carry-over policy (`CARRY`, `EXPIRE`, `WAIVE`). Reopening the season marks the seal `supersededAt` without deleting it.

### Rollover & Archive Model
- **Rollover:** Creates the next Season in `SETUP`, cloning rules with "review before activate" flags on exclusions/lockouts.
- **Carry-over:** `OPENING_BALANCE` entries propagate only for `CONFIRMED` users when the `CARRY` policy is executed.
- **Archive Read Model:** All history reads query the immutable `SeasonSeal` exclusively. Export features generate JSON/CSV bundles for `CLOSED` seasons only, guaranteeing that draft picks are never leaked.

---

## Phase 12 Design Decisions
1. **Points are derived; penalties are ledger:** Game scores recompute in-place; penalty counts require strictly additive transactions.
2. **Provider corrections are proposals:** Auto-apply only occurs when no outcome changes.
3. **Overrides beat sync:** Divergence from the data provider is explicitly flagged.
4. **Locks derive from stored kickoff only:** Sync outages never unlock a game.
5. **Inbox is the source of truth:** Email delivery is strictly best-effort outbox logic.
6. **Aggregates are never stored numerically:** Sealed season JSONs use fixed-string representations for balances.
7. **Pick-on-behalf is write-only:** Admins cannot scrape user drafts prior to locking via exception logs.
8. **History reads seals only:** Historical dashboards and exports never query the live relational tables.
9. **Ledger `entryType` is additive and parallel to `reason` (Ruling R-12.2-A):** 
   - `entryType` is added as a NEW column alongside existing `reason`. `reason` is NOT replaced, renamed, or dropped.
   - `reason` = cause/rule code (why). `entryType` = balance effect (what). Balance logic MUST NOT read `reason`.
   - Backfill is achieved via the column DEFAULT only. The migration MUST NOT contain any `UPDATE` and MUST NOT disable, drop, or alter the immutability trigger (INV-2).
   - Non-ASSESSMENT write paths remain disabled behind a feature flag until the read-path audit passes.
   - Reversal-of-reversal is forbidden. A REVERSAL may only target a non-REVERSAL entry with the same league, season, and user, and equal amount.
10. **Physical schema names govern (Ruling R-12.2-B):** Logical names in handoffs are documentation only. The system strictly maps to the existing physical table `penalty_ledger` and the amount column `delta`.
11. **Ledger `delta` semantics:** `delta` is a strictly positive Decimal(5,2) magnitude. The sign (+/-) is derived entirely from `entry_type`. Balance settlement logic must never read the `reason` column.
12. **Ruling R-12.2-C / BR-1 Remediation:**
   - **INV-2 Enforcement:** A database-level PL/pgSQL function and trigger (`enforce_append_only`) physically prevents `UPDATE`, `DELETE`, and `TRUNCATE` operations on `penalty_ledger`. This is deployed out-of-band (BR-1).
   - **Schema Identifiers:** `reversal_of_id` must use the `uuid` data type (matching `penalty_ledger.id`).
   - **Naming Convention:** `snake_case` strictly applied for all new database columns, constraints, and index names. Prisma fields use `camelCase` mapped via `@map`. Enums use `UPPER_CASE`.
   - **Advisory Locks:** Any typed ledger writes that reduce or reverse balances (e.g., `FULFILLMENT`, `WAIVER`, `REVERSAL`) MUST acquire a transaction-scoped advisory lock serialized by `pool_id` and `user_id`.
13. **Ledger-bearing deletion:** Pools and memberships carrying a ledger are never hard-deleted (archive/soft-delete only).
14. **Season ≡ Pool:** No duplicate `Season` table is created. All Phase 12 references to `seasonId` / `leagueId` map to `pool_id`.
15. **Deny-by-Default Data API:** Every Phase 12 table ships deny-by-default to Data API roles.
16. **Money Input Parsing:** Ledger money input is parsed by one strict shared parser; `parseInt`, `parseFloat`, and `Number` are never used.
17. **Evidence Reporting Standard:** Every evidence report must state the host class, database, current_user, and server version.
18. **Disposable Rehearsal DB:** All destructive work occurs on a disposable rehearsal database first. Hosted environments receive `migrate deploy` only.
19. **Signed Legacy Assessment:** Legacy ASSESSMENT rows may carry a signed delta, but typed rows moving forward are always positive.
20. **Pool-Scoped Authority:** Authority is derived from `pools.admin_id` and a pool-scoped co-commissioner membership flag; global Roles are never used to authorize pool-specific operations.
21. **Authorization Defect Fixes:** BR-5 authorization fixes are code-only and strictly precede any new commissioner endpoints.
22. **Decimal-Only Money Math:** Money splitting is Decimal-only; the ledger never receives `delta = 0`. Characterization tests are required before changes.
23. **Invariant Evidence Status:** Every invariant carries an evidence status; Phase 12 acceptance may not assume more than the register states.
24. **Idempotent Period-Close:** Idempotent period-close is enforced via a DB-enforced claim in the same transaction.
25. **Acceptance Tests Assert Behavior:** Acceptance tests assert behavior (SQLSTATE, row state), never message text.
26. **Guarded Read Routes:** Read routes are guarded exactly like write routes (uuid -> pool exists -> commissioner or ACTIVE member); guards change access, never payloads.
27. **Period-Close Preconditions:** Period-close preconditions are evaluated from authoritative state; empty sets fail closed; no bypass flag.

### BR-4b Idempotency Design
- A new table `weekly_wrapups` serves as a claim table to enforce idempotency during period-close.
- A unique index on `penalty_ledger` was **REJECTED** because it would break the REVERSAL + new ASSESSMENT correction flow.
- Consequences:
  1. Concurrent wrap-ups block on the primary key, avoiding duplicate writes.
  2. The claim occurs as the first statement in the transaction.
  3. `skipDuplicates: true` returns a count of 0 on duplicates, translating to a `409 ALREADY_WRAPPED_UP` without throwing an unhandled Prisma constraint error.
- **SQL Implementation:**
```sql
CREATE TABLE weekly_wrapups (
  pool_id      uuid          NOT NULL,
  week_number  integer       NOT NULL,
  created_at   timestamp(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT weekly_wrapups_pkey PRIMARY KEY (pool_id, week_number),
  CONSTRAINT weekly_wrapups_pool_id_fkey FOREIGN KEY (pool_id)
    REFERENCES pools(id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

INSERT INTO weekly_wrapups (pool_id, week_number)
SELECT DISTINCT pool_id, week_number
FROM penalty_ledger
WHERE reason = 'WEEKLY_DEAD_PLACE' AND week_number IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE FUNCTION weekly_wrapups_prevent_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only violation: % on weekly_wrapups is not permitted (INV-2)', TG_OP;
END; $$;

CREATE TRIGGER weekly_wrapups_no_update_delete
  BEFORE UPDATE OR DELETE ON weekly_wrapups
  FOR EACH ROW EXECUTE FUNCTION weekly_wrapups_prevent_mutation();
CREATE TRIGGER weekly_wrapups_no_truncate
  BEFORE TRUNCATE ON weekly_wrapups
  FOR EACH STATEMENT EXECUTE FUNCTION weekly_wrapups_prevent_mutation();

REVOKE ALL ON FUNCTION weekly_wrapups_prevent_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE weekly_wrapups FROM anon, authenticated;
ALTER TABLE weekly_wrapups ENABLE ROW LEVEL SECURITY;
```

### Ruling R-12.2-E Errata & Updates
- **Environment Naming:** "postgres" is a DB name, not an environment; `postgres.<project-ref>` indicates a hosted pooler connection.
- **BR-1 Test 6 Finding:** Test 6 caught a `23503` (FK violation), not the append-only `P0001` error.
- **INV-1 Validation:** DB-level `numeric(5,2)` exactly verified against the Supabase hosted pooler environment.
- **INV-8 Validation:** Unverified locally; policies in `storage.objects` are missing.
- **BR-3 Classification:** The server.ts manual adjustment flaw is officially classified as an INV-1 defect (silent truncation, garbage-prefix acceptance). Acceptance of zero/negative violates R-12.2-B but is not strictly an INV-1 violation.
- **Phase 12 Conventions:**
  - IDs are `uuid` (`id String @id @default(uuid()) @db.Uuid`).
  - Foreign keys use `RESTRICT/RESTRICT` to pools, users, and memberships.
  - Timestamps use `timestamp(3)` in UTC.
  - API routes use `/api/pools/:pool_id/...`.
- **Physical Reconciliation Map Dispositions:**
  - *Approved:* `leagueId/seasonId` -> `pool_id`, `userId` -> `user_id`, `weekId` -> `week_number`.
  - *Approved for 12.1:* `inbox_messages`, `outbox_events`, `notification_preferences`, `job_runs`.
  - *Provisional:* `season_state` enum, `MemberSeasonStatus`, `rolled_over_from_pool_id`, `game_result_overrides`, `scoring_runs`, `season_seals`.
  - *Rejected/Held:* `COMMISSIONER` role duplicate rejected; `audit_logs` reuse held; `CO_COMMISSIONER` held; `games` scoping held.

### Ruling R-12.2-F Errata & Updates
- **Hosted Environment Rule:** The target database is a hosted Supabase project, NOT a local database. The previous "Local PostgreSQL" documentation was incorrect.
- **BR-1 Test 6 Finding:** The query `DELETE FROM pools` correctly triggered a `23503` cascade failure constraint.
- **INV-1 Validation Verification:** Verified against the hosted Supabase environment.
- **INV-8 Status:** Unverified in the hosted environment.
- **Role Extension:** The `Role` extension for `CO_COMMISSIONER` is officially REJECTED.
- **BR-3 Classification Amendment:** The defect is classified as an INV-1 flaw (truncation, garbage acceptance). Negative adjustments are acknowledged as a legitimate feature ("Pardon") and are not violations.
- **Migration B/C Alteration:** 
  - Migration B is `penalty_ledger_typed_delta_positive` to allow legacy rows to remain signed.
  - Migration C uses `abs(target.delta)` and enforces a `week_number` match.
- **S-1 Exposure Finding:** Data API exposure detected on all 12 public tables (including `picks` and `weekly_submissions`), pending BR-2c execution.
- **S-2 Authorization Finding:** S-2 authorization gap currently under investigation.

### Ruling R-12.2-G Errata & Updates
- **Environment Naming & Classification:** The hosted environment is provisionally classified as SHARED-DEV until the owner confirms no real participant data exists. The earlier statement "Local PostgreSQL" was incorrect.
- **BR-1 Deviations:** BR-1 was applied to hosted via `prisma migrate dev` instead of `deploy`. Installed function names (`penalty_ledger_prevent_update_delete`, `penalty_ledger_prevent_truncate`) deviate from the committed `enforce_append_only` spec.
- **Credential Exposure:** `users.password_hash` is credential material that remains exposed to the Data API until BR-2c executes.
- **INV-8 Re-baseline:** INV-8's storage half is not implemented at runtime.
- **Sequence:** BR-0 -> BR-1 acceptance -> BR-2b -> BR-2c -> hosted 12.1 migrations. BR-3a, BR-4, and BR-5 run in parallel with BR-0. 12.1 development unblocked on rehearsal DB after BR-0 and BR-5 helper are merged.
- **S-2 & Wrap-up Findings:** S-2 is confirmed (cross-pool admin gap). Wrap-up uses float arithmetic (`Number((...).toFixed(2))`) and lacks idempotency guards (duplicate wrap-ups create duplicate rows).

### Ruling R-12.2-H Errata & Updates
- **BR-1 Acceptance Rules:** Criterion (c) is withdrawn. The installed function names and message wording are accepted.
- **S-4 Finding (Member-Facing Routes):** Member-facing read routes were exposed cross-pool without proper active membership checks. This is resolved by extending `requirePoolMember` to all read endpoints.

### Ruling R-12.2-I Errata & Updates
- **FINAL-games Precondition:** Guard uses the shared exclusion resolver, the fallback does not feed the guard, empty sets fail closed.
- **Stuck-game Limitation:** A postponed or cancelled game blocks that week's wrap-up until 12.2 overrides.

### Ledger Effect Formula & Reversal Constraints
`Outstanding = Σ effect(e)` where:
- `ASSESSMENT` = `+delta` (delta may be signed for legacy rows)
- `OPENING_BALANCE` = `+delta`
- `FULFILLMENT` = `-delta`
- `WAIVER` = `-delta`
- `REVERSAL` = `-effect(target)`
- **Constraints:** Double reversal is rejected (unique `reversal_of_id`); reversal-of-reversal is rejected; target must match user/season/amount. Over-fulfillment or over-waiver that drops `Outstanding` below 0 is rejected with an explicit error.

### Read-Path Audit Gate & LEDGER_TYPED_WRITES Flag
Before enabling `LEDGER_TYPED_WRITES`, a read-path parity test must pass. Every query/service/UI selector aggregating ledger amounts must route through a shared `ledgerEffect` helper (in TS and equivalent SQL view). The parity test must prove `old totals == helper totals` exactly to the cent for all pre-existing rows.

---

## Phase 12 Pre-Flight Audit & BR-1 Execution Record
- **BR-1 Status:** Immutability trigger successfully deployed to the hosted environment. *Acceptance is PENDING local fixture testing on a rehearsal database and alignment with the committed function names.*
- **G1 Precision Check:** Verified that `delta` is physically typed as `numeric(5,2)` in the hosted PostgreSQL catalog.
- **BR-2 API Baseline (G3-G4):** Pre-Flight G4 confirmed that all public tables currently lack RLS and have full CRUD grants for `anon` and `authenticated` roles, setting the baseline for the pending BR-2 lockdown.

## Invariant Status Register

- **INV-1 Precision:** Every per-entry penalty amount is stored as Decimal(5,2). No floating point anywhere. Use Prisma.Decimal/decimal.js for arithmetic. API DTOs carry amounts as fixed 2-decimal strings (e.g. "2.50"). Exact split-penalty math is unchanged. *(Evidence: DB numeric(5,2) verified hosted dev. App violated in wrap-up float & adjust parseInt; remediation BR-4/BR-3a).*
- **INV-2 Immutable Ledger:** The penalty ledger is append-only. UPDATE and DELETE are prohibited (DB trigger + tests). Corrections are compensating entries only. *(Evidence: INSTALLED, acceptance conditional on definitions).*
- **INV-3 Snapshot Rule:** Client-side presets (All Home, All Away, Favorites, Contrarian, Mirror Rival) operate strictly in client memory with ZERO uncommitted server writes. Phase 12 adds no server persistence of preset or draft-pick state. *(Evidence: Unverified in Phase 12 pre-work).*
- **INV-4 Matrix Anti-Peeking:** Square Sheet Matrix dual-mode visibility is preserved: strict lockout mode, and open-slate mode guarded by pick finalization. NO Phase 12 endpoint, notification payload, audit record, dry-run diff, recap text, or export may reveal any pick that is not yet visible under the active mode's rules. *(Evidence: VIOLATED at API layer (S-4, confirmed) until BR-5 merges; DB exposure open (S-1) until BR-2c).*
- **INV-5 Fallback & Lockout Logic:** Granular rolling vs. global game lockouts, excluded game windows (e.g. skipped Thursday night points), and the decoupled 3-tier sync/scoring fallback are unchanged. Lock state is derived server-side from the stored kickoff timestamp only. Sync outages, overrides, and corrections can never unlock or extend a lock. *(Evidence: Not audited; regression suite is evidence).*
- **INV-6 Non-Blocking Outbound:** Outbound network actions are non-blocking. Database transactions never roll back due to external transport failure. *(Evidence: N/A until 12.1).*
- **INV-7 Anti-Bloat:** No live weather, no sports-betting odds, no Twilio/SMS, no payment processors, no brittle third-party APIs. *(Evidence: Partial. No Data API consumers in client/src; whole-repo audit pending).*
- **INV-8 Shot-Cam:** Supabase Storage RLS for the Shot-Cam verification portal is unchanged. *(Evidence: NOT IMPLEMENTED at runtime; metadata endpoints only).*
- **R-12.2-I guard:** IMPLEMENTED, UNVERIFIED pending rehearsal tests.
- **R-12.2-Y:** applied_by root cause identified as test-made table in wrapUpConcurrency. False DDL-grep finding noted. App runs locally.
- **R-12.2-Z:** stale-submission finding noted. R-12.2-Y re-issued.
- **R-12.2-AA:** S-6 triggered (admin picks routes cross-pool). Decision #49 implemented. /api/admin/users accepted as platform-level. Migration count corrected to 8.
- **R-12.2-AB:** BR-5b not accepted (uncommitted). Decisions #50-#51 applied. Docs-base verdict withdrawn. Default-creation deviation recorded.
- **R-12.2-AC:** Decision #52 applied (claim code fails closed). S-7 global admin override removed from Shot-Cam routes. 00e89dd deviation recorded.
- **R-12.2-AD:** Decisions #53-#54 applied. S-7 reclassified. S-8 write-on-GET removed. Commit-hygiene deviation recorded. Decisions #28-#54 registered.
- **R-12.2-AE:** Decision #55 applied. S-7 reversal confirmed. S-8 explicit pool_id guarded. Claim step fail-closed fixed. Wrap-up game-set deviation recorded.
- **R-12.2-AE-V2:** Ruling BLOCKED. BR-4b migration-branch test failure documented. Decisions #53, #54, and #55 reconciled.
- **R-12.2-AE-V3:** Ruling BLOCKED solely on Git finalization. BR-4b 7/7 and S-8 passed. Git tree cleaned and raw prisma generate output captured.
- **R-12.2-AE-V4:** Ruling BLOCKED solely on Git finalization. BR-4b 7/7, S-8, Decision #52, and Decision #54/#55 verification passed. Git tree cleaned prior to evidence generation.
- **R-12.2-AE-V4 was recorded BLOCKED in the register and later APPROVED by the Fallback; the Arbiter ratifies gates individually.**

---

## Phase 12 Decision Register (Appendix A)

1. **Decision #1:** Numeric precision Decimal(5,2) standardized for all penalty ledger entries and calculations (INV-1).
2. **Decision #2:** Immutable penalty ledger enforced via database-level append-only triggers (`penalty_ledger_prevent_update_delete`, `penalty_ledger_prevent_truncate`) (INV-2).
3. **Decision #3:** Elimination of floating-point arithmetic in scoring and wrap-up services; use `Prisma.Decimal` and `decimal.js`.
4. **Decision #4:** Client presets (All Home, All Away, Favorites, Contrarian, Mirror Rival) operate purely in memory with zero server persistence (INV-3).
5. **Decision #5:** Square Sheet Matrix dual-mode anti-peeking visibility enforcement (INV-4).
6. **Decision #6:** Granular rolling vs global game lockout derived exclusively from stored kickoff timestamps (INV-5).
7. **Decision #7:** Support for excluded game windows (e.g. skipped Thursday night games) in scoring and wrap-up.
8. **Decision #8:** Decoupled 3-tier sync/scoring fallback architecture preserving local DB as source of truth.
9. **Decision #9:** Non-blocking outbound network actions with database transactions insulated against external transport failures (INV-6).
10. **Decision #10:** Anti-bloat principle (INV-7): prohibition of live odds, weather APIs, Twilio/SMS, payment processors, and third-party bloat.
11. **Decision #11:** Shot-Cam storage verification portal metadata endpoints and owner verification model (INV-8).
12. **Decision #12:** Role enum strictly limited to `ADMIN` and `USER`; rejection of `COMMISSIONER` or `CO_COMMISSIONER` role additions.
13. **Decision #13:** Explicit pool scoping via `/api/pools/:pool_id/...` across all pool-specific endpoints.
14. **Decision #14:** Foreign key constraints enforce `RESTRICT` on pools, users, and memberships.
15. **Decision #15:** Primary keys standardized to UUID (`id String @id @default(uuid()) @db.Uuid`) across relational models.
16. **Decision #16:** Timestamps standardized to `timestamp(3)` in UTC across all models.
17. **Decision #17:** Physical reconciliation mapping: `leagueId`/`seasonId` -> `pool_id`, `userId` -> `user_id`, `weekId` -> `week_number`.
18. **Decision #18:** Migration naming and sequencing standardization for Phase 12.
19. **Decision #19:** Ledger effect formula: `Outstanding = Σ effect(e)` where assessments/opening balances are `+delta`, fulfillments/waivers are `-delta`, reversals are `-effect(target)`.
20. **Decision #20:** Removal of global ADMIN bypass on pool-scoped routes (`requirePoolMember` and `requirePoolCommissioner`).
21. **Decision #21:** Reversal constraints: target must match user/season/amount; unique `reversal_of_id`; rejection of double reversals.
22. **Decision #22:** Read-path audit parity test required before enabling `LEDGER_TYPED_WRITES`.
23. **Decision #23:** BR-1 immutability triggers installed on `penalty_ledger` (`BEFORE DELETE OR UPDATE` and `BEFORE TRUNCATE`).
24. **Decision #24:** Rejection of table mutation on `weekly_wrapups` via `weekly_wrapups_prevent_mutation()` trigger.
25. **Decision #25:** Hosted Supabase database environment classified as SHARED-DEV with write freeze.
26. **Decision #26:** BR-2b/BR-2c Row-Level Security and Data API lockdown across public tables.
27. **Decision #27:** Direct anon/authenticated access revoked from `users.password_hash` and sensitive tables.
28. **Decision #28:** Local rehearsal database environment isolation (`pickem_rehearsal` on `localhost:5432`).
29. **Decision #29:** `assertDisposableDatabase()` safeguard preventing test execution against hosted database.
30. **Decision #30:** Separation of `.env` (rehearsal) and `.env.hosted` (hosted pooler).
31. **Decision #31:** Guarded drop of rehearsal schema on hosted database.
32. **Decision #32:** Permanent `.env` flip to local rehearsal and Vitest global setup assertions.
33. **Decision #33:** CI documentation append-only guard enforcing strictly 0 deletions against baseline `e41ce72`.
34. **Decision #34:** `db:reset` script standardizing rehearsal recreation with `app.disposable=true` sentinel.
35. **Decision #35:** Rehearsal database provisioning with `anon`, `authenticated`, and `service_role` roles.
36. **Decision #36:** Migration catalog checksum verification across all 8 migration files.
37. **Decision #37:** Negative control verification using isolated worktrees (`.worktree-ctl`).
38. **Decision #38:** Prohibition of test-created tables in production/rehearsal migrations.
39. **Decision #39:** Git diff allowlist check enforcing bounded PR modifications.
40. **Decision #40:** DDL grep negative control verifying zero DDL or SET statements in application codebase.
41. **Decision #41:** BR-2 pre-check, post-check, and rollback script provisioning for hosted migration.
42. **Decision #42:** Verification of SQLSTATE 42501 permission denial for anon and authenticated roles.
43. **Decision #43:** Elimination of float arithmetic in weekly wrap-up calculations.
44. **Decision #44:** Tiebreaker distance calculation using absolute score difference.
45. **Decision #45:** Split-penalty rounding and remainder distribution logic preservation.
46. **Decision #46:** Weekly wrap-up game-set resolution via shared scoring exclusion resolver.
47. **Decision #47:** Strict fail-closed wrap-up precondition if non-excluded games are pending or absent.
48. **Decision #48:** CI check for migration file checksums against `_prisma_migrations`.
49. **Decision #49:** CI route scan enforcing parameter scoping and guard middleware on all routes.
50. **Decision #50:** `GET /api/admin/users` allowlisted as platform-level admin endpoint.
51. **Decision #51:** Admin picks routes scoped with `requirePoolCommissioner` (`from: 'query'` / `from: 'body'`).
52. **Decision #52:** Weekly wrap-up claim step fails closed (`CLAIM_STORE_UNAVAILABLE`) if `weekly_wrapups` table is absent.
53. **Decision #53:** Agents never push, force-push or change remotes.
54. **Decision #54:** GET handlers perform no writes.
55. **Decision #55:** A guard is never bypassed by a conditional when its dependency is missing.
56. **Decision #56:** Rulings are stored verbatim under docs/rulings/. The Decision Register in ARCHITECTURE.md is a byte-for-byte copy of docs/rulings/appendix-a.md, and CI diffs the two.

---

## Phase 12 Decision Register (supersedes the register at ARCHITECTURE.md lines 498-548)

1 Points are derived; penalties are ledger entries.
2 Provider corrections are proposals; auto-apply only when no outcome changes.
3 Manual overrides beat sync; divergence is flagged.
4 Locks derive from the stored kickoff time only.
5 Inbox is the source of truth; email is best-effort.
6 Aggregates are never stored in numeric columns.
7 Pick-on-behalf is write-only.
8 History reads sealed snapshots only.
9 Ledger entry_type is additive and parallel to reason; backfill by column default, never UPDATE.
10 Physical schema names govern; logical names in handoffs are documentation.
11 DB-enforced invariants are verified against the catalog, never assumed.
12 Typed ledger writes serialize per (pool_id, user_id).
13 Ledger-bearing pools and memberships are never hard-deleted.
14 Season is Pool; routes use /api/pools/:pool_id.
15 New tables and functions are deny-by-default to Data API roles.
16 Money input goes through one strict parser; never parseInt/parseFloat/Number.
17 Every evidence report states host class, database, user and server version.
18 Destructive work runs only on a disposable database; hosted gets migrate deploy only.
19 Legacy ASSESSMENT rows may be signed; typed rows are positive.
20 Per-pool authority derives from pools.admin_id; no global-role override.
21 Authorization defect fixes are code-only and precede new commissioner endpoints.
22 Money splitting is Decimal-only with characterization first; no zero-delta rows.
23 Every invariant carries an evidence status.
24 Period-close jobs are idempotent via a DB-enforced claim in the same transaction.
25 Acceptance tests assert behavior (SQLSTATE, row state), never message text.
26 Read routes are guarded like write routes; guards change access, never payloads.
27 Period-close preconditions use authoritative state; empty sets fail closed; no bypass flag.
28 VERIFIED requires numbers or raw output in the report body.
29 Isolation is by database, never by schema; the guard has three independent checks.
30 Raw evidence is unedited tool output; identifiers resolve; figures are consistent.
31 Irreversible operations run only from committed scripts with machine-checked preconditions.
32 The default environment is disposable; hosted credentials live in a separate file.
33 Docs are append-only, enforced by CI against a tagged baseline.
34 Every acceptance criterion maps to a named test or evidence item.
35 Tests never create or alter schema; databases reset via a guarded script.
36 A migration stays off the deployable branch until its hosted gate clears.
37 Evidence is produced by one committed script; empty sections fail; UTF-8 via spawn.
38 Trigger proofs run as a privileged role; privilege proofs as anon/authenticated.
39 Evidence and CI scripts measure inputs independently and ship with a negative control.
40 Every evidence run stamps commit, branch and time; identical output counts as not run.
41 A matrix row may cite only tests present in the committed JSON artifact.
42 Schema evidence comes from real pg_dump including ACLs, bodies and indexes.
43 Every ordered criterion appears in the matrix as PASS, FAIL or NOT VERIFIED.
44 Only a human runs or approves hosted changes; authorizations are typed in the conversation.
45 Rollbacks are generated from a pre-state snapshot and proven by hash equality.
46 External exposure is measured identically before and after a change.
47 Machine-checkable gates are decided by script exit codes.
48 Applied migrations are immutable; CI compares checksums.
49 Authorization scans cover every source of an identifier (path, query, body, headers).
50 Each test run begins with reset, migrate deploy and generate, and prints a header.
51 Tests are never deleted or weakened in non-test commits; controls run in a separate worktree.
52 Code depending on a schema object ships with its migration or fails closed.
53 Agents never push, force-push or change remotes.
54 GET handlers perform no writes.
55 A guard is never bypassed by a conditional when its dependency is missing.
56 Rulings are stored verbatim under docs/rulings/. The Decision Register in ARCHITECTURE.md is a byte-for-byte copy of docs/rulings/appendix-a.md, and CI diffs the two.
57 Every table written by a re-running job carries a database-enforced dedupe key.
58 Outbound payload sanitization is default-deny against an explicit per-type registry.
59 Outbox drain workers claim via FOR UPDATE SKIP LOCKED with explicit lease timeouts and discrete backoff.
60 Every claim of a leased job item counts as an attempt; the lease is verified before each send and when the result is recorded.

V4: APPROVED by Fallback; RATIFIED IN PART by the Arbiter.

R-12.2-AG: Register ratified. Hosted tripwire re-run. Authoritative register is located at 'Phase 12 Decision Register (supersedes...)'.

R-12.2-AH: Milestone 12.1 CONDITIONAL START; hosted tripwire & evidence repair cycle.

R-12.2-AH-V2: Hosted tripwire query streaming corrected. S-7/S-8 explicit console assertions logged. Pre-run porcelain check enforced.

R-12.2-AH-V2: Evidence gate cleared. Hosted tripwire now provides raw hosted identity, all 11 required table counts, migration state, trigger state, and rls_on 12/12; localhost inverse controls fail closed. S-7/S-8 required invariant and byte-equality assertions are explicitly logged. Pre-generation workspace hygiene is directly evidenced as clean. Milestone 12.1 remains CONDITIONAL START on feat/phase12-1-outbox; hosted DDL and merges to main remain blocked pending separate implementation gates.

R-12.2-AI: Step 1 (Core Schema & Migration) implemented on rehearsal DB. Revoke/RLS applied.

R-12.2-AJ: I-1/I-2 CLOSED; 12.1 step A accepted with amendment. Authoritative register pointer updated.

R-12.2-AK: 12.1 Step B GO. Decisions #58/#59 applied.

R-12.2-AL: B3 fixes applied. Scanner deferred to step E. Decision #60 applied.











````


