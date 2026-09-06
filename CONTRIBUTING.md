# Contributing

## Development setup

Use Node.js 20+ and pnpm. Run `pnpm install --frozen-lockfile`, then `pnpm run check` before opening a pull request.

Never commit `.env`, TDLib session/database files, downloaded media, login codes, phone numbers, or private Telegram messages. Tests must use fixtures only and must not connect to Telegram.

## Changes

- Keep MCP stdout protocol-only; diagnostics belong on stderr.
- Mark external-state tools as non-read-only and describe the action precisely.
- Preserve the confirmation requirement for sending messages/files and the callback-only restriction for bot buttons.
- Add or update unit tests for parsers, validation, and safety controls.
- Update the README and changelog when a user-visible behavior changes.

## Pull requests

Explain the behavior change, testing performed, and any Telegram/TDLib compatibility consideration. Do not attach unredacted account screenshots or logs.
