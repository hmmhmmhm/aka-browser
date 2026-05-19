export type RuntimeEnvironment = "development" | "production";

export type NavigationDecision =
  | { kind: "web"; url: string }
  | { kind: "external"; protocol: string; url: string }
  | { kind: "blocked"; reason: string; url: string };

const dangerousProtocols = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "about:",
  "blob:",
]);

const externalProtocols = new Set(["mailto:", "tel:", "sms:", "facetime:"]);

export function getRuntimeEnvironment(): RuntimeEnvironment {
  return process.env.NODE_ENV === "development" ? "development" : "production";
}

export function sanitizeNavigationInput(input: string): string {
  const url = input.trim().replace(/[\x00-\x1F\x7F]/g, "");

  const isLocalUrl =
    /^(localhost|127\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?/i.test(
      url
    );

  if (isLocalUrl) {
    return `http://${url}`;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    return url;
  }

  return `https://${url}`;
}

export function isNavigableWebUrl(
  urlString: string,
  environment: RuntimeEnvironment = getRuntimeEnvironment()
): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return true;
    }
    return environment === "development" && url.protocol === "file:";
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
      return {
        kind: "blocked",
        reason: `Blocked protocol ${url.protocol}`,
        url: sanitized,
      };
    }

    if (isNavigableWebUrl(sanitized, environment)) {
      return { kind: "web", url: sanitized };
    }

    if (externalProtocols.has(url.protocol)) {
      return {
        kind: "external",
        protocol: url.protocol,
        url: sanitized,
      };
    }

    return {
      kind: "blocked",
      reason: `Unsupported protocol ${url.protocol}`,
      url: sanitized,
    };
  } catch {
    return { kind: "blocked", reason: "Invalid URL", url: sanitized };
  }
}
