import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "./authErrors";

describe("authentication recovery guidance", () => {
  it("suggests checking service availability without diagnosing a paused project", () => {
    const message = getAuthErrorMessage(new TypeError("Failed to fetch"));
    expect(message).toContain("暂不可用");
    expect(message).toContain("请检查");
    expect(message).toContain("是否已暂停");
  });

  it("distinguishes rate limits from unavailable services", () => {
    expect(getAuthErrorMessage({ status: 429, message: "Request failed" }))
      .toContain("等待几分钟");
    expect(getAuthErrorMessage({ status: 503, message: "Service unavailable" }))
      .toContain("暂不可用");
  });

  it("explains email restrictions, delivery errors, and expired codes", () => {
    expect(getAuthErrorMessage({ code: "email_address_not_authorized", message: "Not allowed" }))
      .toContain("邮件发送设置");
    expect(getAuthErrorMessage({ status: 500, message: "Error sending magic link email" }))
      .toContain("登录邮件发送失败");
    expect(getAuthErrorMessage({ code: "otp_expired", message: "Token has expired" }))
      .toContain("请重新发送邮件");
  });

  it("identifies missing configuration and gives a Chinese fallback for unknown errors", () => {
    expect(getAuthErrorMessage(new Error("Supabase is not configured.")))
      .toContain("配置不正确");
    expect(getAuthErrorMessage(new Error("Invalid API key")))
      .toContain("配置不正确");
    expect(getAuthErrorMessage(new Error("Unexpected response")))
      .toBe("登录失败，请稍后重试。");
    expect(getAuthErrorMessage(null)).toBe("登录失败，请稍后重试。");
  });
});
