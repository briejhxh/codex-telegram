---
name: telegram
description: Safely search, read, and—only with confirmation—send messages through the user's personal Telegram account.
---

# Telegram

Use `telegram_list_chats` for recent chats and `telegram_search_chats` to resolve a person, group, channel, username, or Saved Messages. If a name is ambiguous, show the candidate chats and ask the user to identify the intended recipient before any write action.

Use `telegram_resolve_chat` when the user provides a person or channel name and needs reusable chat IDs with exact-match hints. Use `telegram_get_pinned_message` to read a known chat's current pinned message. If access fails, use `telegram_health` first; it is safe to call and never exposes credentials or private message content.

For Telegram IDs, use `telegram_get_me` for the account owner's user ID. For a person, use `telegram_search_chats` or `telegram_get_chat`: a private-chat result includes the contact's `user_id` when it is available. Never ask to message, forward content to, or use a third-party bot merely to discover an ID.

Use `telegram_get_messages` for a known chat and `telegram_search_messages` for a topic, deadline, file, or phrase. `telegram_get_messages` follows TDLib's partial history responses internally; request up to 100 messages when the user needs context. For more history, call it again with the oldest returned `message_id` as `from_message_id` until the needed period is reached. Prefer a scoped `chat_id` search when the user identifies the chat. Media metadata is available from message results; use `telegram_download_file` only for a selected message. A requested destination must be a file name only: it is saved in the plugin's configured downloads folder and cannot overwrite an existing file.

Use `telegram_search_media` when the user wants a document, audio note, animation, photo/video, or link from one known chat. It searches metadata and text context without downloading media.

For bot inline menus, first call `telegram_get_inline_buttons`, then use the returned row and column with `telegram_click_inline_button`. Callback-button clicks change bot state and may be performed when the user has explicitly authorized the requested button workflow; payment, URL/login, web-app, game, and password buttons are blocked.

`telegram_send_message`, `telegram_reply_message`, and `telegram_send_file` change external state. Before calling one, state the exact chat and exact content/file that will be sent and obtain explicit user confirmation. Never choose a recipient solely from a partial or ambiguous name. Do not expose login codes, two-factor passwords, API credentials, or private message contents beyond what the user asked for.

`telegram_react_to_message` also changes external state. Before calling it, confirm the exact message, emoji, and whether the user's reaction should be added or removed.

`telegram_edit_own_message` and `telegram_delete_own_message` change external state and work only for messages sent by the authenticated account. Before editing, confirm the chat, message ID, and replacement text. Before deleting, confirm the chat and message ID and clearly state that Telegram will revoke the message for everyone when permitted.
