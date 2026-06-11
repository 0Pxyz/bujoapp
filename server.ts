import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildTemporalContext(currentDate: string): string {
  const now = new Date(currentDate);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = dayNames[now.getDay()];
  const daysUntilWeekend = dayOfWeek === "Saturday" ? 0 : dayOfWeek === "Sunday" ? 0 : 6 - now.getDay();
  const daysUntilMonday = dayOfWeek === "Monday" ? 7 : (8 - now.getDay()) % 7;

  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);

  const nextSaturday = new Date(now);
  nextSaturday.setDate(now.getDate() + daysUntilWeekend);

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  function fmt(d: Date) {
    return d.toISOString().split("T")[0];
  }

  return `
TODAY: ${currentDate} (${dayOfWeek})
THIS WEEK: Mon ${fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1))} → Sun ${fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 7))}
NEXT MONDAY: ${fmt(nextMonday)}
THIS WEEKEND (Saturday): ${fmt(nextSaturday)}
END OF THIS MONTH: ${fmt(endOfMonth)}
NEXT MONTH STARTS: ${fmt(firstOfNextMonth)}
CURRENT MONTH (YYYY-MM): ${currentDate.slice(0, 7)}
NEXT MONTH (YYYY-MM): ${fmt(firstOfNextMonth).slice(0, 7)}
`.trim();
}

function buildSystemPrompt(currentDate: string, existingCollections?: string[]): string {
  const temporalCtx = buildTemporalContext(currentDate);
  const collectionsCtx = existingCollections?.length
    ? `\nUSER'S EXISTING COLLECTIONS: ${existingCollections.map(c => `"${c}"`).join(", ")}\nPrefer adding to an existing collection over creating a new one when the topic matches closely.`
    : "";

  return `You are an expert Bullet Journal (BuJo) assistant. Your job is to understand what the user is really saying — not just their literal words — and translate it into the correct BuJo structures. Think like a thoughtful journaling coach who also knows the Ryder Carroll method cold.

## TEMPORAL CONTEXT
${temporalCtx}

## BULLET JOURNAL PHILOSOPHY
The BuJo system has three log types and collections:
- **Daily Log**: Rapid logging for the current day or a specific future date. Tasks (•), Events (○), Notes (—). Use for anything concrete happening on a date.
- **Monthly Log**: Calendar view + task list for the whole month. Use for events with known dates this month, or tasks without a specific day.
- **Future Log**: Anything beyond the current month. Events, tasks, reminders scheduled for a future month.
- **Collections**: Thematic groupings — project task lists, idea dumps, reading lists, habit trackers, etc. Created for recurring topics or multi-step goals.

## ENTRY TYPES
- **task**: Something to do (•). Can have sub-tasks. Can be scheduled, delegated, or migrated.
- **event**: Something that happens at a time/date (○). Record after the fact or schedule ahead.
- **note**: A thought, observation, fact, or idea (—). Not actionable. Goes in daily log or relevant collection.
- **habit**: A recurring behaviour the user wants to track. Goes in a Habit Tracker collection.

## SIGNIFIERS
- **none**: Default — no special marker.
- **priority**: Star (*) — the user signals urgency, importance, or emphasis ("really need to", "must", "important", "ASAP", "!").
- **inspiration**: Eye (👁) — a creative idea, insight, or spark ("I had an idea", "what if...", "could be interesting to...").

## HOW TO DECODE USER INTENT

### Scheduling signals → pick the right log
| What they say | Where it goes |
|---|---|
| "today", "right now", "this morning" | daily / today's date |
| "tomorrow" | daily / tomorrow's date |
| "next Monday", "on Thursday" | daily / resolved date |
| "this weekend" | daily / this Saturday |
| "next week" | daily / next Monday (or specific day if named) |
| "this month", "sometime soon" | monthly / current month |
| "next month", "in July" | future log / that month |
| No time mentioned, sounds like a project task | collection (create or add to existing) |
| No time mentioned, sounds like a one-off to-do | daily / today |

### Cognitive signals → pick the right entry type
| What they say | Entry type |
|---|---|
| "I need to / should / have to / must" | task |
| "I want to / I'm thinking about / what if" | note or task in a collection |
| "reminder: / don't forget to" | task (priority) |
| "meeting / lunch / appointment / call at X" | event |
| "idea: / had an idea" | note with signifier=inspiration |
| "I did / I finished / I went" | event (past, for daily log) |
| "every day / every week / tracking" | habit |
| "book/movie/article to read/watch" | note in a collection ("Reading List" / "Watch List") |
| "I'm feeling / reflection:" | note in daily log |

### Collection detection
- If the user mentions a named project, hobby, or theme: use a matching collection.
- If they list 3+ related tasks: create a collection and add them all.
- If they mention a goal: create a collection for it.
- For groceries, errands, shopping: use / create a "Errands" or specific list collection.

## ACTION RULES
1. Parse the user's text carefully for ALL distinct items — don't collapse multiple tasks into one.
2. For multi-part requests, return multiple actions.
3. When creating a collection AND adding entries to it in the same response, use collectionIdRef + targetCollectionRef to link them.
4. Resolve all relative dates to absolute dates (YYYY-MM-DD or YYYY-MM) using the temporal context above.
5. If the input is ambiguous, choose the most reasonable interpretation and explain it in the reply.
6. The reply should be warm, brief (1-3 sentences), and confirm what you understood — not a bullet list of what you did.
7. Never lose information. If in doubt, create a note.
8. For insights requests ("review", "how am I doing", "monthly review"), return actionType="insights".

${collectionsCtx}

IMPORTANT: Return ONLY a valid JSON object. No markdown, no code fences, no explanation outside the JSON.`;
}

