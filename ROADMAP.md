# Production roadmap

This document records the audit baseline for `0.2.0` and is deliberately more
specific than a feature wish-list. Items are ordered by account safety and
correctness, not by the number of MCP tools they add.

## Audit baseline

- The project is a small TypeScript/Node stdio MCP server backed by TDLib via
  `tdl`. It has 19 tools, a single implicit account, one process-local client,
  and five unit tests.
- Credentials and TDLib data default outside the clone, which is a good base.
  A legacy `.env` migration exists; clone-local dotenv loading is opt-in.
- Read and write tools are described as requiring confirmation, but this is
  currently a client-side instruction only. The MCP server itself has no
  permission policy, account boundary, approval token, rate limiter, or write
  allowlist.
- `telegram_send_file` accepts any readable local path. A model exposed to
  untrusted Telegram content can therefore be induced to exfiltrate a local
  file. Downloads reject lexical traversal and overwrite, but unknown-size
  downloads are not rejected and the response formatter returns untrusted text
  without a dedicated trust boundary.
- TDLib errors are passed through and logged verbatim. There is no central
  error taxonomy, bounded retry/backoff, FloodWait handling, request timeout,
  response budget, or process ownership lock beyond TDLib's database lock.
- The client mixes TDLib lifecycle, Telegram operations, formatting, file I/O,
  and policy-relevant checks. The current interface is nevertheless small
  enough to refactor incrementally.

## Priority 0 — account and data safety

1. **Server-side policy engine** — deny writes by default; provide composable
   profiles (`read-only`, `inbox`, `messaging`, `files`, `community-manager`,
   `admin`, `full-access`), per-account tool allow/deny lists, peer allowlists,
   file-size limits, and explicit destructive confirmation tokens. The policy
   must be evaluated inside each tool, never only stated in a skill.
2. **Safe file boundary** — restrict outbound files to explicitly configured
   allowed roots, resolve real paths, reject traversal/symlink escapes, enforce
   file size and regular-file checks, and avoid exposing arbitrary TDLib paths.
   Reject unknown-size downloads by default and create output files safely.
3. **Untrusted Telegram-content boundary** — normalize control/invisible
   characters, bound text/labels/titles, label returned Telegram fields as
   untrusted data, and document that message contents can never grant tool
   authority.
4. **Secret/privacy hygiene** — redact sensitive values from logs and mapped
   errors, harden configuration permissions where each OS supports it, and add
   automated secret-leak checks.

## Priority 1 — reliability and correctness

1. Split configuration, TDLib transport, error mapping, policy enforcement,
   file operations, and presentation into testable modules.
2. Add process ownership and account-scoped TDLib lifecycle diagnostics:
   bounded startup/shutdown, stale-lock advice, clear authorization states,
   network/temporary-failure classification, and no duplicate session use.
3. Add an idempotency-aware, bounded request controller. Reads may retry safe
   transient failures; writes must not blindly retry after an ambiguous result.
   Handle FloodWait with an explicit bounded wait policy.
4. Add real pagination metadata/cursors, response-size budgets, and cache only
   non-sensitive derived entities with a bounded local lifetime.
5. Support named, isolated accounts (`personal`, `work`, `test`) with separate
   config/session/files/policy. A default account remains ergonomic, while
   cross-account reads and writes remain impossible unless explicitly selected.

## Priority 2 — product, DX, and coverage

1. Add a small, coherent tool taxonomy: account/health, chats, messages,
   files, contacts, groups/channels, forums/topics, polls, and bots. Prefer
   action-oriented tools with bounded schemas over raw TDLib access.
2. Add high-value operations after policy enforcement: mark read, archive/mute,
   forward/copy, pin/unpin, scheduled messages, contacts, topic read/list, and
   limited group administration. Destructive administration stays opt-in.
3. Expand tests with a mock TDLib transport, policy tests, error/rate-limit
   tests, file-system adversarial tests, schema snapshots, and integration-test
   instructions using a disposable Telegram account.
4. Add linting, formatting, dependency audit, secret scan, and Linux/Windows
   CI; add macOS only when its TDLib runtime is covered by a release path.
5. Add a guided installer/doctor, clear Windows/Codex guidance, and
   `ARCHITECTURE.md`, `PERMISSIONS.md`, `TROUBLESHOOTING.md`, and
   `DEVELOPMENT.md`.

## Priority 3 — deliberately deferred

- Remote HTTP transport, telemetry, raw TDLib APIs, Stars/Gifts/Stories,
  autonomous mass messaging, and broad destructive administration. These add
  substantial account risk and should not precede P0/P1 controls.

## Competitive lessons

| Project | Useful idea to adopt | Deliberate difference |
| --- | --- | --- |
| `chigwell/telegram-mcp` | strict allowed roots and explicit treatment of Telegram fields as untrusted | retain TDLib and Codex-first local installation rather than Telethon/container-first operation |
| `tolboy/telegram-mcp-tdlib` | profiles, multi-account isolation, health/doctor UX, rate-limit controls | keep a smaller Node/TDLib surface and avoid an unauthenticated HTTP server by default |
| `jgalea/telegram-mcp` | daemon/session diagnosis and simple first-run flow | use policy-gated stdio tools rather than relying on a long-lived daemon alone |
| `TONresistor/telethon-mcp` | response profiles, cache, error/redaction discipline | do not expose a raw API escape hatch that bypasses policy |
| `Muhammadyunusxon/telegram-mcp` | peer allowlists and explicit destructive arguments | enforce policy server-side and use approval tokens instead of a bare boolean |

## Completion criteria for the next release

- A fresh installation defaults to read-only and cannot send a message or read
  an arbitrary local file without an explicit local policy.
- Every write is classified as low-risk, write, or destructive and evaluated by
  the same engine.
- Named account profiles are isolated on disk and in the MCP API.
- Tests cover the policy matrix, path/symlink cases, error mapping, retries,
  pagination, and untrusted-content normalization without a real login.
- The README and troubleshooting guide let a Windows Codex user diagnose a
  session conflict without inspecting TDLib files manually.
