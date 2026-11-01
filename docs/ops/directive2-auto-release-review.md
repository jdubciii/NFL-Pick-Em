# Directive 2: Auto Release review

This document records the local preparation for Jack's review. The feature branch has not been pushed for Directive 2. No APK has been published and Render's deployment setting has not been changed.

## Android APK workflow

`.github/workflows/android-release.yml` runs on each push to `feat/p37-shell-auth-openslate`. It uses a standard `ubuntu-latest` runner, Node 22 for Capacitor 8, Java 17 for Android Gradle Plugin 8.13, Android SDK 36, and the checked-in Gradle wrapper. It installs the client lockfile, runs `npm run build` in `client/`, runs `npx cap sync android`, then runs `./gradlew --no-daemon assembleRelease`. It verifies the APK signature and uploads `app-release.apk` as the `nfl-pick-em-release-apk` Actions artifact for that run. The existing GitHub Pages preview workflow and URL are unchanged.

The workflow is **not yet proven on GitHub Actions**: the required local web build and Capacitor sync passed, but this VM has no Java or Android SDK, and Jack barred a test push until review. A GitHub Actions artifact belongs to a particular run and expires; its run URL is not a permanent direct APK download URL. No existing public APK release link was found in this repository or its GitHub Releases list. The documented older APK endpoint is a private LAN address. Therefore the request to keep an existing stable APK link cannot be fulfilled as written. Jack must approve a stable public destination before publication, such as a fixed APK path on the existing Pages origin or a GitHub Releases asset. Publishing either would make the APK publicly downloadable because the repository/site is public.

The current Android project also tracks `client/android/nflpickem-release.keystore` and stores release-signing passwords in `client/android/app/build.gradle`. That signing identity is exposed by the public repository. The local workflow does not add new credentials, but any APK it builds uses that existing exposed key. Review key rotation and update compatibility before distributing an APK. This preparation does not remove or rotate the key.

## Render backend auto-deploy

The existing `nfl-pick-em-api` service (`srv-db9a12on74is73ev84m0`) is on Render's free plan and points to `feat/p37-shell-auth-openslate`, but its current `autoDeploy` and `autoDeployTrigger` are off. The connected Render tool here can read the service but cannot update the auto-deploy setting. After Jack reviews, open [the service dashboard](https://dashboard.render.com/web/srv-db9a12on74is73ev84m0), go to **Settings → Auto-Deploy**, and select **On Commit**. First confirm that the service is linked through the GitHub provider integration: Render does not auto-deploy services created from a public Git URL. Use the existing service; do not create another one. The [Render deploy documentation](https://render.com/docs/deploys) describes these options. The free instance still consumes its workspace's included build pipeline minutes; confirm available usage in Render before relying on `$0` for an unlimited number of pushes.

## Verification after approval

1. Review and approve the signing and stable-link plan. Configure the one-time Render setting and any needed APK destination settings.
2. Approve a push of the exact reviewed feature-branch commit. Confirm that both the Android workflow and existing Pages workflow run for that commit. Check `app-release.apk` exists and `apksigner verify` passes. Check the agreed stable URL from a phone.
3. Confirm Render creates an automatic deploy for that same commit and that `/api/health` reports it as live with `status: ok`. Use `./scripts/ops/check-live-status.sh` to compare the GitHub tip, Render, and Pages preview. Do not call an accepted/queued deploy live until health reports the new commit.

Directive 3 is outside this work.
