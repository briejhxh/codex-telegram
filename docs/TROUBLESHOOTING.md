# Troubleshooting

Run `telegram_health` first. It does not reveal credentials or messages and
reports the selected account, effective state paths, policy, and connection
state.

| Symptom | Meaning | Fix |
| --- | --- | --- |
| `not_configured` / `AUTH_REQUIRED` | API credentials or a session is missing | Run `pnpm run setup`, then `pnpm run login` in a real terminal; restart Codex. |
| `SESSION_LOCKED` | Another process has the TDLib database open | Stop manually launched `pnpm start`/`dev` instances and restart Codex. Do not delete TDLib files while a process may be running. |
| `WRITE_DISABLED` | The server remains safely read-only | Configure a deliberate local profile; see [PERMISSIONS.md](PERMISSIONS.md). |
| `PEER_NOT_ALLOWED` | The selected chat is outside `TG_ALLOWED_CHAT_IDS` | Add the exact chat ID locally after verifying the recipient. |
| `FILE_ROOT_REQUIRED` / `FILE_OUTSIDE_ALLOWED_ROOT` | Sending arbitrary local files is intentionally blocked | Configure `TG_FILE_ROOTS` and keep only intended attachments inside it. |
| `RATE_LIMITED` / `LOCAL_RATE_LIMITED` | Telegram or the local safety guard paused writes | Wait for the reported interval. Do not loop or retry ambiguous sends automatically. |
| `npm` is not recognized on Windows | Node.js is not installed globally | Install Node.js LTS, or use `scripts/run-with-codex-runtime.ps1` when the Codex bundled runtime is available. |

## Legacy clone-local configuration

Older checkouts may have a `.env` containing API credentials. This release does
not load it by default. Run `pnpm run migrate-legacy-config` once to copy only
API credentials to the private config file, then log in again. The migration
never overwrites an existing config.

## Safe recovery

If a TDLib session is corrupted or revoked, first revoke the session in
Telegram's **Devices** settings, then move the affected private TDLib directory
aside and run `pnpm run login` again. Do not upload the old database or include
it in an issue.
