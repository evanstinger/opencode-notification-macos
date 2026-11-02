# Changelog

## 2.0.0

- Migrated to the OpenCode v2 plugin API (`@opencode/plugin`).
  - Entry point is now `Plugin.define({ id, setup(ctx) })` with a default export.
  - Events come from `ctx.event.subscribe`: `session.idle`, `session.execution.failed`, `permission.asked` (replaces v1 `session.idle`/`session.error`/`permission.updated`/`permission.asked` handlers).
  - The `question` notification now uses `ctx.tool.hook("execute.before")`.
  - Subagent completion detection uses `ctx.session.get({ sessionID })` and its `parentID`.
- Dropped the v1 todo check before the `complete` notification: v2 `session.idle` only fires when the session has finished model work and has no pending input, so the suppression is no longer needed.
- Config key in `opencode.jsonc` is `plugins` (was `plugin`).
- Config file format and CLI (`npx opencode-notification-macos config|list|preview|show|reset`) are unchanged.

## 1.0.3

- Initial v1 release.
