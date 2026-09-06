import type { TdObject } from "./types.js";

export const mediaKinds = ["photo", "video", "document", "audio", "voice", "animation", "url"] as const;
export type MediaKind = typeof mediaKinds[number];

/** TDLib groups photos and videos in one history filter. */
export function mediaSearchFilter(kind: MediaKind): TdObject {
  const filters: Record<MediaKind, string> = {
    photo: "searchMessagesFilterPhotoAndVideo",
    video: "searchMessagesFilterPhotoAndVideo",
    document: "searchMessagesFilterDocument",
    audio: "searchMessagesFilterAudio",
    voice: "searchMessagesFilterVoiceNote",
    animation: "searchMessagesFilterAnimation",
    url: "searchMessagesFilterUrl",
  };
  return { _: filters[kind] };
}
