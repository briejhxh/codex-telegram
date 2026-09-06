import crypto from "node:crypto";

export type ApprovalPayload = { tool: string; account: string; chatId?: number; material?: Record<string, string | number | boolean>; expiresAt: number };
const usedApprovals = new Map<string, number>();

function canonical(payload: ApprovalPayload) {
  const material = Object.fromEntries(Object.entries(payload.material ?? {}).sort(([left], [right]) => left.localeCompare(right)));
  return JSON.stringify({ tool: payload.tool, account: payload.account, chatId: payload.chatId, material, expiresAt: payload.expiresAt });
}
function signature(secret: string, payload: ApprovalPayload) { return crypto.createHmac("sha256", secret).update(canonical(payload)).digest("base64url"); }

export function createApproval(secret: string, payload: ApprovalPayload): string { return `${payload.expiresAt}.${signature(secret, payload)}`; }

export function consumeApproval(secret: string | undefined, payload: Omit<ApprovalPayload, "expiresAt">, token: string | undefined, now = Date.now()): void {
  if (!secret || !token) throw new ApprovalError("APPROVAL_REQUIRED", "This destructive action requires a one-time locally generated approval token.");
  const parts = token.split(".");
  if (parts.length !== 2) throw new ApprovalError("INVALID_APPROVAL", "The destructive approval token is invalid or expired.");
  const [rawExpiry, received] = parts;
  const expiresAt = Number(rawExpiry);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || !received) throw new ApprovalError("INVALID_APPROVAL", "The destructive approval token is invalid or expired.");
  const approved: ApprovalPayload = { ...payload, expiresAt };
  const expected = signature(secret, approved);
  const valid = received.length === expected.length && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  const key = crypto.createHash("sha256").update(token).digest("hex");
  for (const [entry, expiry] of usedApprovals) if (expiry <= now) usedApprovals.delete(entry);
  if (!valid || usedApprovals.has(key)) throw new ApprovalError("INVALID_APPROVAL", "The destructive approval token is invalid, expired, or has already been used.");
  usedApprovals.set(key, expiresAt);
}

export class ApprovalError extends Error {
  constructor(public readonly code: "APPROVAL_REQUIRED" | "INVALID_APPROVAL", message: string) { super(message); }
}
