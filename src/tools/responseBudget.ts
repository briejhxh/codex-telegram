const MAX_RESPONSE_BYTES = 512 * 1024;
const MAX_TEXT = 8_192;

function bound(value: unknown): unknown {
  if (typeof value === "string") return value.length <= MAX_TEXT ? value : `${value.slice(0, MAX_TEXT - 1)}…`;
  if (Array.isArray(value)) return value.map(bound);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, bound(entry)]));
  return value;
}

/** Returns valid JSON within the MCP budget; identifiers remain intact. */
export function budgetResponse(value: unknown): unknown {
  const bounded = bound(value);
  const serialized = JSON.stringify(bounded);
  if (Buffer.byteLength(serialized, "utf8") <= MAX_RESPONSE_BYTES) return bounded;
  if (Array.isArray(bounded)) return { items: [], truncated: true, response_truncated: true, reason: "Response exceeded the local privacy and size budget." };
  return { response_truncated: true, reason: "Response exceeded the local privacy and size budget." };
}
