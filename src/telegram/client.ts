import fs from "node:fs/promises";
import path from "node:path";
import { configure, createClient } from "tdl";
import { getTdjson } from "prebuilt-tdlib";
import { accountSettings, configurationStatus, downloadsDirectory, loadConfig, maxDownloadBytes, type AccountSettings } from "../config.js";
import { log } from "../utils/logger.js";
import { mcpAuthorizer } from "./auth.js";
import { contentType, fileFromMessage, formatDate, inlineButtonRows, inlineButtons, isOutgoingMessage, isStrictChildPath, messageText, num, obj, preview, safeDownloadFilename, senderId, str, untrustedText } from "./helpers.js";
import type { TdObject } from "./types.js";
import { mediaSearchFilter, type MediaKind } from "./media.js";
import { executeWithRetry, requestPolicy, withTimeout } from "./retry.js";
import { TelegramError, telegramError } from "./errors.js";

type ClientLike = {
  login(authorizer: unknown): Promise<void>;
  invoke(request: unknown): Promise<unknown>;
  close(): Promise<void>;
  on(event: "error", listener: (error: Error) => void): unknown;
};
type ClientFactory = (options: { apiId: number; apiHash: string; databaseDirectory: string; filesDirectory: string }) => ClientLike;

export class TelegramClient {
  private client?: ClientLike;
  private connecting?: Promise<void>;
  private readonly users = new Map<number, Promise<TdObject>>();
  private readonly settings: AccountSettings;
  private aborter = new AbortController();
  private closing = false;
  private readonly factory: ClientFactory;
  constructor(settings?: AccountSettings, factory: ClientFactory = (options) => createClient(options) as unknown as ClientLike) { this.settings = settings ?? accountSettings(process.env.TG_ACCOUNT ?? "default"); this.factory = factory; }

  async connect(authorizer?: unknown): Promise<void> {
    if (this.closing) throw new TelegramError("CANCELLED", "Telegram runtime is shutting down.");
    // Do not expose the client before TDLib authorization completes. MCP may
    // execute several read-only tools concurrently on the first request.
    if (this.connecting) return this.connecting;
    if (this.client) return;
    this.connecting = this.open(authorizer);
    try {
      await this.connecting;
    } catch (error) {
      this.client = undefined;
      const mapped = telegramError(error);
      if (mapped.code === "SESSION_LOCKED") throw new TelegramError("SESSION_LOCKED", `Telegram account '${this.settings.account}' is already being used by another codex-telegram process.`);
      throw mapped;
    } finally {
      this.connecting = undefined;
    }
  }

  private async open(authorizer?: unknown): Promise<void> {
    const config = loadConfig(this.settings);
    await Promise.all([fs.mkdir(config.databaseDirectory, { recursive: true }), fs.mkdir(config.filesDirectory, { recursive: true })]);
    configure({ tdjson: getTdjson(), verbosityLevel: 1 });
    const raw = this.factory({ apiId: config.apiId, apiHash: config.apiHash, databaseDirectory: config.databaseDirectory, filesDirectory: config.filesDirectory });
    raw.on("error", (error) => log.error("TDLib client error", error));
    this.client = raw;
    try {
      await withTimeout(raw.login(authorizer ?? mcpAuthorizer()), 15_000, "Timed out while opening TDLib. Another process may be using this Telegram session database.");
    } catch (error) {
      await withTimeout(raw.close(), 2_000, "Timed out while closing TDLib.").catch(() => undefined);
      this.client = undefined;
      throw error;
    }
    log.info("Telegram authenticated");
  }

  async close(): Promise<void> {
    this.closing = true; this.aborter.abort();
    const pending = this.connecting; if (pending) await withTimeout(pending.catch(() => undefined), 2_000, "Timed out while stopping TDLib.").catch(() => undefined);
    await withTimeout(this.client?.close() ?? Promise.resolve(), 2_000, "Timed out while stopping TDLib.").catch(() => undefined);
    this.client = undefined; this.connecting = undefined; this.users.clear();
  }
  private async invoke(request: TdObject): Promise<TdObject> {
    await this.connect();
    const method = str(request._) ?? "unknown";
    const policy = requestPolicy(method);
    try { return obj(await executeWithRetry(() => this.client!.invoke(request), { policy, signal: this.aborter.signal })); }
    catch (error) {
      const mapped = telegramError(error, policy.kind === "write" || policy.kind === "transfer");
      log.error("Telegram request failed", mapped);
      throw mapped;
    }
  }

