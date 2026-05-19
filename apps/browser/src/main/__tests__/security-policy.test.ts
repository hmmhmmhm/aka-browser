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
    expect(sanitizeNavigationInput("localhost:5173")).toBe(
      "http://localhost:5173"
    );
  });

  it("removes control characters from user input", () => {
    expect(sanitizeNavigationInput("\nexample.com\t")).toBe(
      "https://example.com"
    );
  });

  it("allows http and https web URLs", () => {
    expect(isNavigableWebUrl("https://example.com", "production")).toBe(true);
    expect(isNavigableWebUrl("http://localhost:5173", "production")).toBe(
      true
    );
  });

  it("allows file URLs only in development", () => {
    expect(isNavigableWebUrl("file:///tmp/page.html", "development")).toBe(
      true
    );
    expect(isNavigableWebUrl("file:///tmp/page.html", "production")).toBe(
      false
    );
  });

  it("blocks dangerous protocols", () => {
    expect(classifyNavigationTarget("javascript:alert(1)", "production")).toEqual(
      {
        kind: "blocked",
        reason: "Blocked protocol javascript:",
        url: "javascript:alert(1)",
      }
    );
    expect(classifyNavigationTarget("data:text/html,hi", "production").kind).toBe(
      "blocked"
    );
  });

  it("classifies external app protocols", () => {
    const result = classifyNavigationTarget("mailto:test@example.com", "production");
    expect(result).toEqual({
      kind: "external",
      protocol: "mailto:",
      url: "mailto:test@example.com",
    });
  });

  it("blocks unsupported protocols", () => {
    expect(classifyNavigationTarget("ftp://example.com/file", "production")).toEqual(
      {
        kind: "blocked",
        reason: "Unsupported protocol ftp:",
        url: "ftp://example.com/file",
      }
    );
  });
});
