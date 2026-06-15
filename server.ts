import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── Load agent skill file ───────────────────────────────────────────────────
const SKILL_PATH = path.join(__dirname, '..', 'bujo-agent.md');
let AGENT_SKILL = '';
try {
  AGENT_SKILL = fs.readFileSync(SKILL_PATH, 'utf-8');
  console.log('[BuJo] Loaded agent skill file:', SKILL_PATH.length, 'chars');
} catch (e) {
  console.error('[BuJo] Failed to load skill file, using inline prompt:', e);
}

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

function buildSystemPrompt(currentDate: string, workspace?: any): string {
  const temporalCtx = buildTemporalContext(currentDate);

  // Build COMPACT workspace snapshot — only open items with IDs
  let snapshot = "";
  if (workspace) {
    const { collections = [], entries = [], habits = [] } = workspace;
    const openEntries = entries.filter((e: any) => e.state === 'open');
    const openCount = openEntries.length;

    snapshot = `\n\n## WORKSPACE SNAPSHOT\n`;
    snapshot += `Collections (${collections.length}): ${collections.map((c: any) => `"${c.title}"`).join(', ')}\n`;
    snapshot += `Open items: ${openCount} | Habits: ${habits.length}\n`;

    // Only list open entries — compact format: id + type + text
    if (openCount > 0) {
      snapshot += `\nOpen items (id → text):\n`;
      for (const e of openEntries) {
        const col = collections.find((c: any) => c.id === e.collectionId);
        const loc = col ? `#${col.title}` : e.logType;
        snapshot += `- [${e.id}] ${e.type} in ${loc}: "${e.text}"\n`;
      }
    }

    if (habits.length > 0) {
      snapshot += `\nHabits: ${habits.map((h: any) => `"${h.name}" [${h.id}]`).join(', ')}\n`;
    }
  }

  // Use skill file as base, inject temporal context + snapshot
  const base = AGENT_SKILL || buildFallbackPrompt();
  return `${base}\n\n## TEMPORAL CONTEXT\n${temporalCtx}${snapshot}`;
}

function buildFallbackPrompt(): string {
  return `You are a Bullet Journal assistant. Return JSON with "response" and "actions" array.
Actions: create_collection, add_entry, complete_entry, cancel_entry, delete_entry, insights.
For add_entry fields: actionType, entryType, text, date, logType, signifier, targetCollectionTitle.
For complete/cancel/delete_entry: actionType, entryId.
Return ONLY valid JSON.`;
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
    response: {
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
            enum: ["create_collection", "add_entry", "complete_entry", "cancel_entry", "delete_entry", "insights"],
            description: "The type of action to perform."
          },

          // ── create_collection fields ──
          collectionTitle: {
            type: Type.STRING,
            description: "For create_collection: The title of the new collection. Be specific (e.g. 'Marathon Training Plan', not 'Fitness')."
          },
          collectionIdRef: {
            type: Type.STRING,
            description: "Optional reference ID for a collection, used when other actions need to reference a newly created collection."
          },

          // ── add_entry fields ──
          text: {
            type: Type.STRING,
            description: "For add_entry: The exact text of the entry. Keep it concise and in the user's voice. For tasks, phrase as an action (verb-first when possible)."
          },
          entryType: {
            type: Type.STRING,
            enum: ["task", "event", "note", "habit"],
            description: "For add_entry: The BuJo bullet type. Use 'habit' for creating a habit in the Habit Tracker."
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
            description: "For add_entry: Resolved absolute date. YYYY-MM-DD for daily log entries. YYYY-MM for monthly/future log entries. Use today's date for habits."
          },
          targetCollectionTitle: {
            type: Type.STRING,
            description: "For add_entry with logType=collection: The title of an EXISTING collection to add to. For NEW collections, create_collection will be handled first, then this field matches by title."
          },

          // ── complete_entry / cancel_entry / delete_entry fields ──
          entryId: {
            type: Type.STRING,
            description: "For complete_entry, cancel_entry, delete_entry: The ID of the entry from the workspace state. Use the exact ID provided."
          },
          entryRef: {
            type: Type.STRING,
            description: "Alternative field name for entryId. The ID of the entry from workspace state."
          },
          newState: {
            type: Type.STRING,
            description: "For state changes: the new state to set (completed, canceled, etc.)"
          }
        },
        required: ["actionType"]
      }
    }
  },
  required: ["response", "actions"]
};

// ─── Rate limiter ──────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

function rateLimitMiddleware(maxRequests = 10, windowMs = 60000) {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!rateLimit(ip, maxRequests, windowMs)) {
      return res.status(429).json({ error: "Too many requests. Please slow down." });
    }
    next();
  };
}

