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
    });
    const personalTasks = await queryTasks({
      endDate: today,
      scope: "Personal",
    });

    const allTasks = [...workTasks, ...personalTasks];
    const message = formatDailyReminder(workTasks, personalTasks, false);
    const keyboard = buildInlineKeyboardForTasks(allTasks);
    const replyMarkup = keyboard ? { inline_keyboard: keyboard } : undefined;

    await sendTelegramMessage(
      process.env.TELEGRAM_CHAT_ID,
      `☀️ Good morning!\n\n${message}`,
      replyMarkup
    );

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error sending morning reminder:", error);
    res.status(500).json({ error: "Failed to send morning reminder" });
  }
};
