# Stage 2 Release Readiness

Stage 2 prepares aka-browser for repeatable public releases after the Stage 0 beta
and Stage 1 i18n work. The goal is not to add large product features. The goal is
to make every release build verifiable, reproducible, and safe to publish.

## Scope

- Keep the repository buildable with a single release-readiness command.
- Document the manual gates that cannot be verified without private credentials
  or paid streaming accounts.
- Require the same quality gate in GitHub Actions before release work is merged.
- Keep DRM-specific release checks explicit because aka-browser depends on
  Castlabs Electron and Widevine behavior.

## Local Release Gate

Run this from the repository root before creating a release candidate:

```bash
pnpm release:check
```

The command verifies:

- TypeScript checks for every workspace task.
- The repository lint task.
- Production build output.
- `pnpm audit --prod=false`.
- The `apps/browser/src` 450-line source file policy.
- `git diff --check`.

If this command fails, do not package or publish a release.

## Manual Release Gates

These gates require credentials, hardware, or third-party accounts and must be
recorded in the release notes or release checklist.

| Gate | Required Evidence |
| --- | --- |
| EVS account | `pnpm --filter @aka-browser/browser evs:verify` succeeds. |
| Apple signing certificate | `security find-identity -v -p codesigning` shows a valid Developer ID Application identity. |
| Notarized macOS app | `spctl -a -vv -t install release/mac-*/aka-browser.app` reports `accepted`. |
| Widevine CDM available | The packaged app logs a Widevine CDM version at startup. |
| DRM playback | Netflix, Disney+, or another Widevine service starts playback in the packaged app. |
| Release assets | GitHub Release contains the expected DMG artifacts and checksums. |

## Current Local Gate Status

Last checked: 2026-05-19 KST.

| Gate | Status | Evidence |
| --- | --- | --- |
| Local release gate | Passing | `pnpm release:check` completed successfully. |
| Apple signing certificate | Present | `security find-identity -v -p codesigning` found `Developer ID Application: Hamin Lee (5Z9KNW282F)`. |
| EVS account | Blocked | `pnpm --filter @aka-browser/browser evs:verify` failed because `castlabs-evs` is not installed. |
| Notarization | Not checked | Requires a packaged app built after EVS setup. |
| DRM playback | Not checked | Requires an EVS-signed packaged app and a Widevine streaming account. |

## Release Candidate Checklist

1. Start from a clean `main` branch.
2. Run `pnpm install --frozen-lockfile`.
3. Run `pnpm release:check`.
4. Run `pnpm --filter @aka-browser/browser evs:verify`.
5. Build the app with `pnpm --filter @aka-browser/browser package`.
6. Verify notarization with `spctl`.
7. Launch the packaged app.
8. Confirm a blank tab opens and Settings is reachable.
9. Confirm Settings > Language shows System Default, English, and Korean.
10. Confirm Widevine CDM is present in startup logs.
11. Confirm at least one Widevine-protected streaming service starts playback.
12. Upload release assets and checksums to GitHub Releases.
13. Publish release notes with any skipped manual gates called out explicitly.

## Blocking Rules

- Do not release if `pnpm release:check` fails.
- Do not advertise DRM playback if EVS signing or DRM playback was not verified
  on the packaged app.
- Do not publish macOS downloads as stable if notarization was skipped or failed.
- Do not replace Castlabs Electron with standard Electron during release
  maintenance.

## Stage 2 Project Items

Stage 2 project items should stay focused on release readiness. Good items are
small, verifiable, and either close with repository evidence or remain open with
a clear external gate.
