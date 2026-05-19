import {
  normalizeOrigin,
  PermissionManager,
  SitePermission,
} from "../permission-manager";
import { logSecurityEvent } from "../security";

interface PermissionRequestDetails {
  embeddingOrigin?: string;
  requestingUrl?: string;
}

export function shouldGrantPermissionRequest(
  permissionManager: PermissionManager,
  webContents: Electron.WebContents,
  permission: string,
  details?: PermissionRequestDetails
): boolean {
  const sitePermission = toSitePermission(permission);
  if (!sitePermission) {
    logSecurityEvent(`Permission denied: ${permission}`);
    return false;
  }

  const origin = normalizeOrigin(
    details?.requestingUrl || details?.embeddingOrigin || webContents.getURL()
  );
  if (!origin) {
    return isLegacyAllowedPrompt(sitePermission);
  }

  const decision = permissionManager.getDecision(origin, sitePermission);
  if (decision === "allow") return true;
  if (decision === "block") return false;

  return isLegacyAllowedPrompt(sitePermission);
}

function isLegacyAllowedPrompt(permission: SitePermission): boolean {
  return permission === "media" || permission === "fullscreen";
}

function toSitePermission(permission: string): SitePermission | null {
  if (permission === "clipboard-sanitized-write") return "clipboard-write";
  if (
    permission === "media" ||
    permission === "clipboard-read" ||
    permission === "clipboard-write" ||
    permission === "fullscreen"
  ) {
    return permission;
  }
  return null;
}
