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
    return "Too many login attempts. Wait a few minutes before trying again.";
  }
  if (code === "email_address_not_authorized" || lower.includes("email address not authorized")) {
    return "This email cannot receive login messages with the current email service. Check the project's email delivery settings.";
  }
  if (/sending.*email|sending.*magic.?link|smtp/.test(lower)) {
    return "The login email could not be sent. Try again later; if it continues, check the project's email delivery settings.";
  }
  if (code === "otp_expired" || /expired|already.*used/.test(lower)) {
    return "This login link or code has expired or has already been used. Request a new email and use the latest code or link.";
  }
  if (/not configured|invalid api key|invalid.*url/.test(lower)) {
    return "Cloud login is not configured correctly. Check the app's connection settings before trying again.";
  }
  if (
    details.status === 0 ||
    (typeof details.status === "number" && details.status >= 500) ||
    /failed to fetch|fetch failed|network|load failed|service (?:is )?unavailable|paused/.test(lower)
  ) {
    return "The login service is unavailable. Check your connection and retry shortly. If the app has been unused for a while, check whether its Supabase project is paused.";
  }
  return message ? `Login failed. Please try again. (${message})` : "Login failed. Please try again.";
}