function buildReviewPrompt(stats: any, monthFormat: string): string {
  const completionRate = stats.tasksCreated > 0
    ? Math.round((stats.tasksCompleted / stats.tasksCreated) * 100)
    : 0;

  return `You are a thoughtful Bullet Journal coach giving a monthly review. Be direct, honest, and encouraging — not generic.

Month: ${monthFormat}
Stats:
- Tasks created: ${stats.tasksCreated}
- Tasks completed: ${stats.tasksCompleted}
- Completion rate: ${completionRate}%
- Ideas & inspirations logged: ${stats.inspirations}
- Habit logs marked done: ${stats.totalHabitsTracked}
- Open (uncompleted) tasks: ${stats.tasksCreated - stats.tasksCompleted}

Write a review with:
1. One honest sentence summarising the month's productivity pattern (not a cheerleader — acknowledge if the rate is low).
2. The single biggest insight from the numbers (e.g. "You log a lot but complete less than half — classic over-planning" or "Strong execution month, ideas were your engine").
3. 2-3 focused suggestions for next month. Be specific, not platitudes ("Schedule a migration session on the 1st to move open tasks" not "Try to be more productive").
4. One question for reflection (e.g. "Which of those ${stats.tasksCreated - stats.tasksCompleted} open tasks still matter?").

Tone: honest coach, not life coach. No corporate fluff. No "Great job!" unless it's genuinely warranted.`;
}

async function callOpenRouter(
  model: string,
  apiKey: string,
  messages: { role: string; content: string }[],
  temperature = 0.2
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "BuJo App",
    },
    body: JSON.stringify({ model, messages, temperature }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Gemini structured schema ─────────────────────────────────────────────────

const bujoSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: "A warm, concise reply (1-3 sentences) confirming what the AI understood and what it is doing. Should reflect the user's actual intent, not just list actions."
    },
    actions: {
      type: Type.ARRAY,
      description: "All BuJo actions to perform based on the user's input.",
      items: {
        type: Type.OBJECT,
        properties: {
          actionType: {
            type: Type.STRING,
            enum: ["create_collection", "add_entry", "insights"],
            description: "The type of action to perform."
          },

          // ── create_collection fields ──
          collectionTitle: {
            type: Type.STRING,
            description: "For create_collection: The title of the new collection. Be specific (e.g. 'Marathon Training Plan', not 'Fitness')."
          },
          collectionType: {
            type: Type.STRING,
            enum: ["project", "list", "habit_tracker", "braindump", "reference"],
            description: "For create_collection: The type of collection. 'project' for multi-step goals, 'list' for simple item lists, 'habit_tracker' for recurring behaviours, 'braindump' for unstructured idea dumps, 'reference' for lookup info."
          },
          collectionIdRef: {
            type: Type.STRING,
            description: "A temporary reference ID to link entries to this new collection within this response. E.g. 'col_A'. Only used if add_entry actions target this collection."
          },

          // ── add_entry fields ──
          text: {
            type: Type.STRING,
            description: "For add_entry: The exact text of the entry. Keep it concise and in the user's voice. For tasks, phrase as an action (verb-first when possible)."
          },
          entryType: {
            type: Type.STRING,
            enum: ["task", "event", "note", "habit"],
            description: "For add_entry: The BuJo bullet type."
          },
          logType: {
            type: Type.STRING,
            enum: ["daily", "monthly", "future", "collection"],
            description: "For add_entry: Which log this entry belongs to."
          },
          signifier: {
            type: Type.STRING,
            enum: ["none", "priority", "inspiration"],
            description: "For add_entry: Signifier. 'priority' if the user implies urgency/importance. 'inspiration' if it's a creative idea or insight. Default 'none'."
          },
          date: {
            type: Type.STRING,
            description: "For add_entry: Resolved absolute date. YYYY-MM-DD for daily log entries. YYYY-MM for monthly/future log entries. Omit for collection entries."
          },
          targetCollectionTitle: {
            type: Type.STRING,
            description: "For add_entry with logType=collection: The title of the existing collection to add to (must match an existing collection title exactly)."
          },
          targetCollectionRef: {
            type: Type.STRING,
            description: "For add_entry: If targeting a newly created collection in THIS same response, use the collectionIdRef value here instead of targetCollectionTitle."
          },
          subTasks: {
            type: Type.ARRAY,
            description: "For add_entry with entryType=task: Optional sub-tasks (nested bullets). Each is a short string.",
            items: { type: Type.STRING }
          },
          time: {
            type: Type.STRING,
            description: "For add_entry with entryType=event: The time of the event in HH:MM 24h format, if mentioned by the user."
          },
          habitFrequency: {
            type: Type.STRING,
            enum: ["daily", "weekly", "weekdays", "weekends", "custom"],
            description: "For add_entry with entryType=habit: How often the habit repeats."
          }
        },
        required: ["actionType"]
      }
    }
  },
  required: ["reply", "actions"]
};

