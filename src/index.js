require("dotenv").config();

const express = require("express");
const { extractTask } = require("./llm");
const { createTask } = require("./notion");

const app = express();
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Health check
app.get("/", (req, res) => {
  res.send("Task Bot is running!");
});

// Telegram webhook
app.post("/webhook", async (req, res) => {
  try {
    const { message } = req.body;

    // Ignore non-message updates
    if (!message || !message.text) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const text = message.text;

    // Handle /start command
    if (text === "/start") {
      await sendTelegramMessage(
        chatId,
        "Hey Omri! Send me any task and I'll add it to your Notion.\n\nExamples:\n- Review PR by Friday\n- להחליף בריטה\n- urgent: fix prod bug in auth service"
      );
      return res.sendStatus(200);
    }

    // Extract task using Claude
    console.log("Received message:", text);
    const extracted = await extractTask(text);
    console.log("Extracted:", extracted);

    // Create task in Notion
    const result = await createTask(extracted);
    console.log("Created task:", result.id);

    // Send confirmation
    let confirmation = `✓ Task added: ${extracted.title}`;
    if (extracted.due_date) {
      confirmation += `\nDue: ${extracted.due_date}`;
    }
    if (extracted.priority) {
      confirmation += `\nPriority: ${extracted.priority}`;
    }

    await sendTelegramMessage(chatId, confirmation);

    res.sendStatus(200);
  } catch (error) {
    console.error("Error processing message:", error);

    // Try to notify user of error
    if (req.body?.message?.chat?.id) {
      await sendTelegramMessage(
        req.body.message.chat.id,
        "Sorry, something went wrong. Please try again."
      ).catch(() => {});
    }

    res.sendStatus(200); // Always return 200 to Telegram
  }
});

async function sendTelegramMessage(chatId, text) {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.description || "Failed to send Telegram message");
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Task Bot server running on port ${PORT}`);
});
