# Architecture

`codex-telegram` is a local stdio MCP server. It has no hosted backend and
connects directly to Telegram through TDLib.

```text
Codex host ── stdio JSON-RPC ── MCP tool ── Policy ── Telegram service ── TDLib ── Telegram
                                      │             │
                                      │             └── formatting / safe file operations
                                      └── local account configuration and limits
```

## Process boundaries

- **Setup and login** are interactive terminal commands. They alone may read a
  phone number, authentication code, or 2FA password; MCP stdin is never used
  for authorization.
- **The MCP server** receives structured tool arguments over stdio. Stdout is
  reserved for JSON-RPC; diagnostics use stderr.
- **TDLib** owns the Telegram session/database. A session must be opened by one
  process at a time; `telegram_health` detects and explains common conflicts.

## Modules

- `src/config.ts` resolves private per-account state and bounded configuration.
- `src/security/policy.ts` is the authoritative server-side permission gate;
  `rateLimit.ts` prevents rapid repeated writes and `errors.ts` maps safe public
  errors.
- `src/tools/` defines narrow MCP schemas and invokes policy before any write.
- `src/telegram/service.ts` is the narrow domain boundary used by MCP tools;
  `client.ts` is its TDLib implementation and `fakeService.ts` is a deterministic
  in-memory test implementation. `errors.ts`, `retry.ts`, and `pagination.ts`
  centralize safe failures, bounded retry/timeout behaviour, and cursors.
- `src/telegram/helpers.ts` formats data, bounds untrusted strings, and applies
  cross-platform file-name checks.

## Account isolation

Each server process has one selected account. `TG_ACCOUNT=work` selects a
private account-specific directory; register another MCP server for
`TG_ACCOUNT=personal`. A process never silently changes accounts or fans a
request out to all accounts.

## Trust model

Telegram messages, names, titles, captions, file names, and inline labels are
external data. They cannot authorize a tool call. The tool response marks them
as `untrusted_telegram_data`, normalizes invisible control/directional
characters, and applies bounded output. Policy still makes the final decision.

## Retry and idempotency

Read-like TDLib requests receive bounded exponential retry with jitter. A
FloodWait longer than the policy ceiling is returned with `retry_after` rather
than retried early. Writes and transfers are never automatically replayed. If a
write times out or the network fails after Telegram may have accepted it, the
server returns `WRITE_OUTCOME_UNKNOWN`; callers must inspect the chat before
deciding whether to send again.

## Pagination

Bounded collection responses use `items`, `has_more`, `next_cursor`, and
`truncated`. Cursors are opaque, versioned, and bound to the specific chat;
malformed or cross-chat cursors fail safely instead of changing the requested
scope.
