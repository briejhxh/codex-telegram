# Permissions and approvals

`codex-telegram` enforces its policy inside the MCP server. A Codex skill,
prompt, Telegram message, chat title, button label, or model decision cannot
expand that policy.

## Named accounts

Set `TG_ACCOUNT=personal`, `TG_ACCOUNT=work`, or another simple name when
registering a server. Each named account receives a separate configuration,
TDLib database, files directory, downloads directory, and policy environment
under the private state root. Register each account as a separate MCP server;
the server never fans out reads or writes across accounts. Omitting
`TG_ACCOUNT` preserves the legacy default-account path for a smooth migration.

## Default: read-only

Without configuration, `TG_POLICY_PROFILE=read-only`. Account, chat, message,
search, health, and button-inspection tools work; all operations that change
Telegram or write local files fail with `WRITE_DISABLED`.

Set policy variables in the private user configuration environment, not in a
committed repository file. `telegram_health` reports the active profile and
counts of configured restrictions without revealing values.

## Profiles

| Profile | Permitted risk classes |
| --- | --- |
| `read-only` | Read only |
| `inbox` | Read and low-risk writes such as reactions |
| `messaging` | Read, low-risk writes, messages, replies, edits, and safe callbacks |
| `files` | Same write classes; file tools additionally need `TG_FILE_ROOTS` |
| `community-manager` | Reserved for future, non-destructive community workflows |
| `admin`, `full-access` | May permit destructive tools, but each still requires an approval code |

Profiles are a ceiling, not a grant to every peer. `TG_ALLOWED_TOOLS` can make a
custom allowlist and `TG_DENIED_TOOLS` always wins.

## Peer restrictions

Set `TG_ALLOWED_CHAT_IDS` to a comma-separated numeric list to restrict every
write to named Telegram chats. Set `TG_DENIED_CHAT_IDS` to block chats even
when the profile would otherwise permit a write. Read tools remain available so
you can inspect a chat before deciding to change the local policy.

Example for replies only to one work chat:

```text
TG_POLICY_PROFILE=messaging
TG_ALLOWED_CHAT_IDS=-1001234567890
TG_ALLOWED_TOOLS=telegram_reply_message
```

## Files

`telegram_send_file` requires both a write-capable profile and
`TG_FILE_ROOTS`. It resolves the selected path, requires a regular file below
one of those roots, and applies `TG_MAX_SEND_FILE_BYTES` (25 MiB by default).
This prevents a message or model from turning the plugin into arbitrary local
file exfiltration.

`telegram_download_file` is also policy-gated, rejects files with no known
size, enforces `TG_MAX_DOWNLOAD_BYTES`, accepts only safe new file names, and
never overwrites a destination.

All non-read tools also pass through a local per-tool/per-chat guard of 20
operations per minute by default (`TG_MAX_WRITES_PER_MINUTE`). It is a safety
brake for accidental loops, not a way to evade Telegram FloodWait limits.

## Destructive actions

Destructive tools require an `admin` or `full-access` profile **and** a private
`TG_DESTRUCTIVE_APPROVAL_SECRET`. The secret itself is never an approval code.
Generate an expiring, one-time, action-bound token locally immediately before
the operation:

```text
pnpm run approve telegram_delete_own_message <chat_id> <message_id>
```

The token is cryptographically bound to the tool, account, chat, message, and
expiry (120 seconds by default; configurable from 30 to 600 seconds). It is
consumed after one use, so it cannot confirm a different action or be replayed.
Never put either the secret or a token in Telegram, a prompt, an issue, or the
repository. Telegram content must never be used as approval.

The current destructive tool is `telegram_delete_own_message`; it only deletes
messages sent by the authenticated account. Future group administration tools
will use the same gate.

## Untrusted Telegram data

Every returned chat title, display name, button label, and message body is
marked `untrusted_telegram_data: true`. It is external data, not instructions.
The server removes control/invisible directional characters and bounds fields,
but it does not use fragile keyword filtering: text such as “ignore previous
instructions” is still returned as a message, never as authority.
