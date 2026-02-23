const { queryTasks } = require("../../src/notion");
const { formatDailyReminder, buildInlineKeyboardForTasks } = require("../../src/messages");
const { sendTelegramMessage } = require("../../src/telegram");

module.exports = async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    const workTasks = await queryTasks({
      endDate: today,
      scope: "Work",
      includeCompleted: false,
    });
    const personalTasks = await queryTasks({
      endDate: today,
      scope: "Personal",
      includeCompleted: false,
    });

    const allTasks = [...workTasks, ...personalTasks];
    const message = formatDailyReminder(workTasks, personalTasks, true);
    const keyboard = buildInlineKeyboardForTasks(allTasks);
    const replyMarkup = keyboard ? { inline_keyboard: keyboard } : undefined;

    await sendTelegramMessage(
      process.env.TELEGRAM_CHAT_ID,
      `🌆 Evening check-in:\n\n${message}`,
      replyMarkup
    );

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error sending evening reminder:", error);
    res.status(500).json({ error: "Failed to send evening reminder" });
  }
};
