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
  const today = new Date().toISOString().split("T")[0];
  const timeLabel = isEvening ? "Still pending" : "Tasks";

  function splitOverdue(tasks) {
    const overdue = tasks.filter((t) => t.due_date && t.due_date < today);
    const current = tasks.filter((t) => !t.due_date || t.due_date >= today);
    return { overdue, current };
  }

  function formatTaskLine(t, showDate = false) {
    const priority = t.summary?.includes("[HIGH]") ? "🔴 " : "";
    const date = showDate && t.due_date ? ` [${t.due_date}]` : "";
    return `  • ${priority}${t.title}${date}`;
  }

  function formatSection(emoji, label, tasks) {
    const { overdue, current } = splitOverdue(tasks);
    let section = `${emoji} ${label} - ${timeLabel}:\n`;

    if (overdue.length > 0) {
      section += `  ⚠️ Overdue:\n`;
      section += overdue.map((t) => formatTaskLine(t, true)).join("\n");
      if (current.length > 0) {
        section += `\n  Today:\n`;
        section += current.map((t) => formatTaskLine(t)).join("\n");
      }
    } else {
      section += current.map((t) => formatTaskLine(t)).join("\n");
    }

    return section;
  }

  let message = "";

  if (workTasks.length > 0) {
    message += formatSection("💼", "Work", workTasks);
    message += "\n\n";
  }

  if (personalTasks.length > 0) {
    message += formatSection("🏠", "Personal", personalTasks);
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

function buildInlineKeyboardForTasks(tasks) {
  const rows = [];

  for (const task of tasks) {
    if (task.status === "Done") continue;

    const shortTitle = task.title.length > 20 ? task.title.slice(0, 18) + "…" : task.title;
    const buttons = [];

    if (task.status === "Not started") {
      buttons.push({ text: `▶️ ${shortTitle}`, callback_data: `ip:${task.id}` });
    }

    buttons.push({ text: `✅ ${shortTitle}`, callback_data: `done:${task.id}` });

    rows.push(buttons);
  }

  return rows.length > 0 ? rows : null;
}

module.exports = { formatTaskList, formatDailyReminder, formatTasksForPeriod, buildInlineKeyboardForTasks };