// ─── Server ───────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '1mb' }));

  // ── Main BuJo intent endpoint ──────────────────────────────────────────────
  app.post("/api/bujo", async (req, res) => {
    try {
      const {
        text,
        currentDate,
        provider,
        openrouterApiKey,
        openrouterModel,
        existingCollections,   // optional: string[] of collection titles for context
      } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const systemPrompt = buildSystemPrompt(currentDate, existingCollections);
      let parsedResponse: { reply: string; actions: any[] };

      if (provider === 'openrouter' && openrouterApiKey) {
        const model = openrouterModel || 'google/gemini-2.5-flash';
        const raw = await callOpenRouter(model, openrouterApiKey, [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ]);
        // Strip accidental markdown fences
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        parsedResponse = JSON.parse(cleaned);
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `${systemPrompt}\n\nUser says: "${text}"`,
          config: {
            responseMimeType: "application/json",
            responseSchema: bujoSchema,
            temperature: 0.2,
          }
        });
        parsedResponse = JSON.parse(response.text || '{}');
      }

      res.json(parsedResponse);
    } catch (error) {
      console.error("BuJo AI Error:", error);
      res.status(500).json({ error: "Failed to process request." });
    }
  });

  // ── Monthly review endpoint ────────────────────────────────────────────────
  app.post("/api/review", async (req, res) => {
    try {
      const { stats, monthFormat, provider, openrouterApiKey, openrouterModel } = req.body;

      const prompt = buildReviewPrompt(stats, monthFormat);
      let review: string;

      if (provider === 'openrouter' && openrouterApiKey) {
        const model = openrouterModel || 'google/gemini-2.5-flash';
        review = await callOpenRouter(model, openrouterApiKey, [
          { role: 'system', content: 'You are a direct, experienced Bullet Journal coach.' },
          { role: 'user', content: prompt }
        ]);
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        review = response.text || '';
      }

      res.json({ review });
    } catch (error) {
      console.error("Review error:", error);
      res.status(500).json({ error: "Failed to generate review." });
    }
  });

  // ── Quick parse endpoint (lightweight, no schema enforcement) ──────────────
  // Use this for real-time "what did I mean?" feedback as the user types
  app.post("/api/parse-hint", async (req, res) => {
    try {
      const { text, currentDate, provider, openrouterApiKey, openrouterModel } = req.body;

      if (!text || text.trim().length < 3) {
        return res.json({ hint: null });
      }

      const hint_prompt = `Given this Bullet Journal input: "${text}"
Current date: ${currentDate}

Reply with a single JSON object:
{
  "entryType": "task" | "event" | "note" | "habit",
  "logType": "daily" | "monthly" | "future" | "collection",
  "signifier": "none" | "priority" | "inspiration",
  "resolvedDate": "<YYYY-MM-DD or YYYY-MM, or null>",
  "label": "<3-6 word plain English summary of what this is, e.g. 'Task for today' or 'Future event in July'>"
}
Return ONLY the JSON. No explanation.`;

      let raw: string;

      if (provider === 'openrouter' && openrouterApiKey) {
        const model = openrouterModel || 'google/gemini-2.5-flash';
        raw = await callOpenRouter(model, openrouterApiKey, [
          { role: 'user', content: hint_prompt }
        ], 0.0);
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: hint_prompt,
          config: { responseMimeType: "application/json", temperature: 0.0 }
        });
        raw = response.text || '{}';
      }

      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      res.json({ hint: JSON.parse(cleaned) });
    } catch (_) {
      res.json({ hint: null }); // fail silently for hints
    }
  });

  // ── Vite / static serving ──────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, _res) => {
      _res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
