# Stage 3 Browser Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Stage 3 companion-browser stability layer: safer production defaults, site controls, recovery, downloads, page tools, and tests.

**Architecture:** Keep the current Electron main/renderer/preload split. Add small state-focused main-process managers, expose narrow IPC methods, and add testable pure logic around policy and persistence before wiring UI. Each task must keep `pnpm release:check` green.

**Tech Stack:** Electron, React 18, TypeScript, Vite, pnpm, Turbo, Vitest.

---

## File Structure

- Modify `package.json`: add root `test` script and include tests in `release:check`.
- Modify `scripts/release-check.sh`: run `pnpm test` after build/type checks.
- Modify `apps/browser/package.json`: add `test` script and Vitest dependency.
- Create `apps/browser/vitest.config.ts`: Node-environment unit test config.
- Create `apps/browser/src/main/security-policy.ts`: protocol classification and navigation policy.
- Modify `apps/browser/src/main/security.ts`: delegate policy decisions to `security-policy.ts`.
- Modify `apps/browser/src/main/app-lifecycle.ts`: remove unsafe production switches.
- Create `apps/browser/src/main/permission-manager.ts`: site permission persistence and decisions.
- Create `apps/browser/src/main/history-manager.ts`: history persistence and visit updates.
- Create `apps/browser/src/main/session-manager.ts`: tab/session persistence and restore normalization.
- Create `apps/browser/src/main/download-manager.ts`: download state tracking around Electron download events.
- Create `apps/browser/src/main/browsing-data-manager.ts`: app-owned and Electron session data clearing.
- Create `apps/browser/src/main/external-protocol.ts`: external protocol classification and confirmation.
- Modify `apps/browser/src/main/index.ts`: instantiate new managers.
- Modify `apps/browser/src/main/ipc-handlers.ts`: register narrow IPC APIs for new managers and page tools.
- Modify `apps/browser/src/main/tab-manager.ts`: record history/session changes and use security policy.
- Modify `apps/browser/src/main/window-manager.ts`: wire permission manager and page tool shortcuts.
- Modify `apps/browser/src/preload.ts`: expose new IPC APIs.
- Modify `apps/browser/src/types/electron-api.d.ts`: type new APIs.
- Modify `apps/browser/src/renderer/components/menu-overlay.tsx`: add page tools and downloads/settings entry points.
- Modify `apps/browser/src/renderer/components/settings.tsx`: add Site Permissions, Browsing Data, History, and Downloads views.
- Create focused renderer components under `apps/browser/src/renderer/components/settings/`.
- Create unit tests under `apps/browser/src/main/__tests__/`.
- Create `docs/STAGE_3_SMOKE_CHECKLIST.md`: manual smoke checklist.

## Task 1: Test Foundation

**Files:**
- Modify: `package.json`
- Modify: `apps/browser/package.json`
- Modify: `scripts/release-check.sh`
- Create: `apps/browser/vitest.config.ts`
- Create: `apps/browser/src/main/__tests__/smoke.test.ts`

- [ ] **Step 1: Add failing package scripts**

Update root `package.json` scripts:

```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",
    "check-types": "turbo run check-types",
    "test": "turbo run test",
    "release:check": "bash scripts/release-check.sh"
  }
}
```

Update `apps/browser/package.json` scripts and devDependencies:

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Add Vitest config**

Create `apps/browser/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
```

- [ ] **Step 3: Add initial test**

Create `apps/browser/src/main/__tests__/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("test foundation", () => {
  it("runs main-process unit tests", () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 4: Wire release check**

Edit `scripts/release-check.sh` after the TypeScript/lint/build block:

```bash
echo
echo "== Unit tests =="
pnpm test
```

- [ ] **Step 5: Verify**

Run:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm release:check
```

Expected:

- `pnpm test` exits 0.
- `pnpm release:check` exits 0 and prints `== Unit tests ==`.

- [ ] **Step 6: Commit**

```bash
git add package.json apps/browser/package.json pnpm-lock.yaml scripts/release-check.sh apps/browser/vitest.config.ts apps/browser/src/main/__tests__/smoke.test.ts
git commit -m "test: add browser unit test foundation"
```

## Task 2: Security Policy and Production Defaults

**Files:**
- Create: `apps/browser/src/main/security-policy.ts`
- Create: `apps/browser/src/main/__tests__/security-policy.test.ts`
- Modify: `apps/browser/src/main/security.ts`
- Modify: `apps/browser/src/main/app-lifecycle.ts`
- Modify: `apps/browser/src/main/tab-manager.ts`