// ─── Server ───────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '1mb' }));

  // Rate limit all AI endpoints
  app.use('/api/', rateLimitMiddleware(20, 60000));

  // ── Main BuJo intent endpoint ──────────────────────────────────────────────
  app.post("/api/bujo", async (req, res) => {
    try {
      const {
        text,
        currentDate,
        provider,
        openrouterModel,
        geminiModel,
        workspace,
      } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }
      if (text.length > 8000) {
        return res.status(400).json({ error: "Text must be under 8000 characters." });
      }

      const systemPrompt = buildSystemPrompt(currentDate, workspace);
      let parsedResponse: { response?: string; reply?: string; actions: any[] };

      const effectiveKey = process.env.SERVER_OPENROUTER_KEY || '';
      if (provider === 'openrouter' && effectiveKey) {
        const model = openrouterModel || 'google/gemini-2.5-flash';
        try {
          const raw = await callOpenRouter(model, effectiveKey, [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ]);
          console.log('[BuJo Server] OpenRouter raw:', raw.slice(0, 500));
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          const cleaned = jsonMatch ? jsonMatch[0] : raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
          parsedResponse = JSON.parse(cleaned);
        } catch (orError) {
          console.error('[BuJo Server] OpenRouter failed, falling back to Gemini:', orError);
          const fallbackModel = geminiModel || 'gemini-2.5-flash';
          const response = await ai.models.generateContent({
            model: fallbackModel,
            contents: `${systemPrompt}\n\nUser says: "${text}"`,
            config: {
              responseMimeType: "application/json",
              responseSchema: bujoSchema,
              temperature: 0.2,
            }
          });
          parsedResponse = JSON.parse(response.text || '{}');
        }
      } else {
        const model = geminiModel || 'gemini-2.5-flash';
        const response = await ai.models.generateContent({
          model,
          contents: `${systemPrompt}\n\nUser says: "${text}"`,
          config: {
            responseMimeType: "application/json",
            responseSchema: bujoSchema,
            temperature: 0.2,
          }
        });
        console.log('[BuJo Server] Gemini raw text:', (response.text || '').slice(0, 500));
        parsedResponse = JSON.parse(response.text || '{}');
      }

      console.log('[BuJo Server] parsed response:', JSON.stringify(parsedResponse));

      res.json(parsedResponse);
    } catch (error) {
      console.error("BuJo AI Error:", error);
      res.status(500).json({ error: "Failed to process request." });
    }
  });

  // ── Monthly review endpoint ────────────────────────────────────────────────
  app.post("/api/review", async (req, res) => {
    try {
      const { stats, monthFormat, provider, openrouterModel, geminiModel } = req.body;

      const prompt = buildReviewPrompt(stats, monthFormat);
      let review: string;

      const effectiveReviewKey = process.env.SERVER_OPENROUTER_KEY || '';
      if (provider === 'openrouter' && effectiveReviewKey) {
        const model = openrouterModel || 'google/gemini-2.5-flash';
        try {
          review = await callOpenRouter(model, effectiveReviewKey, [
            { role: 'system', content: 'You are a direct, experienced Bullet Journal coach.' },
            { role: 'user', content: prompt }
          ]);
        } catch (orError) {
          console.error('[BuJo Server] Review OpenRouter failed, falling back to Gemini:', orError);
          const response = await ai.models.generateContent({
            model: geminiModel || 'gemini-2.5-flash',
            contents: prompt,
          });
          review = response.text || '';
        }
      } else {
        const response = await ai.models.generateContent({
          model: geminiModel || 'gemini-2.5-flash',
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
      const { text, currentDate, provider, openrouterModel, geminiModel } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length < 3) {
        return res.json({ hint: null });
      }
      if (text.length > 2000) {
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

      const effectiveHintKey = process.env.SERVER_OPENROUTER_KEY || '';
      if (provider === 'openrouter' && effectiveHintKey) {
        const model = openrouterModel || 'google/gemini-2.5-flash';
        try {
          raw = await callOpenRouter(model, effectiveHintKey, [
            { role: 'user', content: hint_prompt }
          ], 0.0);
        } catch (orError) {
          console.error('[BuJo Server] Parse-hint OpenRouter failed, falling back to Gemini:', orError);
          const response = await ai.models.generateContent({
            model: geminiModel || 'gemini-2.5-flash',
            contents: hint_prompt,
            config: { responseMimeType: "application/json", temperature: 0.0 }
          });
          raw = response.text || '{}';
        }
      } else {
        const response = await ai.models.generateContent({
          model: geminiModel || 'gemini-2.5-flash',
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

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    httpServer.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
