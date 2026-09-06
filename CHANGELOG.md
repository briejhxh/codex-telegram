# Changelog

All notable changes are documented here.

## 0.2.0

- Added a safe local health diagnostic for configuration, authorization, and TDLib connection issues.
- Added chat resolution with exact-match hints and reading of a chat's pinned message.
- Added guarded editing and deletion of messages sent by the authenticated account only.
- Made clone-local `.env` loading opt-in, preventing legacy development state from silently overriding the private user configuration.
- Added an explicit, non-overwriting command to migrate API credentials out of a legacy clone-local `.env`.
- Expanded English and Russian documentation for the new tools.

## 0.1.0

- Initial public release.
- Local TDLib-backed MCP server for personal Telegram accounts.
- Read/search tools, guarded message/file writes, media download, and safe callback-button support.
- Search a chat by media type and add or remove explicitly approved emoji reactions.
