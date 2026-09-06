import assert from "node:assert/strict";
import test from "node:test";
import { FakeTelegramService } from "../src/telegram/fakeService.js";
import { TelegramError } from "../src/telegram/errors.js";

function fake() {
  return new FakeTelegramService({
    chats: [{ id: 10, title: "Work", unread_count: 2, pinned_message_id: 2 }],
    messages: [
      { id: 1, chat_id: 10, is_outgoing: false, sender_id: { user_id: 2 }, content: { _: "messageText", text: { text: "deadline https://example.test" } } },
      { id: 2, chat_id: 10, is_outgoing: true, sender_id: { user_id: 1 }, content: { _: "messageDocument", document: {} } },
    ],
  });
}

test("fake service models chats, history, search, unread, and pins", async () => {
  const service = fake();
  assert.equal((await service.listChats(10)).length, 1);
  assert.equal((await service.searchChats("work", 10))[0]?.id, 10);
  assert.equal((await service.messages(10, 10)).length, 2);
  assert.equal((await service.searchMessages("deadline", 10))[0]?.id, 1);
  assert.equal((await service.searchMedia(10, "url", 10))[0]?.id, 1);
  assert.equal((await service.pinnedMessage(10)).id, 2);
});

test("fake service models sends, replies, reactions, and deletion restrictions", async () => {
  const service = fake();
  const sent = await service.sendMessage(10, "hello", 1);
  assert.equal(sent.is_outgoing, true);
  assert.equal((await service.reactToMessage(10, 1, "👍", false) as { removed: boolean }).removed, false);
  await assert.rejects(() => service.deleteOwnMessage(10, 1), (error: unknown) => error instanceof TelegramError && error.code === "PERMISSION_DENIED");
  await assert.doesNotReject(() => service.deleteOwnMessage(10, Number(sent.id)));
});

test("fake service supports deterministic failures and missing entities", async () => {
  const service = fake();
  service.failNext(new TelegramError("AUTH_REQUIRED", "login required"));
  await assert.rejects(() => service.getMe(), (error: unknown) => error instanceof TelegramError && error.code === "AUTH_REQUIRED");
  await assert.rejects(() => service.getChat(99), (error: unknown) => error instanceof TelegramError && error.code === "CHAT_NOT_FOUND");
  await assert.rejects(() => service.downloadFile(10, 99), (error: unknown) => error instanceof TelegramError && error.code === "MESSAGE_NOT_FOUND");
});
