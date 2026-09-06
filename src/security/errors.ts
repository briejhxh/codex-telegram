import { PolicyError } from "./policy.js";
import { RateLimitError } from "./rateLimit.js";

export type PublicError = { code: string; message: string; retry_after_seconds?: number };

export function publicError(error: unknown): PublicError {
  if (error instanceof PolicyError) return { code: error.code, message: error.message };
  if (error instanceof RateLimitError) return { code: "LOCAL_RATE_LIMITED", message: "The local safety policy temporarily paused repeated write operations.", retry_after_seconds: error.retryAfterSeconds };
  const detail = error instanceof Error ? error.message : "Unknown Telegram error";
  const flood = /FLOOD_WAIT_(\d+)|retry after\s+(\d+)/i.exec(detail);
  if (flood) return { code: "RATE_LIMITED", message: "Telegram temporarily rate-limited this operation. Retry later; writes are never retried automatically.", retry_after_seconds: Number(flood[1] ?? flood[2]) };
  if (/not authenticated|authorization|login/i.test(detail)) return { code: "AUTH_REQUIRED", message: "Telegram is not authenticated. Run pnpm run login in a terminal, then restart Codex." };
  if (/lock file|already in use|database.*lock/i.test(detail)) return { code: "SESSION_LOCKED", message: "Another process is using this TDLib session. Close it, then restart Codex." };
  if (/not found|have no message|chat.*not found/i.test(detail)) return { code: "NOT_FOUND", message: "Telegram could not find that chat or message for the selected account." };
  return { code: "TELEGRAM_UNAVAILABLE", message: "Telegram could not complete this operation. Run telegram_health for a safe local diagnosis." };
}
