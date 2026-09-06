import { consoleAuthorizer } from "./telegram/auth.js";
import { TelegramClient } from "./telegram/client.js";
import { num, str } from "./telegram/helpers.js";

const telegram = new TelegramClient();
const authorizer = consoleAuthorizer();
try {
  await telegram.connect(authorizer);
  const me = await telegram.getMe();
  console.error("Telegram authentication successful.");
  console.error(`Logged in as: ${[str(me.first_name), str(me.last_name)].filter(Boolean).join(" ")} (id ${num(me.id)})`);
  console.error("MCP server ready. Run npm run dev or npm start.");
} finally {
  authorizer.close();
  await telegram.close();
}
