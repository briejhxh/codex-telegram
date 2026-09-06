import type { TdObject } from "./types.js";
import type { MediaKind } from "./media.js";

export type ChatDisplay = Record<string, unknown> & { unread_count: number };

/** Shared contract implemented by the local TDLib client. */
export interface TelegramService {
  getMe(): Promise<TdObject>;
  getChat(chatId: number): Promise<TdObject>;
  listChats(limit: number): Promise<TdObject[]>;
  searchChats(query: string, limit: number): Promise<TdObject[]>;
  messages(chatId: number, limit: number, fromMessageId?: number): Promise<TdObject[]>;
  searchMessages(query: string, limit: number, chatId?: number): Promise<TdObject[]>;
  searchMedia(chatId: number, kind: MediaKind, limit: number, query?: string): Promise<TdObject[]>;
  getInlineButtons(chatId: number, messageId: number): Promise<unknown>;
  clickInlineButton(chatId: number, messageId: number, row: number, column: number): Promise<unknown>;
  reactToMessage(chatId: number, messageId: number, emoji: string, remove: boolean): Promise<unknown>;
  sendMessage(chatId: number, text: string, replyToMessageId?: number): Promise<TdObject>;
  sendFile(chatId: number, filePath: string, caption?: string): Promise<TdObject>;
  downloadFile(chatId: number, messageId: number, destination?: string): Promise<unknown>;
  displayChat(chat: TdObject): Promise<ChatDisplay>;
  displayMessage(message: TdObject): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}
