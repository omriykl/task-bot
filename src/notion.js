const NOTION_API_TOKEN = process.env.NOTION_API_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function createTask({ title, summary, priority, due_date, scope }) {
  const properties = {
    "Task name": {
      title: [{ text: { content: title } }],
    },
    Status: {
      status: { name: "Not started" },
    },
    Assignee: {
      people: [{ id: "8a56618a-e13a-4642-9604-489f0a085baa" }],
    },
  };

  // Add summary if provided
  if (summary) {
    const summaryText = priority === "HIGH" ? `[HIGH] ${summary}` :
                        priority === "LOW" ? `[LOW] ${summary}` :
                        summary;
    properties.Summary = {
      rich_text: [{ text: { content: summaryText } }],
    };
  } else if (priority) {
    // If no summary but has priority, add priority indicator
    properties.Summary = {
      rich_text: [{ text: { content: `[${priority}]` } }],
    };
  }

  // Add due date if provided
  if (due_date) {
    properties.Due = {
      date: { start: due_date },
    };
  }

  // Add scope if provided
  if (scope) {
    properties.Scope = {
      select: { name: scope },
    };
  }

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DATABASE_ID },
      properties,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create Notion task");
  }

  return {
    id: data.id,
    url: data.url,
  };
}

module.exports = { createTask };
