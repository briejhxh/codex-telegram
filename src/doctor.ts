import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getTdjson } from "prebuilt-tdlib";
import { accountSettings, configuredAccountNames } from "./config.js";
import { Policy } from "./security/policy.js";

type Check = { name: string; status: "ok" | "warning" | "error" | "not_checked"; detail?: string };

async function writable(directory: string): Promise<Check> {
  try {
    await fs.mkdir(directory, { recursive: true });
    const probe = path.join(directory, `.codex-telegram-doctor-${process.pid}-${Date.now()}`);
    await fs.writeFile(probe, "", { flag: "wx" });
    await fs.unlink(probe);
    return { name: directory, status: "ok" };
  } catch {
    return { name: directory, status: "error", detail: "Directory is not writable by the current user." };
  }
}

async function configCheck(configFile: string, configured: boolean): Promise<Check> {
  try {
    const stat = await fs.stat(configFile);
    if (!stat.isFile()) return { name: "config", status: "error", detail: "Configuration path is not a file." };
    if (!configured) return { name: "config", status: "warning", detail: "Configuration exists but is missing API credentials." };
    return { name: "config", status: "ok" };
  } catch {
    return { name: "config", status: configured ? "warning" : "error", detail: configured ? "Credentials were supplied through the environment; no private config file was found." : "Run pnpm run setup to create private credentials." };
  }
}

async function accountReport(account: string) {
  const status = accountSettings(account);
  const configured = Boolean(status.environment.TG_API_ID?.trim() && status.environment.TG_API_HASH?.trim());
  const checks: Check[] = [
    { name: "node", status: Number(process.versions.node.split(".")[0]) >= 20 ? "ok" : "error", detail: `Node ${process.versions.node}` },
    { name: "platform", status: "ok", detail: `${process.platform} ${os.release()}` },
    await configCheck(status.configFile, configured),
    await writable(status.configDirectory),
    await writable(status.databaseDirectory),
    await writable(status.filesDirectory),
    await writable(status.downloadsDirectory),
    { name: "tdlib", status: getTdjson() ? "ok" : "error", detail: getTdjson() ? "Native TDLib library found." : "Native TDLib library was not found." },
    await fs.access(path.resolve("dist", "index.js")).then(() => ({ name: "mcp_build", status: "ok" as const, detail: "Built MCP entrypoint found." })).catch(() => ({ name: "mcp_build", status: "warning" as const, detail: "Run pnpm run build before starting dist/index.js." })),
    { name: "session_lock", status: "not_checked", detail: "Doctor does not open TDLib and therefore never competes for the session lock. Use telegram_health with check_connection=true." },
  ];
  const disk = await fs.statfs(status.configDirectory).catch(() => undefined);
  if (disk) checks.push({ name: "disk_space", status: disk.bavail * disk.bsize >= 100 * 1024 * 1024 ? "ok" : "warning", detail: `${Math.floor((disk.bavail * disk.bsize) / 1024 / 1024)} MiB available in the state filesystem.` });
  return { account, configured, policy_profile: new Policy(status.environment, account).profile, checks, ok: !checks.some((check) => check.status === "error") };
}

export async function doctorReport() {
  const accounts = configuredAccountNames();
  const profiles = await Promise.all(accounts.map(accountReport));
  return { tool: "codex-telegram doctor", mode: accounts.length === 1 ? "single-account" : "multi-account", account_selection: accounts.length === 1 ? "account is optional" : "MCP operations require an explicit account parameter.", profiles, ok: profiles.every((profile) => profile.ok) };
}

async function run() {
  const report = await doctorReport();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
