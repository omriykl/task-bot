const NOTION_API_TOKEN = process.env.NOTION_API_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function queryTasks({ startDate, endDate, scope, includeCompleted = false }) {
  const filters = [];

  // Date range filter
  if (startDate) {
    filters.push({
      property: "Due",
      date: { on_or_after: startDate },
    });
  }
  if (endDate) {
    filters.push({
      property: "Due",
      date: { on_or_before: endDate },
    });
  }

  // Scope filter (Work/Personal)
  if (scope) {
    filters.push({
      property: "Scope",
      select: { equals: scope },
    });
  }

  // Exclude completed tasks unless requested
  if (!includeCompleted) {
    filters.push({
      property: "Status",
      status: { does_not_equal: "Done" },
    });
  }

  const body = {
    sorts: [{ property: "Due", direction: "ascending" }],
  };

  if (filters.length > 0) {
    body.filter = filters.length === 1 ? filters[0] : { and: filters };
  }

  const response = await fetch(
    `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to query Notion tasks");
  }

  // Parse results into simplified task objects
  return data.results.map((page) => {
    const props = page.properties;
    return {
      id: page.id,
      title: props["Task name"]?.title?.[0]?.text?.content || "Untitled",
      summary: props.Summary?.rich_text?.[0]?.text?.content || null,
      due_date: props.Due?.date?.start || null,
      scope: props.Scope?.select?.name || null,
      status: props.Status?.status?.name || null,
      url: page.url,
    };
  });
}

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

async function updateTaskStatus(pageId, status) {
  const response = await fetch(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${NOTION_API_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        properties: {
          Status: { status: { name: status } },
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update task status");
  }

  return data;
}

async function updateTaskScope(pageId, scope) {
  const response = await fetch(
    `https://api.notion.com/v1/pages/${pageId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${NOTION_API_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        properties: {
          Scope: { select: { name: scope } },
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update task scope");
  }

  return data;
}

module.exports = { createTask, queryTasks, updateTaskStatus, updateTaskScope };
