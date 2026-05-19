import { describe, expect, it } from "vitest";
import {
  buildExternalProtocolPrompt,
  getExternalProtocol,
  isConfirmableExternalProtocol,
} from "../external-protocol";

describe("external protocol helpers", () => {
  it("extracts the protocol from app links", () => {
    expect(getExternalProtocol("mailto:test@example.com")).toBe("mailto:");
    expect(getExternalProtocol("tel:+15551234567")).toBe("tel:");
  });

  it("rejects web URLs as external protocols", () => {
    expect(getExternalProtocol("https://example.com")).toBeNull();
  });

  it("allows only confirmable external protocols", () => {
    expect(isConfirmableExternalProtocol("mailto:")).toBe(true);
    expect(isConfirmableExternalProtocol("tel:")).toBe(true);
    expect(isConfirmableExternalProtocol("unknown:")).toBe(false);
  });

  it("builds a user-facing prompt", () => {
    expect(
      buildExternalProtocolPrompt("mailto:test@example.com", "https://example.com")
    ).toEqual({
      detail:
        "https://example.com wants to open mailto:test@example.com outside aka-browser.",
      message: "Open mailto: link?",
    });
  });
});
