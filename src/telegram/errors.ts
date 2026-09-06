export type TelegramErrorCode =
  | "AUTH_REQUIRED" | "AUTH_FAILED" | "SESSION_LOCKED" | "ACCOUNT_NOT_FOUND"
  | "CHAT_NOT_FOUND" | "MESSAGE_NOT_FOUND" | "USER_NOT_FOUND" | "PERMISSION_DENIED"
  | "RATE_LIMITED" | "TELEGRAM_FLOOD_WAIT" | "TELEGRAM_RESTRICTED"
  | "FILE_NOT_FOUND" | "FILE_TOO_LARGE" | "FILE_ACCESS_DENIED" | "DOWNLOAD_FAILED" | "UPLOAD_FAILED"
  | "INVALID_INPUT" | "TIMEOUT" | "CANCELLED" | "NETWORK_ERROR" | "TDLIB_UNAVAILABLE"
  | "WRITE_OUTCOME_UNKNOWN" | "INTERNAL_ERROR";

export class TelegramError extends Error {
  constructor(
    public readonly code: TelegramErrorCode,
    message: string,
    public readonly retryable = false,
    public readonly retryAfterSeconds?: number,
    public readonly metadata?: Record<string, string | number | boolean>,
  ) { super(message); }
}

export function telegramError(error: unknown, mutation = false): TelegramError {
  if (error instanceof TelegramError) return error;
  const detail = error instanceof Error ? error.message : "Unknown Telegram error";
  const flood = /FLOOD_WAIT_(\d+)|retry after\s+(\d+)/i.exec(detail);
  if (flood) return new TelegramError("TELEGRAM_FLOOD_WAIT", "Telegram requested a temporary pause before this operation can continue.", !mutation, Number(flood[1] ?? flood[2]));
  if (/not authenticated|authorization state|login/i.test(detail)) return new TelegramError("AUTH_REQUIRED", "Telegram is not authenticated. Run pnpm run login in a terminal, then restart Codex.");
  if (/auth.*fail|api[_ ]?hash|api[_ ]?id/i.test(detail)) return new TelegramError("AUTH_FAILED", "Telegram rejected the local API credentials.");
  if (/lock file|already in use|database.*lock/i.test(detail)) return new TelegramError("SESSION_LOCKED", "This Telegram account session is already in use by another codex-telegram process.");
  if (/have no message|message.*not found/i.test(detail)) return new TelegramError("MESSAGE_NOT_FOUND", "Telegram could not find that message for the selected account.");
  if (/chat.*not found|have no chat/i.test(detail)) return new TelegramError("CHAT_NOT_FOUND", "Telegram could not find that chat for the selected account.");
  if (/user.*not found/i.test(detail)) return new TelegramError("USER_NOT_FOUND", "Telegram could not find that user for the selected account.");
  if (/permission|forbidden|not enough rights/i.test(detail)) return new TelegramError("PERMISSION_DENIED", "The selected Telegram account does not have permission for this operation.");
  if (/network|connection|offline|timeout/i.test(detail)) return new TelegramError(mutation ? "WRITE_OUTCOME_UNKNOWN" : "NETWORK_ERROR", mutation ? "The connection failed after a write request began; do not retry automatically because Telegram may already have accepted it." : "Telegram is temporarily unreachable.", !mutation);
  return new TelegramError("TDLIB_UNAVAILABLE", "TDLib could not complete this operation.", !mutation);
}
