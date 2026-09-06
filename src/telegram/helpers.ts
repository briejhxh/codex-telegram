import type { TdObject, TelegramFile } from "./types.js";
import path from "node:path";

export const obj = (value: unknown): TdObject => (value && typeof value === "object" ? value as TdObject : {});
export const str = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;
export const num = (value: unknown): number | undefined => typeof value === "number" ? value : undefined;

/** True only when target is a child path of root, never root itself or a sibling. */
export function isStrictChildPath(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return Boolean(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function formatDate(unixSeconds: unknown): string | undefined {
  const date = num(unixSeconds);
  return date ? new Date(date * 1000).toISOString() : undefined;
}

export function preview(value: string | undefined, maxLength = 500): string | undefined {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

export function messageText(message: TdObject): string | undefined {
  const content = obj(message.content);
  const text = obj(content.text);
  const caption = obj(content.caption);
  return str(text.text) ?? str(caption.text);
}

export function contentType(message: TdObject): string {
  const kind = str(obj(message.content)._ ) ?? "messageUnknown";
  const names: Record<string, string> = {
    messageText: "text", messagePhoto: "photo", messageVideo: "video", messageDocument: "document",
    messageAudio: "audio", messageVoiceNote: "voice", messageSticker: "sticker", messageAnimation: "animation",
  };
  return names[kind] ?? kind.replace(/^message/, "").toLowerCase();
}

export function fileFromMessage(message: TdObject): TelegramFile | undefined {
  const content = obj(message.content);
  const type = str(content._);
  let file: TdObject = {};
  let fileName: string | undefined;
  let mimeType: string | undefined;
  if (type === "messageDocument") { const document = obj(content.document); file = obj(document.document); fileName = str(document.file_name); mimeType = str(document.mime_type); }
  else if (type === "messageVideo") { const video = obj(content.video); file = obj(video.video); fileName = str(video.file_name); mimeType = str(video.mime_type); }
  else if (type === "messageAudio") { const audio = obj(content.audio); file = obj(audio.audio); fileName = str(audio.file_name); mimeType = str(audio.mime_type); }
  else if (type === "messageVoiceNote") { const voice = obj(content.voice_note); file = obj(voice.voice); mimeType = str(voice.mime_type); }
  else if (type === "messageAnimation") { const animation = obj(content.animation); file = obj(animation.animation); fileName = str(animation.file_name); mimeType = str(animation.mime_type); }
  else if (type === "messagePhoto") { const sizes = content.photo && obj(content.photo).sizes; const list = Array.isArray(sizes) ? sizes : []; file = obj(obj(list.at(-1)).photo); }
  else if (type === "messageSticker") { const sticker = obj(content.sticker); file = obj(sticker.sticker); }
  if (!num(file.id)) return undefined;
  const local = obj(file.local);
  return { file_name: fileName, mime_type: mimeType, size: num(file.size), telegram_file_id: num(file.id), is_downloaded: local.is_downloading_completed === true, local_path: str(local.path) };
}

export function senderId(message: TdObject): number | undefined {
  const sender = obj(message.sender_id); return num(sender.user_id) ?? num(sender.chat_id);
}

export type InlineButton = { row: number; column: number; text?: string; type: string; can_click: boolean };

/**
 * TDLib represents an inline keyboard as replyMarkupInlineKeyboard.rows[].buttons.
 * `inline_keyboard` is the similarly named Bot API representation; accepting it as
 * a fallback keeps the formatter tolerant of exported/test fixture messages.
 */
export function inlineButtonRows(message: TdObject): TdObject[][] {
  const markup = obj(message.reply_markup);
  const tdlibRows = Array.isArray(markup.rows) ? markup.rows : [];
  if (tdlibRows.length > 0) return tdlibRows.map((row) => {
    // tdl exposes TDLib's vector<inlineKeyboardButton> directly as an array.
    if (Array.isArray(row)) return row.map(obj);
    const buttons = obj(row).buttons;
    return Array.isArray(buttons) ? buttons.map(obj) : [];
  });
  const botApiRows = Array.isArray(markup.inline_keyboard) ? markup.inline_keyboard : [];
  return botApiRows.map((row) => Array.isArray(row) ? row.map(obj) : []);
}

export function inlineButtons(message: TdObject): InlineButton[] {
  const buttons: InlineButton[] = [];
  inlineButtonRows(message).forEach((row, rowIndex) => {
    row.forEach((button, columnIndex) => {
      const type = obj(button.type);
      const kind = str(type._) ?? "inlineKeyboardButtonTypeUnknown";
      buttons.push({ row: rowIndex, column: columnIndex, text: str(button.text), type: kind, can_click: kind === "inlineKeyboardButtonTypeCallback" });
    });
  });
  return buttons;
}
