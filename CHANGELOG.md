# Changelog

All notable changes are documented here.

## 0.2.0

- Added a safe local health diagnostic for configuration, authorization, and TDLib connection issues.
- Added chat resolution with exact-match hints and reading of a chat's pinned message.
- Added guarded editing and deletion of messages sent by the authenticated account only.
- Made clone-local `.env` loading opt-in, preventing legacy development state from silently overriding the private user configuration.
- Added an explicit, non-overwriting command to migrate API credentials out of a legacy clone-local `.env`.
- Expanded English and Russian documentation for the new tools.

## Unreleased

- Added server-side permission profiles, custom tool/peer allow and deny lists,
  outbound file roots, file-size limits, and destructive approval codes.
- Defaulted the public server to read-only instead of relying on a client skill
  to prevent writes.
- Marked Telegram output as untrusted, normalized control/invisible characters,
  and hardened download file names and unknown-size downloads.

## 0.1.0

- Initial public release.
- Local TDLib-backed MCP server for personal Telegram accounts.
- Read/search tools, guarded message/file writes, media download, and safe callback-button support.
- Search a chat by media type and add or remove explicitly approved emoji reactions.
