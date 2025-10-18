/**
 * Security utilities for URL validation and sanitization
 */

import { 
  ALLOWED_PROTOCOLS, 
  DANGEROUS_PROTOCOLS, 
  BLOCKED_DOMAINS,
  IPHONE_USER_AGENT,
  DESKTOP_USER_AGENT
} from "./constants";

/**
 * Log security events
 */
export function logSecurityEvent(message: string, details?: any): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[Security] ${message}`, details);
  } else {
    // In production, log to file or monitoring service
    // For now, just log without details to avoid information disclosure
    console.warn(`[Security] ${message}`);
  }
}

/**
 * Validate if a URL is safe to load
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Block dangerous protocols
    if (DANGEROUS_PROTOCOLS.includes(url.protocol)) {
      logSecurityEvent(`Blocked dangerous protocol: ${url.protocol}`, {
        url: urlString,
      });
      return false;
    }

    // Only allow http and https protocols
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      logSecurityEvent(`Blocked invalid protocol: ${url.protocol}`, {
        url: urlString,
      });
      return false;
    }

    // Check against blocked domains (exact match or subdomain)
    const isBlocked = BLOCKED_DOMAINS.some(
      (domain) => url.hostname === domain || url.hostname.endsWith("." + domain)
    );

    if (isBlocked) {
      logSecurityEvent(`Blocked suspicious domain: ${url.hostname}`, {
        url: urlString,
      });
      return false;
    }

    // Allow localhost and private IPs for developer use
    // This browser is designed for developers who need to access local development servers

    return true;
  } catch (error) {
    logSecurityEvent(`Invalid URL format: ${urlString}`, { error });
    return false;
  }
}

/**
 * Sanitize URL by adding appropriate protocol
 */
export function sanitizeUrl(urlString: string): string {
  let url = urlString.trim();

  // If already has a valid protocol, return as-is
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("file://")
  ) {
    return url;
  }

  // If no protocol, add appropriate protocol
  // Check if it's a local URL (localhost or private IP)
  const isLocalUrl =
    /^(localhost|127\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?/i.test(
      url
    );

  if (isLocalUrl) {
    // Use http:// for local development servers
    url = "http://" + url;
  } else {
    // Use https:// for external sites
    url = "https://" + url;
  }

  return url;
}

/**
 * Determine user agent based on URL
 */
export function getUserAgentForUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Use desktop user agent for Netflix
    if (hostname === "netflix.com" || hostname.endsWith(".netflix.com")) {
      return DESKTOP_USER_AGENT;
    }

    // Default to mobile user agent
    return IPHONE_USER_AGENT;
  } catch (error) {
    // If URL parsing fails, default to mobile user agent
    return IPHONE_USER_AGENT;
  }
}

/**
 * Calculate luminance of a color
 */
export function getLuminance(color: string): number {
  let r: number, g: number, b: number;

  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else if (color.startsWith("rgb")) {
    const matches = color.match(/\d+/g);
    if (matches) {
      r = parseInt(matches[0]);
      g = parseInt(matches[1]);
      b = parseInt(matches[2]);
    } else {
      return 0;
    }
  } else {
    return 0;
  }

  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}
