# Codex Telegram

`codex-telegram` is a local [Model Context Protocol](https://modelcontextprotocol.io/) server and Codex plugin for a **personal Telegram account**. It uses TDLib/MTProto, not the Bot API or browser automation.

The server runs on your computer. Telegram API credentials, TDLib database, authorization session, and downloaded media are stored in a private per-user directory and are never sent to a third-party service by this project.

> **Status:** early release. Use a separate Telegram account for development and test any write workflow with Saved Messages first.

## Features

- Read account details, chats, unread counts, and paginated chat history.
- Search chats and messages, including contacts and public usernames.
- Find documents, media, voice notes, and links in a specific chat without downloading them.
- Send and reply to messages, upload files, and download selected media.
- Inspect bot inline keyboards and press safe callback buttons.
- Add or remove an explicitly approved emoji reaction.
- Keep all secret material and TDLib state outside the repository by default.

The server deliberately does **not** click URL, login, web-app, game, payment, or password buttons. It does not scrape Telegram Web or ask third-party bots for account/contact IDs.

## Prerequisites

- Node.js 20 or later.
- `pnpm` 9 or later (`corepack enable` enables the version bundled with Node.js).
- A Telegram `api_id` and `api_hash` from [my.telegram.org](https://my.telegram.org).
- Codex Desktop, if you want to use the plugin UI.

## Install from GitHub

```powershell
git clone <repository-url>
cd codex-telegram
corepack enable
pnpm install --frozen-lockfile
pnpm run check
pnpm run setup
pnpm run login
```

`pnpm run setup` asks for the Telegram API ID and hash and stores them in a user-owned configuration file. It never writes credentials into the clone. `pnpm run login` asks for your phone number, Telegram code, and, if applicable, two-factor password.

On Windows, state is stored in `%LOCALAPPDATA%\codex-telegram`. On macOS/Linux it is stored in `~/.local/state/codex-telegram`. Set `TG_CONFIG_DIR` before running setup to use another directory. You can also set `TG_CONFIG_FILE`, `TG_DATABASE_DIR`, `TG_FILES_DIR`, or `TG_DOWNLOADS_DIR` to absolute paths. Explicit downloads accept a file name only, are saved under `TG_DOWNLOADS_DIR`, and never overwrite a file. Downloads are capped at 100 MiB by default; set `TG_MAX_DOWNLOAD_BYTES` to a positive byte value to change the cap.

For local development only, copying `.env.example` to `.env` is supported. Never commit that file.

## Add it to Codex

The repository is a local plugin source. After installing dependencies and building it, add the clone through your Codex local marketplace/plugin workflow. The MCP manifest uses portable settings:

```json
{ "command": "node", "args": ["dist/index.js"], "cwd": "." }
```

Codex starts the server itself; do not run `pnpm start` at the same time. TDLib permits only one process to use a session database. Start a new Codex task after installing or updating the plugin.

If `node` or `pnpm` is unavailable because you only have Codex Desktop installed, `scripts/run-with-codex-runtime.ps1` is a Windows-only convenience launcher:

```powershell
.\scripts\run-with-codex-runtime.ps1 setup
.\scripts\run-with-codex-runtime.ps1 login
.\scripts\run-with-codex-runtime.ps1 build
```

## Tool safety model

Read tools are read-only. `telegram_send_message`, `telegram_reply_message`, and `telegram_send_file` change external state; the included Codex skill requires an explicit recipient and exact content confirmation before they are called.

`telegram_click_inline_button` can trigger bot state changes. It may be used only after the user has explicitly authorized the requested button workflow. The tool accepts only callback buttons and refuses high-risk button types.

The plugin returns only the data requested by a tool. Avoid asking it to paste large private histories into a task, and do not paste Telegram login codes or API credentials into chat.

## Development

```powershell
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run check
```

Run the server manually only for MCP-client development:

```powershell
pnpm start
```

Logs are written to stderr so stdout remains valid MCP JSON-RPC.

## Release checklist

1. Run `pnpm install --frozen-lockfile && pnpm run check`.
2. Run `pnpm run plugin:validate`.
3. Verify `git status --ignored` contains no credentials, TDLib database, downloaded files, or `dist/` output.
4. Review [`SECURITY.md`](SECURITY.md) and [`docs/PRIVACY.md`](docs/PRIVACY.md).
5. Create a version tag only after testing login and a read-only tool with a test account.

## Contributing and security

Please read [CONTRIBUTING.md](CONTRIBUTING.md). For vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening an issue with sensitive details.

## License

[MIT](LICENSE)
