async function sendTelegramMessage(chatId, text, replyMarkup) {
  const body = {
    chat_id: chatId,
    text: text,
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.description || "Failed to send Telegram message");
  }

  return data;
}

async function answerCallbackQuery(callbackQueryId, text) {
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
      }),
    }
  );
}

async function editMessageReplyMarkup(chatId, messageId, replyMarkup) {
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: replyMarkup,
      }),
    }
  );
}

async function setWebhook(url) {
  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.description || "Failed to set webhook");
  }

  return data;
}

module.exports = { sendTelegramMessage, answerCallbackQuery, editMessageReplyMarkup, setWebhook };
