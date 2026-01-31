function formatTaskList(tasks, header) {
  if (tasks.length === 0) {
    return `${header}\n\nNo tasks found.`;
  }

  const lines = tasks.map((task) => {
    const priority = task.summary?.includes("[HIGH]")
      ? "🔴 "
      : task.summary?.includes("[LOW]")
      ? "🟢 "
      : "";
    return `• ${priority}${task.title}`;
  });

  return `${header}\n\n${lines.join("\n")}`;
}

function formatDailyReminder(workTasks, personalTasks, isEvening = false) {
  const timeLabel = isEvening ? "Still pending" : "Tasks";

  let message = "";

  if (workTasks.length > 0) {
    message += `💼 Work - ${timeLabel}:\n`;
    message += workTasks
      .map((t) => {
        const priority = t.summary?.includes("[HIGH]") ? "🔴 " : "";
        return `  • ${priority}${t.title}`;
      })
      .join("\n");
    message += "\n\n";
  }

  if (personalTasks.length > 0) {
    message += `🏠 Personal - ${timeLabel}:\n`;
    message += personalTasks
      .map((t) => {
        const priority = t.summary?.includes("[HIGH]") ? "🔴 " : "";
        return `  • ${priority}${t.title}`;
      })
      .join("\n");
  }

  if (!message) {
    return isEvening
      ? "All done for today! Great work. 🎉"
      : "No tasks scheduled for today. Enjoy your free time!";
  }

  return message.trim();
}

function formatTasksForPeriod(workTasks, personalTasks, header) {
  let message = `📋 ${header}\n\n`;

  if (workTasks.length === 0 && personalTasks.length === 0) {
    return message + "No tasks found for this period.";
  }

  if (workTasks.length > 0) {
    message += `💼 Work (${workTasks.length}):\n`;
    message += workTasks
      .map((t) => {
        const priority = t.summary?.includes("[HIGH]") ? "🔴 " : "";
        const due = t.due_date ? ` [${t.due_date}]` : "";
        return `  • ${priority}${t.title}${due}`;
      })
      .join("\n");
    message += "\n\n";
  }

  if (personalTasks.length > 0) {
    message += `🏠 Personal (${personalTasks.length}):\n`;
    message += personalTasks
      .map((t) => {
        const priority = t.summary?.includes("[HIGH]") ? "🔴 " : "";
        const due = t.due_date ? ` [${t.due_date}]` : "";
        return `  • ${priority}${t.title}${due}`;
      })
      .join("\n");
  }

  return message.trim();
}

module.exports = { formatTaskList, formatDailyReminder, formatTasksForPeriod };
