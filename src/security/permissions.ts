/** MCP annotations are intentionally explicit so write operations are never presented as read-only. */
export const READ_ONLY = { readOnlyHint: true, destructiveHint: false } as const;
export const EXTERNAL_WRITE = { readOnlyHint: false, destructiveHint: false } as const;
