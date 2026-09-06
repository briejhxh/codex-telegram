# Privacy

This plugin connects directly from the user's computer to Telegram through TDLib. It does not operate a hosted relay, telemetry endpoint, analytics service, or backend controlled by this project.

## Stored locally

- Telegram API ID and hash, in the user-owned configuration file created by `pnpm run setup`.
- TDLib authorization/session database and cache.
- Files explicitly downloaded with `telegram_download_file`.

By default these are stored outside the Git clone. The user can choose another local directory using the documented environment variables.

## Data used by Codex

The MCP server returns the result of the tool requested by Codex. That result becomes part of the active Codex task, subject to the user's Codex product settings. Limit requests to the data needed for the task.

## Data not collected by this project

The plugin does not collect telemetry, send credentials to a project-owned server, sell data, or use message contents for advertising.

## User controls

Delete the user-owned configuration and TDLib state directory to remove local credentials and cached session data. Revoking active sessions in Telegram's Devices settings invalidates the local session.