- [ ] **Step 1: Write policy tests**

Create `apps/browser/src/main/__tests__/security-policy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  classifyNavigationTarget,
  isNavigableWebUrl,
  sanitizeNavigationInput,
} from "../security-policy";

describe("security policy", () => {
  it("normalizes bare external domains to https", () => {
    expect(sanitizeNavigationInput("example.com")).toBe("https://example.com");
  });

  it("normalizes localhost to http", () => {
    expect(sanitizeNavigationInput("localhost:5173")).toBe("http://localhost:5173");
  });

  it("allows http and https web URLs", () => {
    expect(isNavigableWebUrl("https://example.com", "production")).toBe(true);
    expect(isNavigableWebUrl("http://localhost:5173", "production")).toBe(true);
  });

  it("allows file URLs only in development", () => {
    expect(isNavigableWebUrl("file:///tmp/page.html", "development")).toBe(true);
    expect(isNavigableWebUrl("file:///tmp/page.html", "production")).toBe(false);
  });

  it("blocks dangerous protocols", () => {
    expect(classifyNavigationTarget("javascript:alert(1)", "production").kind).toBe("blocked");
    expect(classifyNavigationTarget("data:text/html,hi", "production").kind).toBe("blocked");
  });

  it("classifies external app protocols", () => {
    const result = classifyNavigationTarget("mailto:test@example.com", "production");
    expect(result.kind).toBe("external");
    expect(result.protocol).toBe("mailto:");
  });
});
```

- [ ] **Step 2: Implement policy**

Create `apps/browser/src/main/security-policy.ts`:

```ts
export type RuntimeEnvironment = "development" | "production";

export type NavigationDecision =
  | { kind: "web"; url: string }
  | { kind: "external"; url: string; protocol: string }
  | { kind: "blocked"; url: string; reason: string };

const dangerousProtocols = new Set(["javascript:", "data:", "vbscript:", "about:", "blob:"]);
const externalProtocols = new Set(["mailto:", "tel:", "sms:", "facetime:"]);

export function getRuntimeEnvironment(): RuntimeEnvironment {
  return process.env.NODE_ENV === "development" ? "development" : "production";
}

export function sanitizeNavigationInput(input: string): string {
  let url = input.trim().replace(/[\x00-\x1F\x7F]/g, "");
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return url;

  const isLocalUrl =
    /^(localhost|127\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?/i.test(
      url
    );

  return `${isLocalUrl ? "http" : "https"}://${url}`;
}

export function isNavigableWebUrl(
  urlString: string,
  environment: RuntimeEnvironment = getRuntimeEnvironment()
): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol === "http:" || url.protocol === "https:") return true;
    if (environment === "development" && url.protocol === "file:") return true;
    return false;
  } catch {
    return false;
  }
}

