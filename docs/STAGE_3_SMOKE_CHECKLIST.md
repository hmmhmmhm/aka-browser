# Stage 3 Smoke Checklist

Run this checklist before merging Stage 3 browser stability work.

## Automated Gates

- [ ] `pnpm test` passes.
- [ ] `pnpm release:check` passes.
- [ ] `git diff --check` passes.

## Manual App Smoke

- [ ] Launch aka-browser from the Stage 3 branch.
- [ ] Confirm a blank tab opens.
- [ ] Navigate to `https://example.com`.
- [ ] Confirm `javascript:alert(1)` is blocked.
- [ ] Open a `mailto:` link and confirm aka-browser asks before opening the
      external app.
- [ ] Create, switch, and close tabs.
- [ ] Restart the app and confirm the last web tab restores.
- [ ] Open Settings > Browsing Data and clear history, cookies, cache, site
      data, and all browsing data.
- [ ] Download a small file and confirm Settings > Downloads shows progress or
      completion.
- [ ] Use Find in Page from the page menu.
- [ ] Use Zoom In, Zoom Out, and Reset Zoom from the page menu.
- [ ] Use Print from the page menu and confirm the print dialog opens.
- [ ] Confirm Favorites and Language settings still open.

## Release Notes Evidence

Record the following in release notes or the release checklist:

- Automated gate output.
- Whether EVS signing was available.
- Whether notarization was checked.
- Whether Widevine playback was checked in a packaged app.
- Any skipped manual gate and the reason it was skipped.
