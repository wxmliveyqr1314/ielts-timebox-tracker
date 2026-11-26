export function getAuthErrorMessage(error: unknown): string {
  const details = error && typeof error === "object"
    ? error as { message?: unknown; code?: unknown; status?: unknown }
    : {};
  const message = typeof error === "string"
    ? error
    : typeof details.message === "string" ? details.message : "";
  const lower = message.toLowerCase();
  const code = typeof details.code === "string" ? details.code : "";

  if (details.status === 429 || code.includes("rate_limit") || /rate limit|too many requests/.test(lower)) {
    return "登录请求过于频繁，请等待几分钟后再试。";
  }
  if (code === "email_address_not_authorized" || lower.includes("email address not authorized")) {
    return "当前邮件服务无法向此邮箱发送登录邮件，请检查项目的邮件发送设置。";
  }
  if (/sending.*email|sending.*magic.?link|smtp/.test(lower)) {
    return "登录邮件发送失败，请稍后重试；若持续失败，请检查项目的邮件发送设置。";
  }
  if (code === "otp_expired" || /expired|already.*used/.test(lower)) {
    return "登录链接或验证码已过期或已使用。请重新发送邮件，使用最新的验证码或链接。";
  }
  if (/not configured|invalid api key|invalid.*url/.test(lower)) {
    return "云登录配置不正确，请检查应用的连接设置后重试。";
  }
  if (
    details.status === 0 ||
    (typeof details.status === "number" && details.status >= 500) ||
    /failed to fetch|fetch failed|network|load failed|service (?:is )?unavailable|paused/.test(lower)
  ) {
    return "登录服务暂不可用，请检查网络后重试。若长时间未使用，请检查 Supabase 项目是否已暂停。";
  }
  return "登录失败，请稍后重试。";
}