export function classifyNavigationTarget(
  input: string,
  environment: RuntimeEnvironment = getRuntimeEnvironment()
): NavigationDecision {
  const sanitized = sanitizeNavigationInput(input);

  try {
    const url = new URL(sanitized);
    if (dangerousProtocols.has(url.protocol)) {
      return { kind: "blocked", url: sanitized, reason: `Blocked protocol ${url.protocol}` };
    }
    if (isNavigableWebUrl(sanitized, environment)) {
      return { kind: "web", url: sanitized };
    }
    if (externalProtocols.has(url.protocol)) {
      return { kind: "external", url: sanitized, protocol: url.protocol };
    }
    return { kind: "blocked", url: sanitized, reason: `Unsupported protocol ${url.protocol}` };
  } catch {
    return { kind: "blocked", url: sanitized, reason: "Invalid URL" };
  }
}
```

- [ ] **Step 3: Delegate existing security helpers**

Update `apps/browser/src/main/security.ts` so `sanitizeUrl()` calls
`sanitizeNavigationInput()` and `isValidUrl()` returns true only for
`classifyNavigationTarget(url).kind === "web"`.

- [ ] **Step 4: Remove unsafe production switches**

In `apps/browser/src/main/app-lifecycle.ts`, remove:

```ts
app.commandLine.appendSwitch("ignore-certificate-errors");
app.commandLine.appendSwitch("allow-running-insecure-content");
```

Keep the Widevine feature switch.

- [ ] **Step 5: Use policy in new-window handling**

In `apps/browser/src/main/tab-manager.ts`, use `classifyNavigationTarget()` in
`will-navigate` and `setWindowOpenHandler`. Web decisions load normally,
blocked decisions are denied, and external decisions are denied until Task 4
adds confirmation.

- [ ] **Step 6: Verify**

Run:

```bash
pnpm test
pnpm release:check
```

- [ ] **Step 7: Commit**

```bash
git add apps/browser/src/main/security-policy.ts apps/browser/src/main/__tests__/security-policy.test.ts apps/browser/src/main/security.ts apps/browser/src/main/app-lifecycle.ts apps/browser/src/main/tab-manager.ts
git commit -m "security: add explicit navigation policy"
```

## Task 3: Site Permission Manager

**Files:**
- Create: `apps/browser/src/main/permission-manager.ts`
- Create: `apps/browser/src/main/__tests__/permission-manager.test.ts`
- Modify: `apps/browser/src/main/index.ts`
- Modify: `apps/browser/src/main/window-manager.ts`
- Modify: `apps/browser/src/main/ipc-handlers.ts`
- Modify: `apps/browser/src/preload.ts`
- Modify: `apps/browser/src/types/electron-api.d.ts`

- [ ] **Step 1: Write permission manager tests**

Create tests for:

- default decision is `prompt` for supported permissions.
- saved `allow` and `block` decisions are returned by origin.
- `clear()` removes decisions.
- corrupt JSON starts with empty state.

- [ ] **Step 2: Implement permission manager**

Create a class with this public API:

```ts
export type SitePermission = "media" | "clipboard-read" | "clipboard-write" | "fullscreen";
export type PermissionDecision = "allow" | "block" | "prompt";

export interface SitePermissionEntry {
  origin: string;
  permission: SitePermission;
  decision: PermissionDecision;
  updatedAt: number;
}

