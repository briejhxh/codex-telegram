import { createInterface } from "node:readline/promises";
import { stdin, stderr } from "node:process";

export function consoleAuthorizer() {
  const io = createInterface({ input: stdin, output: stderr });
  const question = async (prompt: string) => io.question(prompt);
  return {
    type: "user" as const,
    getPhoneNumber: () => question("Telegram phone number (international format): "),
    getAuthCode: () => question("Telegram login code: "),
    getPassword: () => question("Telegram 2FA password: "),
    close: () => io.close(),
  };
}

/** Never let TDLib consume MCP's stdin. A saved session passes through without callbacks. */
export function mcpAuthorizer() {
  const unavailable = () => Promise.reject(new Error("Telegram is not authenticated. Run `npm run login` in a terminal, then restart Codex."));
  return {
    type: "user" as const,
    getPhoneNumber: unavailable,
    getAuthCode: unavailable,
    getPassword: unavailable,
    getEmailAddress: unavailable,
    getEmailCode: unavailable,
    getName: unavailable,
    confirmOnAnotherDevice: () => { throw new Error("Telegram is not authenticated. Run `npm run login` in a terminal, then restart Codex."); },
  };
}
