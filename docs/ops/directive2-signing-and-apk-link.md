# Directive 2 signing and fixed APK link — review draft

This is local preparation only. Do not push, deploy, or distribute an APK until Jack reviews the signing choice and the workflow. The existing browser preview remains at `https://jdubciii.github.io/NFL-Pick-Em/`.

## One Pages deployment

`.github/workflows/preview.yml` runs on each push to `feat/p37-shell-auth-openslate`. It builds the Android WebView bundle with base path `/`, synchronizes Capacitor, assembles and verifies a signed release APK, then builds the browser preview with base path `/NFL-Pick-Em/`. It copies the APK to `client/dist/app-release.apk` and deploys that directory as one Pages artifact. The planned fixed phone URL is:

`https://jdubciii.github.io/NFL-Pick-Em/app-release.apk`

That URL is public: anyone can download the APK. It is not live until a reviewed push succeeds. Keeping the APK and web client in the same Pages artifact prevents separate workflows from replacing each other's files. The workflow fails before publication when signing secrets are missing or APK signature verification fails. GitHub Actions also retains a run-scoped APK artifact for 30 days; that artifact is not the stable phone URL.

## Signing inputs Jack must add after review

Use repository **Settings → Secrets and variables → Actions → New repository secret**. Add these four secrets without sending their values in Slack or committing them:

| Secret | Contents |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Base64 of the chosen release keystore file, encoded as one line |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Signing key alias |
| `ANDROID_KEY_PASSWORD` | Key password |

The keystore is decoded to the runner's temporary directory with restrictive permissions. Gradle reads the path and passwords from environment variables. The tracked keystore and plain-text passwords have been removed from the **current tree**, and `*.keystore` is ignored. Those old values still exist in public Git history; removing the current files does not make the old key private. A new key should be generated and stored securely before public APK distribution. No key was generated, rotated, or uploaded during this local-only change.

## Existing installs and key rotation

Android accepts an in-place update when the application ID matches, the new version code is not lower, and the signing certificate matches or there is a valid proof-of-rotation. This workflow assigns a monotonically increasing CI version code starting above the prior hard-coded `78`. If Jack reuses the old key, existing installs can update in place, but that key is already public and can no longer be trusted to prove who published an APK.

If Jack switches directly to a new key without a tested signing lineage, installed copies will **not** update cleanly. Members must uninstall the old app and install the new APK; uninstalling can erase local app data. APK signing lineage can support rotation on Android 9 and later, but the app's minimum version is Android 7, so it is not a complete compatibility plan for every supported device. This draft does not implement signing lineage. Jack must choose between a controlled reinstall and a separately tested rotation migration before publication.

## Checks after approval

1. Jack chooses the signing key/installed-app migration plan and adds the four GitHub Actions secrets. Confirm the public APK URL is acceptable.
2. Separately approve the exact local commit for push. The first Actions run must build the signed APK, pass `apksigner verify`, and deploy both the preview and APK to Pages. Check the fixed APK URL from a phone.
3. In the existing Render service, set **Settings → Auto-Deploy → On Commit** for `feat/p37-shell-auth-openslate`. Confirm an automatic deploy for that pushed commit and `/api/health` reporting the commit. This setting is still off in the local-only phase.

No test push, Render setting change, APK distribution, or Directive 3 work is included in this draft.