export class PermissionManager {
  constructor(basePath?: string);
  getDecision(origin: string, permission: SitePermission): PermissionDecision;
  setDecision(origin: string, permission: SitePermission, decision: PermissionDecision): void;
  list(): SitePermissionEntry[];
  clear(origin?: string): void;
}
```

- [ ] **Step 3: Wire Electron permission handler**

Use `PermissionManager` in the session permission handler. Apply saved allow or
block decisions. For unknown media/fullscreen/clipboard requests, deny by
default in main-process logic until the renderer prompt is added in the next
UI task.

- [ ] **Step 4: Expose IPC APIs**

Add narrow IPC handlers:

- `permissions-list`
- `permissions-set`
- `permissions-clear`

- [ ] **Step 5: Verify and commit**

Run `pnpm test && pnpm release:check`, then commit:

```bash
git add apps/browser/src/main/permission-manager.ts apps/browser/src/main/__tests__/permission-manager.test.ts apps/browser/src/main/index.ts apps/browser/src/main/window-manager.ts apps/browser/src/main/ipc-handlers.ts apps/browser/src/preload.ts apps/browser/src/types/electron-api.d.ts
git commit -m "feat: add site permission manager"
```

## Task 4: External Protocol Confirmation

**Files:**
- Create: `apps/browser/src/main/external-protocol.ts`
- Create: `apps/browser/src/main/__tests__/external-protocol.test.ts`
- Modify: `apps/browser/src/main/tab-manager.ts`
- Modify: `apps/browser/src/main/ipc-handlers.ts`
- Modify: `apps/browser/src/preload.ts`
- Modify: `apps/browser/src/renderer/app.tsx`

- [ ] **Step 1: Test protocol confirmation classification**

Cover mailto/tel as external and unknown protocols as blocked.

- [ ] **Step 2: Implement external protocol helper**

Create helpers that extract protocol, origin URL, and display labels for
confirmation prompts.

- [ ] **Step 3: Wire request flow**

When external navigation is attempted, send an IPC event to the renderer with
the protocol and URL. Renderer shows a compact confirmation dialog. Confirmed
opens call Electron `shell.openExternal`; cancelled does nothing.

- [ ] **Step 4: Verify and commit**

Run `pnpm test && pnpm release:check`, then commit:

```bash
git add apps/browser/src/main/external-protocol.ts apps/browser/src/main/__tests__/external-protocol.test.ts apps/browser/src/main/tab-manager.ts apps/browser/src/main/ipc-handlers.ts apps/browser/src/preload.ts apps/browser/src/renderer/app.tsx
git commit -m "feat: confirm external protocol launches"
```

## Task 5: History and Session Restore

**Files:**
- Create: `apps/browser/src/main/history-manager.ts`
- Create: `apps/browser/src/main/session-manager.ts`
- Create: `apps/browser/src/main/__tests__/history-manager.test.ts`
- Create: `apps/browser/src/main/__tests__/session-manager.test.ts`
- Modify: `apps/browser/src/main/index.ts`
- Modify: `apps/browser/src/main/tab-manager.ts`
- Modify: `apps/browser/src/main/tabs/tab-navigation.ts`
- Modify: `apps/browser/src/main/window-manager.ts`

- [ ] **Step 1: Write history tests**

Cover new visit, repeated URL visit count increment, title update, max entry
ordering, and corrupt JSON recovery.

- [ ] **Step 2: Write session tests**

Cover tab serialization, active tab persistence, orientation persistence, and
normalization of internal temp-file URLs to blank tabs.

- [ ] **Step 3: Implement managers**

History manager API:

```ts
recordVisit(url: string, title: string, visitedAt?: number): void;
list(limit?: number): HistoryEntry[];
clear(): void;
```

Session manager API:

```ts
save(snapshot: BrowserSessionSnapshot): void;
load(): BrowserSessionSnapshot | null;
clear(): void;
normalizeUrlForRestore(url: string): string;
```

- [ ] **Step 4: Wire tab lifecycle**

Record history on main-frame successful navigation. Save session on tab create,
close, switch, navigation complete, orientation change, and app quit.

- [ ] **Step 5: Restore on launch**

In `WindowManager.createWindow()`, load saved tabs if available. Fall back to a
single blank tab when no valid tabs exist.

- [ ] **Step 6: Verify and commit**

Run `pnpm test && pnpm release:check`, then commit:

```bash
git add apps/browser/src/main/history-manager.ts apps/browser/src/main/session-manager.ts apps/browser/src/main/__tests__/history-manager.test.ts apps/browser/src/main/__tests__/session-manager.test.ts apps/browser/src/main/index.ts apps/browser/src/main/tab-manager.ts apps/browser/src/main/tabs/tab-navigation.ts apps/browser/src/main/window-manager.ts
git commit -m "feat: add history and session restore"
```

## Task 6: Browsing Data Settings

**Files:**
- Create: `apps/browser/src/main/browsing-data-manager.ts`
- Create: `apps/browser/src/main/__tests__/browsing-data-manager.test.ts`
- Modify: `apps/browser/src/main/ipc-handlers.ts`
- Modify: `apps/browser/src/preload.ts`
- Modify: `apps/browser/src/types/electron-api.d.ts`
- Modify: `apps/browser/src/renderer/components/settings.tsx`
- Create: `apps/browser/src/renderer/components/settings/browsing-data-view.tsx`

- [ ] **Step 1: Test app-owned clear operations**

Use temp directories and stub session methods to verify history, permissions,
favicon cache, and theme cache clear requests call the expected manager methods.

- [ ] **Step 2: Implement browsing data manager**

Expose:

```ts
clearHistory(): Promise<ClearResult>;
clearCache(): Promise<ClearResult>;
clearCookies(): Promise<ClearResult>;
clearSiteData(): Promise<ClearResult>;
clearAll(): Promise<ClearResult[]>;
```

- [ ] **Step 3: Add Settings UI**

Add a Browsing Data view with buttons for Clear History, Clear Cookies, Clear
Cache, Clear Site Data, and Clear All. Show success/failure text from structured
results.

- [ ] **Step 4: Verify and commit**

Run `pnpm test && pnpm release:check`, then commit:

```bash
git add apps/browser/src/main/browsing-data-manager.ts apps/browser/src/main/__tests__/browsing-data-manager.test.ts apps/browser/src/main/ipc-handlers.ts apps/browser/src/preload.ts apps/browser/src/types/electron-api.d.ts apps/browser/src/renderer/components/settings.tsx apps/browser/src/renderer/components/settings/browsing-data-view.tsx
git commit -m "feat: add browsing data controls"
```

## Task 7: Downloads

**Files:**
- Create: `apps/browser/src/main/download-manager.ts`
- Create: `apps/browser/src/main/__tests__/download-manager.test.ts`
- Modify: `apps/browser/src/main/index.ts`
- Modify: `apps/browser/src/main/ipc-handlers.ts`
- Modify: `apps/browser/src/preload.ts`
- Modify: `apps/browser/src/types/electron-api.d.ts`
- Modify: `apps/browser/src/renderer/components/settings.tsx`
- Create: `apps/browser/src/renderer/components/settings/downloads-view.tsx`

- [ ] **Step 1: Test download transitions**

Cover created, progress, completed, cancelled, interrupted, clear completed,
and list ordering.

- [ ] **Step 2: Implement download manager**

Track:

```ts
id, filename, url, savePath, receivedBytes, totalBytes, state, startedAt, endedAt
```

States:

```ts
"active" | "completed" | "cancelled" | "interrupted"
```

- [ ] **Step 3: Wire Electron session**

Attach to `session.fromPartition("persist:main").on("will-download", ...)`.
Emit renderer updates as items change.

- [ ] **Step 4: Add Downloads view**

Display active and recent downloads. Add Clear Completed and Open in Finder
actions where path exists.

- [ ] **Step 5: Verify and commit**

Run `pnpm test && pnpm release:check`, then commit:

```bash
git add apps/browser/src/main/download-manager.ts apps/browser/src/main/__tests__/download-manager.test.ts apps/browser/src/main/index.ts apps/browser/src/main/ipc-handlers.ts apps/browser/src/preload.ts apps/browser/src/types/electron-api.d.ts apps/browser/src/renderer/components/settings.tsx apps/browser/src/renderer/components/settings/downloads-view.tsx
git commit -m "feat: add download manager"
```

## Task 8: Page Tools

**Files:**
- Modify: `apps/browser/src/main/ipc-handlers.ts`
- Modify: `apps/browser/src/main/window-manager.ts`
- Modify: `apps/browser/src/preload.ts`
- Modify: `apps/browser/src/types/electron-api.d.ts`
- Modify: `apps/browser/src/renderer/components/menu-overlay.tsx`
- Create: `apps/browser/src/renderer/components/find-in-page.tsx`

- [ ] **Step 1: Add IPC methods**

Expose active-tab methods:

- `page-find`
- `page-find-next`
- `page-find-previous`
- `page-stop-find`
- `page-zoom-in`
- `page-zoom-out`
- `page-zoom-reset`
- `page-print`

- [ ] **Step 2: Implement active-tab calls**

Use Electron `webContents.findInPage`, `stopFindInPage`, `setZoomLevel`,
`getZoomLevel`, and `print`.

- [ ] **Step 3: Add renderer controls**

Add menu actions for Find, Zoom In, Zoom Out, Reset Zoom, and Print. Find opens
a compact input overlay.

- [ ] **Step 4: Verify and commit**

Run `pnpm test && pnpm release:check`, then commit:

```bash
git add apps/browser/src/main/ipc-handlers.ts apps/browser/src/main/window-manager.ts apps/browser/src/preload.ts apps/browser/src/types/electron-api.d.ts apps/browser/src/renderer/components/menu-overlay.tsx apps/browser/src/renderer/components/find-in-page.tsx
git commit -m "feat: add page tools"
```

## Task 9: Manual Smoke Checklist and Completion Audit

**Files:**
- Create: `docs/STAGE_3_SMOKE_CHECKLIST.md`
- Modify: `docs/RELEASE_READINESS.md`

- [ ] **Step 1: Add smoke checklist**

Create checklist covering:

- launch app
- create/switch/close tabs
- navigate to `https://example.com`
- block `javascript:` navigation
- external `mailto:` confirmation
- permission decision display
- history entry creation
- session restore after app restart
- clear browsing data
- download a small file
- find in page
- zoom in/out/reset
- print dialog opens
- release check passes

- [ ] **Step 2: Update release readiness docs**

Mention `pnpm test` and Stage 3 manual smoke gates.

- [ ] **Step 3: Final verification**

Run:

```bash
pnpm test
pnpm release:check
git diff --check
git status -sb
```

- [ ] **Step 4: Completion audit**

Map every Stage 3 design deliverable to files, tests, and manual smoke evidence.
Do not mark the goal complete if any deliverable is missing or weakly verified.

- [ ] **Step 5: Commit**

```bash
git add docs/STAGE_3_SMOKE_CHECKLIST.md docs/RELEASE_READINESS.md
git commit -m "docs: add stage 3 smoke checklist"
```
