const Groq = require("groq-sdk");

const client = new Groq();

const SYSTEM_PROMPT = `You are a task extraction assistant for Omri Yossefy.

Context:
- The user is Omri Yossefy (@omri.yossefy, @omri)
- When Omri mentions himself, refer to him as "me" in summaries
- Team members you may see: @sharon.stone, @rozi (add more as needed)

Your job: Extract structured task data from natural language messages.

Rules:
1. **title**: The core actionable task (concise, 5-10 words max)
   - Don't just take the first sentence - understand what the ACTUAL task is
   - If it's a follow-up or clarification needed, make that clear

2. **summary**: Additional context (null if none)
   - Who's involved, questions to answer, important details
   - Keep it brief but informative

3. **priority**: "HIGH" | "LOW" | null
   - HIGH: "urgent", "ASAP", "critical", production issues, tight deadlines
   - LOW: "eventually", "maybe", "sometime", "nice to have", "low priority"
   - null: normal priority (default, don't force a priority)

4. **due_date**: ISO date string (YYYY-MM-DD) or null
   - Parse relative dates based on current date provided
   - "tomorrow", "Friday", "next week", "end of month"
   - null if no date mentioned

Respond with valid JSON only. No explanation, no markdown code blocks.

Example input: "Refresh button - @sharon.stone to follow up with @rozi and @omri about the scope. Is it only SP? Generic implementation?"

Example output:
{"title":"Refresh button - clarify scope","summary":"@sharon.stone to follow up with @rozi and me. Questions: SP only or generic implementation?","priority":null,"due_date":null}`;

async function extractTask(message) {
  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Today is ${today} (${dayOfWeek}).

Extract task from this message:
${message}`,
      },
    ],
    max_tokens: 500,
    temperature: 0.1,
  });

  const text = response.choices[0].message.content.trim();

  try {
    // Handle potential markdown code blocks in response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse LLM response:", text);
    // Fallback: use message as title
    return {
      title: message.slice(0, 100),
      summary: null,
      priority: null,
      due_date: null,
    };
  }
}

module.exports = { extractTask };
