import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/bujo", async (req, res) => {
    try {
      const { text, currentDate } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const schema: Schema = {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: "A friendly, concise reply from the AI acknowledging the actions it is taking."
          },
          actions: {
            type: Type.ARRAY,
            description: "A list of structured BuJo actions to perform based on the user's input.",
            items: {
              type: Type.OBJECT,
              properties: {
                actionType: {
                  type: Type.STRING,
                  enum: ["create_collection", "add_entry", "insights"],
                  description: "The type of action to perform."
                },
                collectionTitle: {
                  type: Type.STRING,
                  description: "For create_collection: The title of the new collection."
                },
                collectionIdRef: {
                  type: Type.STRING,
                  description: "A unique temporary reference ID to tie created entries to a newly created collection in this same response. E.g., 'collection_A'"
                },
                text: {
                  type: Type.STRING,
                  description: "For add_entry: The text of the entry (e.g. task name, idea, event)."
                },
                entryType: {
                  type: Type.STRING,
                  enum: ["task", "event", "note"],
                  description: "For add_entry: The type of bullet."
                },
                logType: {
                  type: Type.STRING,
                  enum: ["daily", "monthly", "future", "collection"],
                  description: "For add_entry: Where should this go? Ideas/Projects often go to newly created collections. Daily tasks go to daily."
                },
                signifier: {
                  type: Type.STRING,
                  enum: ["none", "priority", "inspiration"],
                  description: "For add_entry: Any signifier (use 'inspiration' for ideas, 'priority' for urgent)."
                },
                date: {
                  type: Type.STRING,
                  description: "For add_entry: The date it belongs to (YYYY-MM-DD for daily, YYYY-MM for monthly/future). Usually the current date if daily."
                },
                targetCollectionRef: {
                  type: Type.STRING,
                  description: "If adding to a newly created collection in this response, match the collectionIdRef here. Or if the user specifies an existing collection, you can't know the ID so leave this empty and we'll create one if needed, or if logType=collection without this, they will have to manually move."
                }
              },
              required: ["actionType"]
            }
          }
        },
        required: ["reply", "actions"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are a Bullet Journal (BuJo) expert assistant.
Current Date: ${currentDate}

User says: "${text}"

Deconstruct their request into the correct BuJo methods:
- Ideas -> Create a Collection and add notes/tasks to it. Or add directly to 'daily' log if it's just a quick thought.
- Planning a project -> Create Collection, add tasks as 'task' entries inside it.
- Tasks for today -> Add entries as 'task' to 'daily' log on the current date.
- Tasks for tomorrow/next week -> Add entries as 'task' to 'future' or 'monthly', or 'daily' for a future date.
- If they ask for a monthly review, actionType="insights" and just say "Going to Insights!" in the reply.

Return a JSON with a supportive "reply" string and a list of "actions".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.2,
        }
      });

      const parsedResponse = JSON.parse(response.text || '{}');
      res.json(parsedResponse);
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to process request." });
    }
  });

  app.post("/api/review", async (req, res) => {
    try {
      const { stats, monthFormat } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are a Bullet Journal coach. Generate a short, supportive, and analytical monthly review for ${monthFormat}.
Here are the user's stats:
- Tasks Created: ${stats.tasksCreated}
- Tasks Completed: ${stats.tasksCompleted}
- Ideas/Inspirations Logged: ${stats.inspirations}
- Habit logs marked done: ${stats.totalHabitsTracked}

Provide:
1. A brief 1-sentence summary of their productivity.
2. 2-3 short bullet point suggestions for focus next month (e.g., "Reduce active projects", "Don't forget to migrate open tasks").
Keep it concise and helpful. Don't be overly dramatic.`,
      });
      res.json({ review: response.text });
    } catch (error) {
       console.error("Review error:", error);
       res.status(500).json({ error: "Failed to generate review." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
