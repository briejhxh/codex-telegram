import { TelegramError, telegramError } from "./errors.js";

export type OperationKind = "metadata" | "history" | "search" | "transfer" | "write";
export type OperationPolicy = { kind: OperationKind; timeoutMs: number; retries: number; maxDelayMs: number };

export const operationPolicies: Record<OperationKind, OperationPolicy> = {
  metadata: { kind: "metadata", timeoutMs: 10_000, retries: 2, maxDelayMs: 2_000 },
  history: { kind: "history", timeoutMs: 20_000, retries: 2, maxDelayMs: 3_000 },
  search: { kind: "search", timeoutMs: 20_000, retries: 2, maxDelayMs: 3_000 },
  transfer: { kind: "transfer", timeoutMs: 120_000, retries: 0, maxDelayMs: 0 },
  write: { kind: "write", timeoutMs: 30_000, retries: 0, maxDelayMs: 0 },
};

export function requestPolicy(method: string): OperationPolicy {
  if (/^(getChatHistory|searchChatMessages|searchMessages)$/.test(method)) return operationPolicies[method.startsWith("search") ? "search" : "history"];
  if (/^(downloadFile)$/.test(method)) return operationPolicies.transfer;
  if (/^(sendMessage|editMessageText|deleteMessages|setMessageReaction|getCallbackQueryAnswer)$/.test(method)) return operationPolicies.write;
  return operationPolicies.metadata;
}

export async function withTimeout<T>(work: Promise<T>, timeoutMs: number, message: string, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw new TelegramError("CANCELLED", "The operation was cancelled.");
  let timer: NodeJS.Timeout | undefined;
  let abort: (() => void) | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new TelegramError("TIMEOUT", message, false)), timeoutMs); }),
      new Promise<T>((_, reject) => { abort = () => reject(new TelegramError("CANCELLED", "The operation was cancelled.")); signal?.addEventListener("abort", abort, { once: true }); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    if (abort) signal?.removeEventListener("abort", abort);
  }
}

export type RetryOptions = { policy: OperationPolicy; signal?: AbortSignal; sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>; random?: () => number };

const defaultSleep = (milliseconds: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) return reject(new TelegramError("CANCELLED", "The operation was cancelled."));
  const timer = setTimeout(resolve, milliseconds);
  signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new TelegramError("CANCELLED", "The operation was cancelled.")); }, { once: true });
});

/** Retries only operations explicitly classified as read-like; writes are never replayed. */
export async function executeWithRetry<T>(work: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { policy, signal, sleep = defaultSleep, random = Math.random } = options;
  for (let attempt = 0; ; attempt += 1) {
    try { return await withTimeout(work(), policy.timeoutMs, `Telegram ${policy.kind} request timed out.`, signal); }
    catch (cause) {
      const error = telegramError(cause, policy.kind === "write" || policy.kind === "transfer");
      if (signal?.aborted) throw new TelegramError("CANCELLED", "The operation was cancelled.");
      if (policy.kind === "write" && error.code === "TIMEOUT") throw new TelegramError("WRITE_OUTCOME_UNKNOWN", "The write request timed out; do not retry automatically because Telegram may already have accepted it.");
      if (!error.retryable || attempt >= policy.retries) throw error;
      const floodMs = error.retryAfterSeconds ? error.retryAfterSeconds * 1_000 : 0;
      // Retrying before Telegram's requested FloodWait ends merely burns another
      // request. Report a bounded-but-long wait to the caller instead.
      if (floodMs > policy.maxDelayMs) throw error;
      const exponential = Math.min(policy.maxDelayMs, 250 * 2 ** attempt);
      const delay = Math.min(policy.maxDelayMs, Math.max(floodMs, exponential) + Math.floor(random() * 100));
      if (delay <= 0) throw error;
      await sleep(delay, signal);
    }
  }
}
