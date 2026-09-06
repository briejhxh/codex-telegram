import fs from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stderr } from "node:process";
import { configDirectory, configFile } from "./config.js";

const io = createInterface({ input: stdin, output: stderr });

try {
  const apiId = (await io.question("Telegram API ID (from https://my.telegram.org): ")).trim();
  const apiHash = (await io.question("Telegram API hash: ")).trim();
  if (!/^\d+$/.test(apiId) || Number(apiId) <= 0) throw new Error("Telegram API ID must be a positive integer.");
  if (!/^[a-fA-F0-9]{32}$/.test(apiHash)) throw new Error("Telegram API hash must contain exactly 32 hexadecimal characters.");

  await fs.mkdir(configDirectory, { recursive: true });
  await fs.writeFile(configFile, `TG_API_ID=${apiId}\nTG_API_HASH=${apiHash}\n`, { encoding: "utf8", mode: 0o600 });
  if (process.platform !== "win32") await fs.chmod(configFile, 0o600);
  console.error(`Saved local configuration to ${configFile}`);
  console.error("Next run: pnpm run login");
} finally {
  io.close();
}
