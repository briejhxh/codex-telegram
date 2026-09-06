import fs from "node:fs/promises";
import path from "node:path";
import { WriteRateLimiter } from "./rateLimit.js";

export type ToolRisk = "read" | "low-risk-write" | "write" | "destructive";
export type PolicyProfile = "read-only" | "inbox" | "messaging" | "files" | "community-manager" | "admin" | "full-access";

const profileRisks: Record<PolicyProfile, readonly ToolRisk[]> = {
  "read-only": ["read"],
  inbox: ["read", "low-risk-write"],
  messaging: ["read", "low-risk-write", "write"],
  files: ["read", "low-risk-write", "write"],
  "community-manager": ["read", "low-risk-write", "write"],
  admin: ["read", "low-risk-write", "write", "destructive"],
  "full-access": ["read", "low-risk-write", "write", "destructive"],
};

function csv(name: string): string[] {
  return (process.env[name] ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

function roots(): string[] {
  const value = process.env.TG_FILE_ROOTS ?? "";
  return value.split(path.delimiter).map((item) => item.trim()).filter(Boolean).map((item) => path.resolve(item));
}

function profile(): PolicyProfile {
  const value = process.env.TG_POLICY_PROFILE ?? "read-only";
  if (value in profileRisks) return value as PolicyProfile;
  throw new PolicyError("INVALID_POLICY", `TG_POLICY_PROFILE must be one of: ${Object.keys(profileRisks).join(", ")}.`);
}

export class PolicyError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

export class Policy {
  readonly profile = profile();
  readonly allowedChatIds = new Set(csv("TG_ALLOWED_CHAT_IDS").map(Number).filter(Number.isSafeInteger));
  readonly deniedChatIds = new Set(csv("TG_DENIED_CHAT_IDS").map(Number).filter(Number.isSafeInteger));
  readonly allowedTools = new Set(csv("TG_ALLOWED_TOOLS"));
  readonly deniedTools = new Set(csv("TG_DENIED_TOOLS"));
  readonly fileRoots = roots();
  readonly maxFileBytes = Number(process.env.TG_MAX_SEND_FILE_BYTES ?? 25 * 1024 * 1024);
  readonly maxWritesPerMinute = Number(process.env.TG_MAX_WRITES_PER_MINUTE ?? 20);
  private readonly writeLimiter = new WriteRateLimiter(this.maxWritesPerMinute, 60_000);

  describe() {
    return {
      profile: this.profile,
      allowed_chat_ids_configured: this.allowedChatIds.size,
      denied_chat_ids_configured: this.deniedChatIds.size,
      file_roots_configured: this.fileRoots.length,
      max_send_file_bytes: Number.isSafeInteger(this.maxFileBytes) && this.maxFileBytes > 0 ? this.maxFileBytes : undefined,
      max_writes_per_minute: Number.isSafeInteger(this.maxWritesPerMinute) && this.maxWritesPerMinute > 0 ? this.maxWritesPerMinute : undefined,
      destructive_approval_configured: Boolean(process.env.TG_DESTRUCTIVE_APPROVAL?.trim()),
    };
  }

  authorize(tool: string, risk: ToolRisk, options: { chatId?: number; approvalCode?: string } = {}) {
    if (this.deniedTools.has(tool)) throw new PolicyError("TOOL_DENIED", `${tool} is denied by the local Telegram policy.`);
    if (this.allowedTools.size > 0 && !this.allowedTools.has(tool)) throw new PolicyError("TOOL_NOT_ALLOWED", `${tool} is not in TG_ALLOWED_TOOLS.`);
    if (!profileRisks[this.profile].includes(risk)) throw new PolicyError("WRITE_DISABLED", `${tool} requires ${risk} access; the active profile is ${this.profile}.`);
    if (options.chatId !== undefined) {
      if (this.deniedChatIds.has(options.chatId)) throw new PolicyError("PEER_DENIED", `Chat ${options.chatId} is denied by the local Telegram policy.`);
      if (risk !== "read" && this.allowedChatIds.size > 0 && !this.allowedChatIds.has(options.chatId)) throw new PolicyError("PEER_NOT_ALLOWED", `Chat ${options.chatId} is not in TG_ALLOWED_CHAT_IDS.`);
    }
    if (risk === "destructive") {
      const expected = process.env.TG_DESTRUCTIVE_APPROVAL?.trim();
      if (!expected || options.approvalCode !== expected) throw new PolicyError("APPROVAL_REQUIRED", "This destructive action requires the locally configured TG_DESTRUCTIVE_APPROVAL code.");
    }
    if (risk !== "read") {
      if (!Number.isSafeInteger(this.maxWritesPerMinute) || this.maxWritesPerMinute <= 0) throw new PolicyError("INVALID_POLICY", "TG_MAX_WRITES_PER_MINUTE must be a positive integer.");
      this.writeLimiter.consume(`${tool}:${options.chatId ?? "local"}`);
    }
  }

  async authorizeFile(filePath: string): Promise<string> {
    if (!Number.isSafeInteger(this.maxFileBytes) || this.maxFileBytes <= 0) throw new PolicyError("INVALID_POLICY", "TG_MAX_SEND_FILE_BYTES must be a positive integer.");
    if (this.fileRoots.length === 0) throw new PolicyError("FILE_ROOT_REQUIRED", "Sending files is disabled until TG_FILE_ROOTS contains one or more allowed directories.");
    const real = await fs.realpath(filePath).catch(() => { throw new PolicyError("FILE_NOT_FOUND", "The selected local file does not exist or cannot be resolved."); });
    const allowed = await Promise.all(this.fileRoots.map(async (root) => {
      const realRoot = await fs.realpath(root).catch(() => undefined);
      return realRoot ? isInside(realRoot, real) : false;
    }));
    if (!allowed.some(Boolean)) throw new PolicyError("FILE_OUTSIDE_ALLOWED_ROOT", "The selected file is outside TG_FILE_ROOTS.");
    const stat = await fs.lstat(real);
    if (!stat.isFile()) throw new PolicyError("INVALID_FILE", "Only regular files can be sent.");
    if (stat.size > this.maxFileBytes) throw new PolicyError("FILE_TOO_LARGE", `The selected file exceeds the ${this.maxFileBytes}-byte send limit.`);
    return real;
  }
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return Boolean(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
