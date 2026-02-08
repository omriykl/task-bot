# Task Bot

Telegram bot that extracts tasks from natural language messages and adds them to Notion.

## Features

- Natural language task extraction using Groq LLM
- Voice message support via Groq Whisper transcription
- Automatic field extraction: title, summary, priority, due date, scope (Work/Personal)
- Direct integration with Notion databases
- Daily morning and evening task reminders
- Query tasks by time period
- Inline buttons for quick task status and scope updates

## Usage

### Adding Tasks

Send any message describing a task — the bot will automatically extract structured fields and create a Notion entry.

**Supported inputs:**
- **Text messages** — describe your task in natural language
- **Voice messages** — the bot transcribes audio and extracts the task

**Extracted fields:**
| Field | Description | Example |
|-------|-------------|---------|
| Title | Core actionable task (5-10 words) | "Review PR for auth service" |
| Summary | Additional context | "John asked for review on the login refactor" |
| Priority | HIGH or LOW | "urgent: fix prod bug" → HIGH |
| Due date | Parsed from relative/absolute dates | "by Friday" → next Friday's date |
| Scope | Work or Personal | Auto-detected from context |

**Examples:**
```
Review PR by Friday
Buy groceries tomorrow
urgent: fix prod bug in auth service
```

If the bot can't determine the scope, it will show **Work** / **Personal** buttons for you to choose.

### Query Commands

Check your upcoming tasks by sending one of these commands:

| Command | Description |
|---------|-------------|
| `today` | Show today's tasks + overdue tasks |
| `tomorrow` | Show tomorrow's tasks |
| `next week` | Show tasks for the next 7 days |

Task lists include inline buttons to quickly update status.

### Inline Actions

When viewing tasks, use the inline buttons to update them directly:

- **In progress** — marks the task as in progress
- **Done** — marks the task as done
- **Work / Personal** — sets the task scope (shown when scope is missing)

### Daily Reminders

The bot sends automatic reminders with your task summary:

- **8:00 AM** — morning overview of all tasks for the day (including overdue)
- **6:00 PM** — evening check-in with remaining incomplete tasks

Reminders include inline action buttons for quick updates.

## Setup

1. Copy `.env.example` to `.env` and fill in your credentials:
   - `GROQ_API_KEY` — Groq API key (for LLM and Whisper)
   - `TELEGRAM_BOT_TOKEN` — Telegram bot token
   - `TELEGRAM_CHAT_ID` — Chat ID for scheduled reminders
   - `NOTION_API_TOKEN` — Notion integration token
   - `NOTION_DATABASE_ID` — Target Notion database ID

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run locally:
   ```bash
   npm run dev
   ```

## Tech Stack

- **Runtime:** Node.js + Express
- **LLM:** Groq (llama-3.3-70b-versatile)
- **Transcription:** Groq Whisper (whisper-large-v3-turbo)
- **Task storage:** Notion API
- **Scheduling:** node-cron (Asia/Jerusalem timezone)

## Deployment

Deployed to Railway using the CLI:

```bash
npm install -g @railway/cli
railway login
railway up
```

Make sure environment variables are configured in the Railway dashboard.
