import type { TelegramService, ChatDisplay } from "./service.js";
import type { TdObject } from "./types.js";
import type { MediaKind } from "./media.js";
import { contentType, inlineButtons, messageText, num, obj, senderId, str } from "./helpers.js";
import { TelegramError } from "./errors.js";

type FakeOptions = { me?: TdObject; chats?: TdObject[]; messages?: TdObject[]; delayMs?: number };

/** Deterministic domain fake for tests; it deliberately does not mimic TDLib transport objects. */
export class FakeTelegramService implements TelegramService {
  readonly sent: TdObject[] = [];
  readonly downloads: Array<{ chatId: number; messageId: number; destination?: string }> = [];
  private readonly chatMap = new Map<number, TdObject>();
  private readonly messageMap = new Map<number, TdObject[]>();
  private nextError?: Error;
  private readonly me: TdObject;
  private readonly delayMs: number;

  constructor(options: FakeOptions = {}) {
    this.me = options.me ?? { id: 1, first_name: "Test", usernames: { editable_username: "test" } };
    this.delayMs = options.delayMs ?? 0;
    for (const chat of options.chats ?? []) this.chatMap.set(num(chat.id) ?? 0, chat);
    for (const message of options.messages ?? []) {
      const chatId = num(message.chat_id) ?? 0;
      this.messageMap.set(chatId, [...(this.messageMap.get(chatId) ?? []), message]);
    }
  }

  failNext(error: Error) { this.nextError = error; }
  private async before() {
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    const failure = this.nextError; this.nextError = undefined;
    if (failure) throw failure;
  }
  private chat(chatId: number): TdObject {
    const chat = this.chatMap.get(chatId);
    if (!chat) throw new TelegramError("CHAT_NOT_FOUND", "Telegram could not find that chat for the selected account.");
    return chat;
  }
  private message(chatId: number, messageId: number): TdObject {
    const message = (this.messageMap.get(chatId) ?? []).find((item) => num(item.id) === messageId);
    if (!message) throw new TelegramError("MESSAGE_NOT_FOUND", "Telegram could not find that message for the selected account.");
    return message;
  }
  async getMe() { await this.before(); return this.me; }
  async getChat(chatId: number) { await this.before(); return this.chat(chatId); }
  async listChats(limit: number) { await this.before(); return [...this.chatMap.values()].slice(0, limit); }
  async searchChats(query: string, limit: number) { await this.before(); const needle = query.toLocaleLowerCase(); return [...this.chatMap.values()].filter((chat) => str(chat.title)?.toLocaleLowerCase().includes(needle)).slice(0, limit); }
  async messages(chatId: number, limit: number, fromMessageId?: number) { await this.before(); const items = this.messageMap.get(chatId) ?? []; const start = fromMessageId ? Math.max(0, items.findIndex((item) => num(item.id) === fromMessageId) + 1) : 0; return items.slice(start, start + limit); }
  async searchMessages(query: string, limit: number, chatId?: number) { await this.before(); const needle = query.toLocaleLowerCase(); const source = chatId === undefined ? [...this.messageMap.values()].flat() : this.messageMap.get(chatId) ?? []; return source.filter((message) => messageText(message)?.toLocaleLowerCase().includes(needle)).slice(0, limit); }
  async searchMedia(chatId: number, kind: MediaKind, limit: number, query = "") {
    await this.before();
    return (this.messageMap.get(chatId) ?? [])
      .filter((message) => kind === "url" ? /https?:\/\//.test(messageText(message) ?? "") : contentType(message) === kind || (kind === "photo" && contentType(message) === "video"))
      .filter((message) => !query || (messageText(message) ?? "").includes(query))
      .slice(0, limit);
  }
  async health() { await this.before(); return { configured: true, connection: "authenticated", fake: true }; }
  async pinnedMessage(chatId: number) { await this.before(); const messageId = num(this.chat(chatId).pinned_message_id); if (!messageId) throw new TelegramError("MESSAGE_NOT_FOUND", "This chat has no pinned message."); return this.message(chatId, messageId); }
  async getInlineButtons(chatId: number, messageId: number) { await this.before(); return { chat_id: chatId, message_id: messageId, buttons: inlineButtons(this.message(chatId, messageId)) }; }
  async clickInlineButton(chatId: number, messageId: number, row: number, column: number) { await this.before(); const button = inlineButtons(this.message(chatId, messageId)).find((item) => item.row === row && item.column === column); if (!button?.can_click) throw new TelegramError("INVALID_INPUT", "Only callback buttons can be clicked."); return { clicked: button }; }
  async reactToMessage(chatId: number, messageId: number, emoji: string, remove: boolean) { await this.before(); this.message(chatId, messageId); return { chat_id: chatId, message_id: messageId, emoji, removed: remove }; }
  async editOwnMessage(chatId: number, messageId: number, text: string) { await this.before(); const message = this.message(chatId, messageId); if (message.is_outgoing !== true) throw new TelegramError("PERMISSION_DENIED", "Only outgoing messages may be edited."); message.content = { _: "messageText", text: { text } }; return message; }
  async deleteOwnMessage(chatId: number, messageId: number) { await this.before(); const message = this.message(chatId, messageId); if (message.is_outgoing !== true) throw new TelegramError("PERMISSION_DENIED", "Only outgoing messages may be deleted."); this.messageMap.set(chatId, (this.messageMap.get(chatId) ?? []).filter((item) => item !== message)); return { chat_id: chatId, message_id: messageId, deleted: true }; }
  async sendMessage(chatId: number, text: string, replyToMessageId?: number) { await this.before(); this.chat(chatId); const message: TdObject = { id: Date.now() + this.sent.length, chat_id: chatId, is_outgoing: true, sender_id: { user_id: num(this.me.id) }, reply_to: replyToMessageId ? { message_id: replyToMessageId } : {}, content: { _: "messageText", text: { text } } }; this.sent.push(message); this.messageMap.set(chatId, [message, ...(this.messageMap.get(chatId) ?? [])]); return message; }
  async sendFile(chatId: number, filePath: string, caption?: string) { return this.sendMessage(chatId, caption ?? `[file:${filePath}]`); }
  async downloadFile(chatId: number, messageId: number, destination?: string) { await this.before(); this.message(chatId, messageId); this.downloads.push({ chatId, messageId, destination }); return { chat_id: chatId, message_id: messageId, destination }; }
  async displayChat(chat: TdObject): Promise<ChatDisplay> { return { untrusted_telegram_data: true, chat_id: num(chat.id), title: str(chat.title), unread_count: num(chat.unread_count) ?? 0 }; }
  async displayMessage(message: TdObject): Promise<Record<string, unknown>> { return { untrusted_telegram_data: true, message_id: num(message.id), chat_id: num(message.chat_id), sender_id: senderId(message), text: messageText(message), is_outgoing: message.is_outgoing === true, content_type: contentType(message) }; }
  async close() { /* no-op */ }
}
