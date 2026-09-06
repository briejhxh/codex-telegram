# Development

Use Node.js 20+ and pnpm 11.19.0.

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm run check
```

`pnpm run check` runs type checking, deterministic unit tests, a production
build, and plugin-manifest validation. Tests must not access a real Telegram
account. Use an isolated test account only for manual integration checks.

## Test layers

1. **Unit tests** cover formatters, file-name/path boundaries, policy profiles,
   peer restrictions, destructive approval, and local rate limits.
2. **MCP contract smoke tests** should start `dist/index.js` with stdio and
   inspect `tools/list`; do not call Telegram write tools.
3. **Manual integration tests** use a disposable account and Saved Messages:
   login, health, one read operation, then an explicitly approved write.

## Change rules

- Add a server-side policy check before every new non-read tool.
- Preserve stdio protocol cleanliness; no `console.log` in runtime code.
- Treat every Telegram-owned string as untrusted external data.
- Never add a raw TDLib escape hatch, automatic mass messaging, or an
  unrestricted local file path.
- Update `ROADMAP.md`, permissions documentation, and tests when public safety
  behavior changes.
