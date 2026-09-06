import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { configDirectory, configFile } from "./config.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const legacyFile = path.join(projectRoot, ".env");

const configExists = await fs.access(configFile).then(() => true, (error: NodeJS.ErrnoException) => {
  if (error.code === "ENOENT") return false;
  throw error;
});
if (configExists) throw new Error(`Refusing to overwrite existing local configuration: ${configFile}`);

const values = dotenv.parse(await fs.readFile(legacyFile, "utf8"));
const apiId = values.TG_API_ID?.trim() ?? "";
const apiHash = values.TG_API_HASH?.trim() ?? "";
if (!/^\d+$/.test(apiId) || Number(apiId) <= 0) throw new Error("Legacy .env does not contain a valid TG_API_ID.");
if (!/^[a-fA-F0-9]{32}$/.test(apiHash)) throw new Error("Legacy .env does not contain a valid TG_API_HASH.");

await fs.mkdir(configDirectory, { recursive: true });
await fs.writeFile(configFile, `TG_API_ID=${apiId}\nTG_API_HASH=${apiHash}\n`, { encoding: "utf8", mode: 0o600 });
if (process.platform !== "win32") await fs.chmod(configFile, 0o600);
console.error(`Migrated API credentials to ${configFile}. Run pnpm run login to create a private TDLib session there.`);
