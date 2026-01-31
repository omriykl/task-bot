require("dotenv").config();

const express = require("express");
const cron = require("node-cron");
const { extractTask } = require("./llm");
const { createTask, queryTasks } = require("./notion");
const { transcribeVoice } = require("./transcribe");
const { formatDailyReminder, formatTasksForPeriod } = require("./messages");

const app = express();
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Health check
app.get("/", (req, res) => {
  res.send("Task Bot is running!");
});

// Helper: Get tasks for a specific period
async function getTasksForPeriod(period) {
  const today = new Date();
  let startDate, endDate, header;

  switch (period) {
    case "today":
      startDate = endDate = today.toISOString().split("T")[0];
      header = "Today's tasks";
      break;
    case "tomorrow":
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      startDate = endDate = tomorrow.toISOString().split("T")[0];
      header = "Tomorrow's tasks";
      break;
    case "next_week":
      startDate = today.toISOString().split("T")[0];
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      endDate = nextWeek.toISOString().split("T")[0];
      header = "Tasks for the next 7 days";
      break;
    default:
      startDate = endDate = today.toISOString().split("T")[0];
      header = "Tasks";
  }

  const workTasks = await queryTasks({ startDate, endDate, scope: "Work" });
  const personalTasks = await queryTasks({ startDate, endDate, scope: "Personal" });

  return formatTasksForPeriod(workTasks, personalTasks, header);
}

// Telegram webhook
app.post("/webhook", async (req, res) => {
  try {
    const { message } = req.body;

    // Ignore non-message updates
    if (!message) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;

    // Handle /start command
    if (message.text === "/start") {
      await sendTelegramMessage(
        chatId,
        "Hey Omri! Send me any task and I'll add it to your Notion.\n\n" +
        "You can send:\n" +
        "• Text messages\n" +
        "• Voice messages 🎤\n\n" +
        "Query commands:\n" +
        "• today - see today's tasks\n" +
        "• tomorrow - see tomorrow's tasks\n" +
        "• next week - see tasks for next 7 days\n\n" +
        "Examples:\n" +
        "- Review PR by Friday\n" +
        "- להחליף בריטה\n" +
        "- urgent: fix prod bug in auth service"
      );
      return res.sendStatus(200);
    }

    // Handle query commands
    const lowerText = message.text?.toLowerCase().trim();

    if (lowerText === "today") {
      const tasksMessage = await getTasksForPeriod("today");
      await sendTelegramMessage(chatId, tasksMessage);
      return res.sendStatus(200);
    }

    if (lowerText === "tomorrow") {
      const tasksMessage = await getTasksForPeriod("tomorrow");
      await sendTelegramMessage(chatId, tasksMessage);
      return res.sendStatus(200);
    }

    if (lowerText === "next week" || lowerText === "nextweek") {
      const tasksMessage = await getTasksForPeriod("next_week");
      await sendTelegramMessage(chatId, tasksMessage);
      return res.sendStatus(200);
    }

    let text;

    // Handle voice messages
    if (message.voice) {
      console.log("Received voice message, transcribing...");
      await sendTelegramMessage(chatId, "🎤 Transcribing...");
      text = await transcribeVoice(message.voice.file_id);
      console.log("Transcribed:", text);
    }
    // Handle text messages
    else if (message.text) {
      text = message.text;
    }
    // Ignore other message types
    else {
      return res.sendStatus(200);
    }

    // Extract task using LLM
    console.log("Processing message:", text);
    const extracted = await extractTask(text);
    console.log("Extracted:", extracted);

    // Create task in Notion
    const result = await createTask(extracted);
    console.log("Created task:", result.id);

    // Send confirmation
    let confirmation = `✓ Task added: ${extracted.title}`;
    if (extracted.scope) {
      confirmation += ` [${extracted.scope}]`;
    }
    if (extracted.summary) {
      confirmation += `\n${extracted.summary}`;
    }
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

// Scheduled daily messages
if (TELEGRAM_CHAT_ID) {
  // 8 AM daily - Today's tasks
  cron.schedule(
    "0 8 * * *",
    async () => {
      try {
        const today = new Date().toISOString().split("T")[0];

        const workTasks = await queryTasks({
          startDate: today,
          endDate: today,
          scope: "Work",
        });
        const personalTasks = await queryTasks({
          startDate: today,
          endDate: today,
          scope: "Personal",
        });

        const message = formatDailyReminder(workTasks, personalTasks, false);
        await sendTelegramMessage(TELEGRAM_CHAT_ID, `☀️ Good morning!\n\n${message}`);
        console.log("Sent 8 AM daily reminder");
      } catch (error) {
        console.error("Error sending 8 AM reminder:", error);
      }
    },
    { timezone: "Asia/Jerusalem" }
  );

  // 6 PM daily - Incomplete tasks
  cron.schedule(
    "0 18 * * *",
    async () => {
      try {
        const today = new Date().toISOString().split("T")[0];

        const workTasks = await queryTasks({
          startDate: today,
          endDate: today,
          scope: "Work",
          includeCompleted: false,
        });
        const personalTasks = await queryTasks({
          startDate: today,
          endDate: today,
          scope: "Personal",
          includeCompleted: false,
        });

        const message = formatDailyReminder(workTasks, personalTasks, true);
        await sendTelegramMessage(TELEGRAM_CHAT_ID, `🌆 Evening check-in:\n\n${message}`);
        console.log("Sent 6 PM daily reminder");
      } catch (error) {
        console.error("Error sending 6 PM reminder:", error);
      }
    },
    { timezone: "Asia/Jerusalem" }
  );

  console.log("Scheduled daily reminders at 8 AM and 6 PM (Asia/Jerusalem)");
} else {
  console.log("TELEGRAM_CHAT_ID not set - daily reminders disabled");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Task Bot server running on port ${PORT}`);
});
