import { dialog, shell } from "electron";
import { AppState } from "../types";
import {
  buildExternalProtocolPrompt,
  getExternalProtocol,
  isConfirmableExternalProtocol,
} from "../external-protocol";
import { logSecurityEvent } from "../security";

export function confirmAndOpenExternalProtocol(
  state: AppState,
  targetUrl: string,
  sourceUrl: string
): void {
  const protocol = getExternalProtocol(targetUrl);
  if (!protocol || !isConfirmableExternalProtocol(protocol)) {
    logSecurityEvent("Blocked unsupported external protocol", { targetUrl });
    return;
  }

  const prompt = buildExternalProtocolPrompt(targetUrl, sourceUrl);
  const choice = state.mainWindow
    ? dialog.showMessageBoxSync(state.mainWindow, {
        buttons: ["Open", "Cancel"],
        cancelId: 1,
        defaultId: 1,
        detail: prompt.detail,
        message: prompt.message,
        noLink: true,
        type: "question",
      })
    : 1;

  if (choice === 0) {
    shell.openExternal(targetUrl).catch((error) => {
      console.error("[TabManager] Failed to open external URL:", error);
    });
  }
}
