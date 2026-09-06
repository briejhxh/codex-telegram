import assert from "node:assert/strict";
import fs from "node:fs";

const readJson = (file) => JSON.parse(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
const manifest = readJson(".codex-plugin/plugin.json");
const mcp = readJson(".mcp.json");

assert.match(manifest.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, "plugin name must be kebab-case");
assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "plugin version must be strict semver");
assert.equal(manifest.mcpServers, "./.mcp.json");
assert.ok(fs.existsSync(new URL("../skills/telegram/SKILL.md", import.meta.url)), "Telegram skill is missing");

const server = mcp.mcpServers?.telegram;
assert.equal(server?.command, "node", "public plugin must use Node from PATH");
assert.deepEqual(server?.args, ["dist/index.js"]);
assert.equal(server?.cwd, ".");
console.log("Plugin manifest validation passed.");