  async getMe() { return this.invoke({ _: "getMe" }); }
  private getUserCached(userId: number): Promise<TdObject> {
    const existing = this.users.get(userId);
    if (existing) return existing;
    const request = this.invoke({ _: "getUser", user_id: userId }).catch((error) => {
      this.users.delete(userId);
      throw error;
    });
    this.users.set(userId, request);
    if (this.users.size > 500) this.users.delete(this.users.keys().next().value!);
    return request;
  }
  async health(checkConnection: boolean): Promise<Record<string, unknown>> {
    const status = configurationStatus();
    if (!status.configured || !checkConnection) return { ...status, connection: status.configured ? "not_checked" : "not_configured" };
    try {
      const me = await this.getMe();
      return { ...status, connection: "authenticated", account_id: num(me.id) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown Telegram error";
      const authentication = /not authenticated|authorization|login/i.test(message);
      const locked = /lock file|already in use|timed out while opening tdlib/i.test(message);
      return { ...status, connection: authentication ? "authentication_required" : locked ? "session_locked" : "unavailable", hint: authentication ? "Run pnpm run login in a terminal, then restart Codex." : locked ? "Close the other Codex or Telegram plugin process using this TDLib database, then restart Codex." : "Retry after checking the network and local TDLib state directory." };
    }
  }
  async getChat(chatId: number) { return this.invoke({ _: "getChat", chat_id: chatId }); }
  async pinnedMessage(chatId: number) { return this.invoke({ _: "getChatPinnedMessage", chat_id: chatId }); }
  async listChats(limit: number) {
    const result = await this.invoke({ _: "getChats", chat_list: { _: "chatListMain" }, limit });
    return Promise.all((Array.isArray(result.chat_ids) ? result.chat_ids : []).map((id) => this.getChat(Number(id))));
  }
  async searchChats(query: string, limit: number) {
    // TDLib's local chat search only sees already loaded dialogs. Load a bounded
    // part of the main list and supplement it with contacts/public usernames.
    try { await this.invoke({ _: "loadChats", chat_list: { _: "chatListMain" }, limit: 100 }); }
    catch { /* searchContacts/searchPublicChats remain available without main-list hydration */ }
    const optional = async (request: TdObject) => { try { return await this.invoke(request); } catch { return {}; } };
    const [local, contacts, publicChats] = await Promise.all([
      optional({ _: "searchChats", query, limit }),
      optional({ _: "searchContacts", query, limit }),
      optional({ _: "searchPublicChats", query, limit }),
    ]);
    const chatIds = new Set<number>((Array.isArray(local.chat_ids) ? local.chat_ids : []).map(Number));
    for (const id of Array.isArray(publicChats.chat_ids) ? publicChats.chat_ids : []) chatIds.add(Number(id));
    for (const userId of Array.isArray(contacts.user_ids) ? contacts.user_ids : []) {
      const chat = await optional({ _: "createPrivateChat", user_id: Number(userId), force: false });
      const chatId = num(chat.id); if (chatId) chatIds.add(chatId);
    }
    const username = query.replace(/^@/, "");
    if (/^[A-Za-z0-9_]{5,}$/.test(username)) {
      const chat = await optional({ _: "searchPublicChat", username });
      const chatId = num(chat.id); if (chatId) chatIds.add(chatId);
    }
    return Promise.all([...chatIds].slice(0, limit).map((id) => this.getChat(id)));
  }
  async messages(chatId: number, limit: number, fromMessageId?: number) {
    const messages = new Map<number, TdObject>();
    let cursor = fromMessageId ?? 0;
    let stalledRequests = 0;

    // TDLib may deliberately return fewer messages than requested (sometimes one)
    // while it fetches older history. Continue from the oldest received ID until the
    // requested bounded page is filled or TDLib has no more history to provide.
    for (let request = 0; request < limit * 2; request += 1) {
      const result = await this.invoke({
        _: "getChatHistory",
        chat_id: chatId,
        from_message_id: cursor,
        offset: 0,
        limit: Math.min(100, limit - messages.size + 1),
        only_local: false,
      });
      const batch = Array.isArray(result.messages) ? result.messages.map(obj) : [];
      if (batch.length === 0) break;

      let oldestId: number | undefined;
      let added = 0;
      for (const message of batch) {
        const id = num(message.id);
        if (!id) continue;
        oldestId = id;
        if (!messages.has(id)) { messages.set(id, message); added += 1; }
      }
      if (!oldestId || messages.size >= limit) break;
      cursor = oldestId;
      stalledRequests = added === 0 ? stalledRequests + 1 : 0;
      if (stalledRequests >= 2) break;
    }

    return [...messages.values()].slice(0, limit);
  }
  async searchMessages(query: string, limit: number, chatId?: number) {
    const result = chatId
      ? await this.invoke({ _: "searchChatMessages", chat_id: chatId, query, sender_id: null, from_message_id: 0, offset: 0, limit, filter: { _: "searchMessagesFilterEmpty" }, message_thread_id: 0, saved_messages_topic_id: 0 })
      : await this.invoke({ _: "searchMessages", chat_list: { _: "chatListMain" }, query, offset_date: 0, offset_chat_id: 0, offset_message_id: 0, limit, filter: { _: "searchMessagesFilterEmpty" }, min_date: 0, max_date: 0 });
    return Array.isArray(result.messages) ? result.messages.map(obj) : [];
  }
  async searchMedia(chatId: number, kind: MediaKind, limit: number, query = "") {
    const result = await this.invoke({ _: "searchChatMessages", chat_id: chatId, query, sender_id: null, from_message_id: 0, offset: 0, limit, filter: mediaSearchFilter(kind), message_thread_id: 0, saved_messages_topic_id: 0 });
    return Array.isArray(result.messages) ? result.messages.map(obj) : [];
  }
  async getInlineButtons(chatId: number, messageId: number) {
    const message = await this.invoke({ _: "getMessage", chat_id: chatId, message_id: messageId });
    return { chat_id: chatId, message_id: messageId, buttons: inlineButtons(message) };
  }
  async clickInlineButton(chatId: number, messageId: number, row: number, column: number) {
    const message = await this.invoke({ _: "getMessage", chat_id: chatId, message_id: messageId });
    const rows = inlineButtonRows(message);
    const button = rows[row]?.[column] ?? {};
    const type = obj(button.type);
    if (str(type._) !== "inlineKeyboardButtonTypeCallback") {
      throw new Error("Only callback buttons can be clicked by this tool. URL, login, web-app, game, password, and payment buttons are intentionally blocked.");
    }
    const data = str(type.data);
    if (data === undefined) throw new Error("The selected callback button has no data payload.");
    const answer = await this.invoke({ _: "getCallbackQueryAnswer", chat_id: chatId, message_id: messageId, payload: { _: "callbackQueryPayloadData", data } });
    return { clicked: { row, column, text: str(button.text) }, answer: { text: str(answer.text), show_alert: answer.show_alert === true, url: str(answer.url) } };
  }
  async reactToMessage(chatId: number, messageId: number, emoji: string, remove: boolean) {
    await this.invoke({ _: "setMessageReaction", chat_id: chatId, message_id: messageId, reaction_type: remove ? null : { _: "reactionTypeEmoji", emoji }, is_big: false, update_recent_reactions: true });
    return { chat_id: chatId, message_id: messageId, emoji, removed: remove };
  }
  private async requireOwnMessage(chatId: number, messageId: number): Promise<TdObject> {
    const message = await this.invoke({ _: "getMessage", chat_id: chatId, message_id: messageId });
    if (!isOutgoingMessage(message)) throw new Error("Only messages sent by the authenticated account can be changed or deleted.");
    return message;
  }
  async editOwnMessage(chatId: number, messageId: number, text: string) {
    await this.requireOwnMessage(chatId, messageId);
    return this.invoke({ _: "editMessageText", chat_id: chatId, message_id: messageId, reply_markup: null, input_message_content: { _: "inputMessageText", text: { _: "formattedText", text, entities: [] }, link_preview_options: null, clear_draft: false } });
  }
  async deleteOwnMessage(chatId: number, messageId: number) {
    await this.requireOwnMessage(chatId, messageId);
    await this.invoke({ _: "deleteMessages", chat_id: chatId, message_ids: [messageId], revoke: true });
    return { chat_id: chatId, message_id: messageId, deleted: true, revoked_for_all: true };
  }
  async sendMessage(chatId: number, text: string, replyToMessageId?: number) {
    return this.invoke({ _: "sendMessage", chat_id: chatId, reply_to: replyToMessageId ? { _: "inputMessageReplyToMessage", message_id: replyToMessageId } : null, options: null, reply_markup: null, input_message_content: { _: "inputMessageText", text: { _: "formattedText", text, entities: [] }, link_preview_options: null, clear_draft: false } });
  }
  async sendFile(chatId: number, filePath: string, caption?: string) {
    const absolute = path.resolve(filePath); await fs.access(absolute);
    return this.invoke({ _: "sendMessage", chat_id: chatId, reply_to: null, options: null, reply_markup: null, input_message_content: { _: "inputMessageDocument", document: { _: "inputFileLocal", path: absolute }, thumbnail: null, disable_content_type_detection: false, caption: { _: "formattedText", text: caption ?? "", entities: [] } } });
  }
  async downloadFile(chatId: number, messageId: number, destination?: string) {
    const message = obj(await this.invoke({ _: "getMessage", chat_id: chatId, message_id: messageId }));
    const metadata = fileFromMessage(message); if (!metadata?.telegram_file_id) throw new Error("The selected message does not contain a downloadable file.");
    if (!metadata.size || metadata.size <= 0) throw new Error("The selected file has no known size and is rejected by the local download safety policy.");
    if (metadata.size > maxDownloadBytes) throw new Error(`The selected file exceeds the configured download limit of ${maxDownloadBytes} bytes.`);
    const downloaded = await this.invoke({ _: "downloadFile", file_id: metadata.telegram_file_id, priority: 1, offset: 0, limit: 0, synchronous: true });
    const source = str(obj(downloaded.local).path); if (!source) throw new Error("TDLib did not provide a downloaded file path.");
    if (!destination) return { ...metadata, local_path: source };
    const target = path.resolve(downloadsDirectory, safeDownloadFilename(destination));
    if (!isStrictChildPath(downloadsDirectory, target)) throw new Error("destination is outside the configured downloads directory.");
    await fs.mkdir(downloadsDirectory, { recursive: true });
    await fs.copyFile(source, target, fs.constants.COPYFILE_EXCL);
    return { ...metadata, local_path: target };
  }
  async displayChat(chat: TdObject) {
    const type = obj(chat.type); const kind = str(type._)?.replace(/^chatType/, "").toLowerCase() ?? "unknown";
    const userId = num(type.user_id);
    let firstName: string | undefined;
    let lastName: string | undefined;
    let username: string | undefined;
    if (userId) {
      try {
        const user = await this.getUserCached(userId);
        firstName = str(user.first_name);
        lastName = str(user.last_name);
        const usernames = obj(user.usernames);
        username = str(usernames.editable_username) ?? str((Array.isArray(usernames.active_usernames) ? usernames.active_usernames[0] : undefined));
      } catch { /* a chat result remains useful if a profile cannot be resolved */ }
    }
    return { untrusted_telegram_data: true, chat_id: num(chat.id), type: kind, user_id: userId, title: untrustedText(str(chat.title), 256), first_name: untrustedText(firstName, 128), last_name: untrustedText(lastName, 128), username: untrustedText(username, 128), unread_count: num(chat.unread_count) ?? 0, last_message_preview: chat.last_message ? preview(messageText(obj(chat.last_message))) : undefined, last_message_date: chat.last_message ? formatDate(obj(chat.last_message).date) : undefined };
  }
  async displayMessage(message: TdObject) {
    const id = senderId(message); let senderName: string | undefined; let username: string | undefined;
    if (id && obj(message.sender_id).user_id) { try { const user = await this.getUserCached(id); senderName = [str(user.first_name), str(user.last_name)].filter(Boolean).join(" ") || undefined; const names = obj(user.usernames); username = str(names.editable_username) ?? str((Array.isArray(names.active_usernames) ? names.active_usernames[0] : undefined)); } catch { /* message remains useful without lookup */ } }
    const reply = obj(message.reply_to); return { untrusted_telegram_data: true, message_id: num(message.id), chat_id: num(message.chat_id), sender_id: id, sender_name: untrustedText(senderName, 256), username: untrustedText(username, 128), date: formatDate(message.date), text: messageText(message), reply_to_message_id: num(reply.message_id), is_outgoing: message.is_outgoing === true, content_type: contentType(message), inline_buttons: inlineButtons(message), file: fileFromMessage(message) };
  }
}
