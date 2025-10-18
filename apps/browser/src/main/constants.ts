/**
 * Application constants and configuration
 */

// iPhone 15 Pro dimensions
export const IPHONE_WIDTH = 393;
export const IPHONE_HEIGHT = 852;
export const FRAME_PADDING = 28; // 14px border on each side
export const TOP_BAR_HEIGHT = 52;
export const STATUS_BAR_HEIGHT = 58; // Height of status bar in portrait mode
export const STATUS_BAR_WIDTH = 58; // Width of status bar in landscape mode

// User Agents
export const IPHONE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// URL validation and security
export const ALLOWED_PROTOCOLS =
  process.env.NODE_ENV === "development"
    ? ["http:", "https:", "file:"]
    : ["http:", "https:"];

export const DANGEROUS_PROTOCOLS = [
  "javascript:",
  "data:",
  "vbscript:",
  "about:",
  "blob:",
];

export const BLOCKED_DOMAINS: string[] = [
  // Add known malicious domains here
  // Example: 'malicious.com', 'phishing-site.net'
];
