import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function defaultConfigDirectory(): string {
  if (process.platform === "win32") return path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"), "codex-telegram");
  return path.join(process.env.XDG_STATE_HOME ?? path.join(os.homedir(), ".local", "state"), "codex-telegram");
}

/** A user-owned directory, deliberately outside a cloned or plugin-cache repository. */
export const configDirectory = path.resolve(process.env.TG_CONFIG_DIR ?? defaultConfigDirectory());
export const configFile = path.resolve(process.env.TG_CONFIG_FILE ?? path.join(configDirectory, "config.env"));

// Environment variables take precedence. The repository .env is a development-only
// fallback; the setup command writes credentials to the user-owned configFile instead.
dotenv.config({ path: configFile });
// A clone-local .env is opt-in so a repository checkout can never silently
// become the location of a Telegram session or override private user settings.
if (process.env.TG_USE_DOTENV === "1") dotenv.config({ path: path.join(projectRoot, ".env") });

export const downloadsDirectory = path.resolve(process.env.TG_DOWNLOADS_DIR ?? path.join(configDirectory, "downloads"));

function tdlibDirectories() {
  return {
    databaseDirectory: path.resolve(process.env.TG_DATABASE_DIR ?? path.join(configDirectory, "tdlib", "database")),
    filesDirectory: path.resolve(process.env.TG_FILES_DIR ?? path.join(configDirectory, "tdlib", "files")),
  };
}

/** Safe, non-secret configuration data intended for the diagnostic MCP tool. */
export function configurationStatus() {
  return {
    configured: Boolean(process.env.TG_API_ID?.trim() && process.env.TG_API_HASH?.trim()),
    config_file: configFile,
    state_directory: configDirectory,
    database_directory: tdlibDirectories().databaseDirectory,
    files_directory: tdlibDirectories().filesDirectory,
    downloads_directory: downloadsDirectory,
  };
}

function positiveIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

/** A conservative default prevents a single tool call from filling local storage. */
export const maxDownloadBytes = positiveIntegerEnv("TG_MAX_DOWNLOAD_BYTES", 100 * 1024 * 1024);

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing. Run \`pnpm run setup\` in a terminal; never pass it through MCP.`);
  return value;
}

export function loadConfig() {
  const apiId = Number(required("TG_API_ID"));
  if (!Number.isSafeInteger(apiId) || apiId <= 0) throw new Error("TG_API_ID must be a positive integer.");
  return {
    apiId,
    apiHash: required("TG_API_HASH"),
    ...tdlibDirectories(),
  };
}

export const LIMITS = { chats: 100, messages: 100, search: 100 } as const;
export function boundedLimit(value: number | undefined, fallback: number, max: number): number {
  return Math.min(Math.max(value ?? fallback, 1), max);
}
