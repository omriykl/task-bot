const express = require("express");
const { extractTask } = require("./llm");
const { createTask, queryTasks, updateTaskStatus, updateTaskScope } = require("./notion");
const { transcribeVoice } = require("./transcribe");
const { formatTasksForPeriod, buildInlineKeyboardForTasks } = require("./messages");
const { sendTelegramMessage, answerCallbackQuery, editMessageReplyMarkup } = require("./telegram");

const app = express();
app.use(express.json());

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
  const allTasks = [...workTasks, ...personalTasks];

  const text = formatTasksForPeriod(workTasks, personalTasks, header);
  const keyboard = buildInlineKeyboardForTasks(allTasks);

  return { text, keyboard };
}

// Telegram webhook
app.post("/webhook", async (req, res) => {
  const secret = req.headers["x-telegram-bot-api-secret-token"];
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.sendStatus(403);
  }

  try {
    // Handle callback queries (inline button presses)
    const { callback_query, message } = req.body;

    if (callback_query) {
      const { id: callbackId, data, message: cbMessage } = callback_query;
      const chatId = cbMessage.chat.id;
      const messageId = cbMessage.message_id;

      const [action, pageId] = data.split(":");

      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!pageId || !uuidPattern.test(pageId)) {
        await answerCallbackQuery(callbackId, "Invalid action");
        return res.sendStatus(200);
      }

      // Handle scope selection
      const scopeMap = {
        scope_work: "Work",
        scope_personal: "Personal",
      };

      if (scopeMap[action]) {
        const scope = scopeMap[action];
        try {
          await updateTaskScope(pageId, scope);
          await answerCallbackQuery(callbackId, `Scope set to ${scope}`);
          await editMessageReplyMarkup(chatId, messageId, { inline_keyboard: [] });
        } catch (error) {
          console.error("Error updating task scope:", error);
          await answerCallbackQuery(callbackId, "Failed to update scope");
        }
        return res.sendStatus(200);
      }

      // Handle status updates
      const statusMap = {
        done: "Done",
        ip: "In progress",
      };

      const newStatus = statusMap[action];
      if (!newStatus) {
        await answerCallbackQuery(callbackId, "Invalid action");
        return res.sendStatus(200);
      }

      try {
        await updateTaskStatus(pageId, newStatus);
        await answerCallbackQuery(callbackId, `Task marked as ${newStatus}`);
        await editMessageReplyMarkup(chatId, messageId, { inline_keyboard: [] });
      } catch (error) {
        console.error("Error updating task status:", error);
        await answerCallbackQuery(callbackId, "Failed to update task");
      }

      return res.sendStatus(200);
    }

    // Ignore non-message updates
    if (!message) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;

    // Handle /start command
    if (message.text === "/start") {
      await sendTelegramMessage(
        chatId,
        "Hey there! Send me any task and I'll add it to your Notion.\n\n" +
        "You can send:\n" +
        "• Text messages\n" +
        "• Voice messages\n\n" +
        "Query commands:\n" +
        "• today - see today's tasks\n" +
        "• tomorrow - see tomorrow's tasks\n" +
        "• next week - see tasks for next 7 days\n\n" +
        "I'll automatically extract:\n" +
        "• Title, summary, priority\n" +
        "• Due date (supports relative dates like \"by Friday\")\n" +
        "• Scope (Work / Personal)\n\n" +
        "You can also update tasks directly from the bot using inline buttons.\n\n" +
        "Examples:\n" +
        "- Review PR by Friday\n" +
        "- Buy groceries tomorrow\n" +
        "- urgent: fix prod bug in auth service"
      );
      return res.sendStatus(200);
    }

    // Handle query commands
    const lowerText = message.text?.toLowerCase().trim();

    if (lowerText === "today") {
      const { text, keyboard } = await getTasksForPeriod("today");
      const replyMarkup = keyboard ? { inline_keyboard: keyboard } : undefined;
      await sendTelegramMessage(chatId, text, replyMarkup);
      return res.sendStatus(200);
    }

    if (lowerText === "tomorrow") {
      const { text, keyboard } = await getTasksForPeriod("tomorrow");
      const replyMarkup = keyboard ? { inline_keyboard: keyboard } : undefined;
      await sendTelegramMessage(chatId, text, replyMarkup);
      return res.sendStatus(200);
    }

    if (lowerText === "next week" || lowerText === "nextweek") {
      const { text, keyboard } = await getTasksForPeriod("next_week");
      const replyMarkup = keyboard ? { inline_keyboard: keyboard } : undefined;
      await sendTelegramMessage(chatId, text, replyMarkup);
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

    // Show scope selection buttons when LLM couldn't determine scope
    let replyMarkup;
    if (!extracted.scope) {
      replyMarkup = {
        inline_keyboard: [[
          { text: "💼 Work", callback_data: `scope_work:${result.id}` },
          { text: "🏠 Personal", callback_data: `scope_personal:${result.id}` },
        ]],
      };
    }

    await sendTelegramMessage(chatId, confirmation, replyMarkup);

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

module.exports = app;
