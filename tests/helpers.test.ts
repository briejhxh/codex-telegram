import assert from "node:assert/strict";
import test from "node:test";
import { inlineButtonRows, inlineButtons, isOutgoingMessage, isStrictChildPath } from "../src/telegram/helpers.js";
import { mediaSearchFilter } from "../src/telegram/media.js";

test("allows download destinations only below the configured directory", () => {
  const root = process.platform === "win32" ? "C:\\telegram-downloads" : "/telegram-downloads";
  const child = process.platform === "win32" ? "C:\\telegram-downloads\\invoice.pdf" : "/telegram-downloads/invoice.pdf";
  const sibling = process.platform === "win32" ? "C:\\private.txt" : "/private.txt";
  assert.equal(isStrictChildPath(root, child), true);
  assert.equal(isStrictChildPath(root, root), false);
  assert.equal(isStrictChildPath(root, sibling), false);
});

test("parses TDLib inline keyboard rows exposed by tdl as arrays", () => {
  const message = {
    reply_markup: {
      _: "replyMarkupInlineKeyboard",
      rows: [[{
        _: "inlineKeyboardButton",
        text: "Catalog",
        type: { _: "inlineKeyboardButtonTypeCallback", data: "catalog" },
      }]],
    },
  };

  assert.deepEqual(inlineButtonRows(message), [[message.reply_markup.rows[0][0]]]);
  assert.deepEqual(inlineButtons(message), [{
    row: 0,
    column: 0,
    text: "Catalog",
    type: "inlineKeyboardButtonTypeCallback",
    can_click: true,
  }]);
});

test("accepts object-wrapped TDLib and Bot API keyboard fixtures", () => {
  const objectWrapped = {
    reply_markup: {
      rows: [{ buttons: [{ text: "Info", type: { _: "inlineKeyboardButtonTypeCallback" } }] }],
    },
  };
  const botApi = {
    reply_markup: {
      inline_keyboard: [[{ text: "Website", type: { _: "inlineKeyboardButtonTypeUrl" } }]],
    },
  };

  assert.equal(inlineButtons(objectWrapped)[0]?.can_click, true);
  assert.deepEqual(inlineButtons(botApi), [{
    row: 0,
    column: 0,
    text: "Website",
    type: "inlineKeyboardButtonTypeUrl",
    can_click: false,
  }]);
});

test("maps media kinds to supported TDLib search filters", () => {
  assert.deepEqual(mediaSearchFilter("document"), { _: "searchMessagesFilterDocument" });
  assert.deepEqual(mediaSearchFilter("voice"), { _: "searchMessagesFilterVoiceNote" });
  assert.deepEqual(mediaSearchFilter("photo"), { _: "searchMessagesFilterPhotoAndVideo" });
  assert.deepEqual(mediaSearchFilter("video"), { _: "searchMessagesFilterPhotoAndVideo" });
});

test("marks only messages sent by the current account as editable", () => {
  assert.equal(isOutgoingMessage({ is_outgoing: true }), true);
  assert.equal(isOutgoingMessage({ is_outgoing: false }), false);
  assert.equal(isOutgoingMessage({}), false);
});
