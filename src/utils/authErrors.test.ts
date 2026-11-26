import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "./authErrors";

describe("authentication recovery guidance", () => {
  it("suggests checking service availability without diagnosing a paused project", () => {
    const message = getAuthErrorMessage(new TypeError("Failed to fetch"));
    expect(message).toContain("unavailable");
    expect(message).toContain("check whether");
    expect(message).toContain("paused");
  });

  it("distinguishes rate limits from unavailable services", () => {
    expect(getAuthErrorMessage({ status: 429, message: "Request failed" }))
      .toContain("Wait a few minutes");
    expect(getAuthErrorMessage({ status: 503, message: "Service unavailable" }))
      .toContain("unavailable");
  });

  it("explains email restrictions, delivery errors, and expired codes", () => {
    expect(getAuthErrorMessage({ code: "email_address_not_authorized", message: "Not allowed" }))
      .toContain("email delivery settings");
    expect(getAuthErrorMessage({ status: 500, message: "Error sending magic link email" }))
      .toContain("email could not be sent");
    expect(getAuthErrorMessage({ code: "otp_expired", message: "Token has expired" }))
      .toContain("Request a new email");
  });

  it("identifies missing configuration and preserves unknown error details", () => {
    expect(getAuthErrorMessage(new Error("Supabase is not configured.")))
      .toContain("not configured correctly");
    expect(getAuthErrorMessage(new Error("Invalid API key")))
      .toContain("not configured correctly");
    expect(getAuthErrorMessage(new Error("Unexpected response")))
      .toContain("Unexpected response");
    expect(getAuthErrorMessage(null)).toBe("Login failed. Please try again.");
  });
});
