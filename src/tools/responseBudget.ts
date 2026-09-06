const HARD_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const HARD_MAX_TEXT = 32_768;
const configured = (name: string, fallback: number, maximum: number) => {
  const value = Number(process.env[name] ?? fallback);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, maximum) : fallback;
};
const maxResponseBytes = () => configured("TG_MAX_RESPONSE_BYTES", 512 * 1024, HARD_MAX_RESPONSE_BYTES);
const maxText = () => configured("TG_MAX_RESPONSE_TEXT_CHARS", 8_192, HARD_MAX_TEXT);

function bound(value: unknown): unknown {
  const limit = maxText();
  if (typeof value === "string") return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
  if (Array.isArray(value)) return value.map(bound);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, bound(entry)]));
  return value;
}

/** Returns valid JSON within the MCP budget; identifiers remain intact. */
export function budgetResponse(value: unknown): unknown {
  const bounded = bound(value);
  const serialized = JSON.stringify(bounded);
  if (Buffer.byteLength(serialized, "utf8") <= maxResponseBytes()) return bounded;
  if (Array.isArray(bounded)) return { items: [], truncated: true, response_truncated: true, reason: "Response exceeded the local privacy and size budget." };
  return { response_truncated: true, reason: "Response exceeded the local privacy and size budget." };
}
