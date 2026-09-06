import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getTdjson } from "prebuilt-tdlib";
import { configurationStatus } from "./config.js";

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

async function run() {
  const status = configurationStatus();
  const checks: Check[] = [
    { name: "node", status: Number(process.versions.node.split(".")[0]) >= 20 ? "ok" : "error", detail: `Node ${process.versions.node}` },
    { name: "platform", status: "ok", detail: `${process.platform} ${os.release()}` },
    await configCheck(status.config_file, status.configured),
    await writable(status.state_directory),
    await writable(status.database_directory),
    await writable(status.files_directory),
    await writable(status.downloads_directory),
    { name: "tdlib", status: getTdjson() ? "ok" : "error", detail: getTdjson() ? "Native TDLib library found." : "Native TDLib library was not found." },
    await fs.access(path.resolve("dist", "index.js")).then(() => ({ name: "mcp_build", status: "ok" as const, detail: "Built MCP entrypoint found." })).catch(() => ({ name: "mcp_build", status: "warning" as const, detail: "Run pnpm run build before starting dist/index.js." })),
    { name: "session_lock", status: "not_checked", detail: "Doctor does not open TDLib and therefore never competes for the session lock. Use telegram_health with check_connection=true." },
  ];
  const disk = await fs.statfs(status.state_directory).catch(() => undefined);
  if (disk) checks.push({ name: "disk_space", status: disk.bavail * disk.bsize >= 100 * 1024 * 1024 ? "ok" : "warning", detail: `${Math.floor((disk.bavail * disk.bsize) / 1024 / 1024)} MiB available in the state filesystem.` });
  const report = { tool: "codex-telegram doctor", account: status.account, checks, ok: !checks.some((check) => check.status === "error") };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

await run();
