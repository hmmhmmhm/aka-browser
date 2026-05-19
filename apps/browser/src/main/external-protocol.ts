export interface ExternalProtocolPrompt {
  detail: string;
  message: string;
}

const confirmableExternalProtocols = new Set([
  "mailto:",
  "tel:",
  "sms:",
  "facetime:",
]);

export function getExternalProtocol(urlString: string): string | null {
  try {
    const protocol = new URL(urlString).protocol;
    if (protocol === "http:" || protocol === "https:" || protocol === "file:") {
      return null;
    }
    return protocol;
  } catch {
    return null;
  }
}

export function isConfirmableExternalProtocol(protocol: string): boolean {
  return confirmableExternalProtocols.has(protocol);
}

export function buildExternalProtocolPrompt(
  targetUrl: string,
  sourceUrl: string
): ExternalProtocolPrompt {
  const protocol = getExternalProtocol(targetUrl) ?? "external:";
  const source = sourceUrl || "This page";

  return {
    detail: `${source} wants to open ${targetUrl} outside aka-browser.`,
    message: `Open ${protocol} link?`,
  };
}
