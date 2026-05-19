# Stage 3 Browser Stability Design

## Summary

Stage 3 turns aka-browser from a release-ready beta into a stable companion
browser. The goal is not to compete with Chrome, Safari, or Arc as a primary
browser. The goal is to make the existing side-browser experience safer,
recoverable, and predictable for day-to-day use with streaming, social feeds,
docs, tutorials, and chat windows.

## Product Boundary

aka-browser remains a focused always-on-top companion browser. Stage 3 includes
the browser controls users naturally need while using that companion: safe
navigation defaults, site permissions, history, session restore, downloads,
site data cleanup, page tools, and regression tests.

Stage 3 excludes password management, autofill, extension support, multi-profile
sync, ad blocking, tracking protection engines, and full default-browser
replacement behavior. Those features would turn aka-browser into a general
browser platform and are outside this stage.

## Current Evidence

- Tabs, tab previews, new-tab creation, tab switching, and tab closing are
  implemented in `apps/browser/src/main/tab-manager.ts`.
- Navigation controls, reload, URL entry, context menu actions, and DevTools
  access exist in the main and renderer layers.
- Bookmarks, default start-page links, favicon cache, language settings, and
  app settings exist.
- Release readiness passes through `pnpm release:check`.
- There is no current test framework or test command beyond the release gate.
- Production security is not ready because `ignore-certificate-errors` and
  `allow-running-insecure-content` are globally enabled during Widevine setup.
- There are no dedicated managers for history, session restore, downloads,
  site permissions, browsing-data cleanup, find-in-page, zoom, print, or
  external protocol confirmation.

## Deliverables

### 1. Security Baseline

Production builds must not ignore certificate errors globally and must not allow
insecure content globally. Any Widevine-specific compatibility switches must be
kept narrow, documented, and environment-aware.

Navigation policy must cover:

- `http:` and `https:` as normal navigable protocols.
- `file:` only in development or for generated internal pages.
- dangerous protocols such as `javascript:`, `data:`, `vbscript:`, `about:`,
  and `blob:` as blocked navigations unless explicitly handled internally.
- external protocols such as `mailto:`, `tel:`, and app-specific links through
  a user-confirmed external-open path.
- `window.open` and target-blank requests opening as tabs only after the same
  policy check.

Certificate and security failures must land on an in-app error page with a
clear reason and a safe recovery action. The app must not silently downgrade
security in production.

### 2. Site Permission Controls

The app must store site-level permission decisions in user data. The first
supported permissions are media, clipboard read/write, and fullscreen because
they map to current Electron permission calls and companion-browser use cases.

Permission behavior:

- Known site decision: apply saved allow/block value.
- Unknown site decision: deny by default where silent denial is acceptable, or
  show a small in-app prompt when the feature needs user intent.
- Settings must expose a Site Permissions view where users can inspect and
  clear stored decisions.
- Permission storage must be testable without Electron UI.

### 3. Browsing Data and Recovery

The app must record enough browsing data to recover normal companion-browser
sessions:

- History entries with URL, title, timestamp, and visit count.
- Session state with open tabs, active tab, and orientation.
- Restore on app launch, with invalid or internal temp-file pages normalized to
  a blank tab.
- Settings actions to clear history, cookies, cache, and all site data.

Browsing data storage must use JSON files under Electron `userData` for local
state that belongs to aka-browser, and Electron session APIs for cookies/cache.

### 4. Downloads

The app must handle Electron download events for the persistent browser session.
Users must be able to see active, completed, cancelled, and failed downloads.

Download behavior:

- Record filename, source URL, save path, received bytes, total bytes, state,
  and timestamps.
- Expose download state to the renderer through IPC.
- Provide a Downloads settings view.
- Provide actions to open the downloaded file location and clear completed
  entries.
- Avoid adding a custom downloader; use Electron's `will-download` flow.

### 5. Page Tools

The app must provide common page-level tools that are useful in a compact
browser:

- Find in page with next/previous result navigation and close behavior.
- Zoom in, zoom out, and reset zoom for the active tab.
- Print active page using Electron's print flow.

These controls should live in the existing menu/settings surface without
turning the top bar into a full desktop browser toolbar.

### 6. External Protocol UX

External protocol launches must be explicit. When a page tries to open an
external app link, aka-browser should show a confirmation prompt naming the
target protocol and origin. The user can open once or cancel. Persistent
remembered allow rules are out of scope for Stage 3.

### 7. Test Foundation

Stage 3 must add a real test command and wire it into release readiness.

Initial test coverage must include:

- URL/security policy.
- permission decision storage.
- history recording and deduplication.
- session serialization and restoration normalization.
- download state transitions.
- browsing-data clear operations for app-owned stores.

Renderer-only visual testing is not required in this stage, but smoke coverage
must prove the TypeScript build, unit tests, and release gate run together.

## Architecture

Stage 3 keeps the existing Electron main/renderer/preload split.

New main-process managers should be small and state-focused:

- `permission-manager.ts` owns per-origin permission decisions.
- `history-manager.ts` owns history persistence and update rules.
- `session-manager.ts` owns save/restore tab state.
- `download-manager.ts` owns download item state and Electron download events.
- `browsing-data-manager.ts` owns user-triggered clearing of history, cookies,
  cache, permissions, and app-owned data.
- `external-protocol.ts` owns protocol classification and confirmation flow.

IPC should expose narrow methods instead of raw Electron APIs. Renderer
components should follow the existing Settings view pattern and should not
directly infer filesystem or Electron session state.

Shared pure logic should live in small testable modules where possible. Electron
integration should be thin and explicit.

## Data Flow

Navigation starts in the renderer URL bar, page links, or `window.open`.
The main process sanitizes and classifies the target. Normal web URLs load in
the active tab or a new tab. External protocols trigger a confirmation flow.
Blocked URLs report a security event and show a safe error state.

Page load completion updates tab metadata, history, previews, and session
state. Tab create, close, switch, orientation change, and app quit also trigger
session persistence.

Downloads start through the persistent browser session. The download manager
assigns an ID, tracks progress events, emits updates to the renderer, and keeps
recent completed entries until the user clears them.

Settings screens read state through IPC and request mutations through dedicated
commands. Mutations update disk-backed stores and notify active renderer views.

## Error Handling

Corrupt JSON stores must be treated as recoverable. The manager should log the
problem, rename or ignore the corrupt data where appropriate, and continue with
empty state instead of crashing the app.

Electron session operations can fail. Clear-data actions must return structured
success or failure results so the UI can show a clear outcome.

Downloads can be cancelled, interrupted, or fail after completion has started.
Download state must reflect Electron's final event state instead of assuming a
successful save.

## Verification

Completion requires all of the following:

- `pnpm test` passes.
- `pnpm release:check` passes and includes tests.
- Unit tests cover security, permissions, history, session restore, downloads,
  and browsing-data manager logic.
- `git diff --check` passes.
- The final worktree has no unintended generated files.
- A manual smoke checklist confirms launch, new tab, navigation, permission
  prompt, session restore, downloads view, data clearing, find, zoom, and print
  do not regress the core companion browser flow.

## Rollout

Implement in small PR-sized slices:

1. Test foundation and security baseline.
2. Site permissions and external protocol policy.
3. History and session restore.
4. Browsing-data cleanup.
5. Downloads.
6. Find, zoom, and print.
7. Final release-readiness and manual smoke pass.

Each slice must leave `main` releasable.
