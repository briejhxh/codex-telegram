import { TelegramError } from "./errors.js";

export type MessageCursor = { v: 1; kind: "messages"; chatId: number; beforeMessageId: number };

export function encodeMessageCursor(cursor: MessageCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/** Decode only the cursor shape produced by this version of the server. */
export function decodeMessageCursor(value: string, chatId: number): MessageCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<MessageCursor>;
    const beforeMessageId = parsed.beforeMessageId;
    if (parsed.v !== 1 || parsed.kind !== "messages" || parsed.chatId !== chatId || typeof beforeMessageId !== "number" || !Number.isSafeInteger(beforeMessageId) || beforeMessageId <= 0) throw new Error("invalid");
    return { v: 1, kind: "messages", chatId, beforeMessageId };
  } catch {
    throw new TelegramError("INVALID_INPUT", "The pagination cursor is invalid for this chat. Start again without cursor.");
  }
}

export function paginated<T>(items: T[], limit: number, makeCursor: (last: T) => string): { items: T[]; next_cursor?: string; has_more: boolean; truncated: boolean } {
  const hasMore = items.length > limit;
  const page = items.slice(0, limit);
  return { items: page, next_cursor: hasMore && page.length > 0 ? makeCursor(page.at(-1)!) : undefined, has_more: hasMore, truncated: hasMore };
}
