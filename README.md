# Task Bot

Telegram bot that extracts tasks from natural language messages and adds them to Notion.

## Features

- Natural language task extraction using Groq LLM
- Voice message support via Groq Whisper
- Automatic field extraction: title, summary, priority, due date, scope (Work/Personal)
- Direct integration with Notion databases

## Setup

1. Copy `.env.example` to `.env` and fill in your credentials:
   - `GROQ_API_KEY` - Groq API key
   - `TELEGRAM_BOT_TOKEN` - Telegram bot token
   - `NOTION_API_TOKEN` - Notion integration token
   - `NOTION_DATABASE_ID` - Target Notion database ID

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run locally:
   ```bash
   npm run dev
   ```

## Deployment

Deployed to Railway using the CLI:

```bash
npm install -g @railway/cli
railway login
railway up
```

Make sure environment variables are configured in the Railway dashboard.
