import fs from "fs";
import path from "path";

export type SitePermission =
  | "media"
  | "clipboard-read"
  | "clipboard-write"
  | "fullscreen";

export type PermissionDecision = "allow" | "block" | "prompt";

export interface SitePermissionEntry {
  origin: string;
  permission: SitePermission;
  decision: Exclude<PermissionDecision, "prompt">;
  updatedAt: number;
}

type StoredPermissions = Record<string, SitePermissionEntry>;

const supportedPermissions = new Set<SitePermission>([
  "media",
  "clipboard-read",
  "clipboard-write",
  "fullscreen",
]);

export class PermissionManager {
  private readonly permissionsPath: string;
  private permissions: StoredPermissions = {};

  constructor(basePath: string) {
    this.permissionsPath = path.join(basePath, "site-permissions.json");
    this.load();
  }

  getDecision(originOrUrl: string, permission: SitePermission): PermissionDecision {
    if (!supportedPermissions.has(permission)) return "block";

    const origin = normalizeOrigin(originOrUrl);
    if (!origin) return "block";

    return this.permissions[toKey(origin, permission)]?.decision ?? "prompt";
  }

  setDecision(
    originOrUrl: string,
    permission: SitePermission,
    decision: PermissionDecision,
    updatedAt: number = Date.now()
  ): void {
    if (!supportedPermissions.has(permission)) return;

    const origin = normalizeOrigin(originOrUrl);
    if (!origin) return;

    const key = toKey(origin, permission);
    if (decision === "prompt") {
      delete this.permissions[key];
    } else {
      this.permissions[key] = { decision, origin, permission, updatedAt };
    }

    this.save();
  }

  list(): SitePermissionEntry[] {
    return Object.values(this.permissions).sort(
      (left, right) => right.updatedAt - left.updatedAt
    );
  }

  clear(originOrUrl?: string): void {
    if (!originOrUrl) {
      this.permissions = {};
      this.save();
      return;
    }

    const origin = normalizeOrigin(originOrUrl);
    if (!origin) return;

    for (const key of Object.keys(this.permissions)) {
      if (this.permissions[key].origin === origin) {
        delete this.permissions[key];
      }
    }

    this.save();
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.permissionsPath)) {
        this.permissions = {};
        return;
      }

      const parsed = JSON.parse(
        fs.readFileSync(this.permissionsPath, "utf-8")
      ) as StoredPermissions;
      this.permissions = parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.error("[PermissionManager] Failed to load permissions:", error);
      this.permissions = {};
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.permissionsPath), { recursive: true });
      fs.writeFileSync(
        this.permissionsPath,
        JSON.stringify(this.permissions, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("[PermissionManager] Failed to save permissions:", error);
    }
  }
}

export function normalizeOrigin(originOrUrl: string): string | null {
  try {
    return new URL(originOrUrl).origin;
  } catch {
    return null;
  }
}

function toKey(origin: string, permission: SitePermission): string {
  return `${origin}::${permission}`;
}
