import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(here, "..", "data", "db.json");

// Load .env if present (no dotenv dep needed for one variable)
const envPath = path.join(here, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const EMPTY = { dumps: [], themes: [], edges: [], excerpts: [] };

function readDb() {
  try {
    return { ...EMPTY, ...JSON.parse(fs.readFileSync(DB_PATH, "utf8")) };
  } catch {
    return { ...EMPTY };
  }
}

function writeDb(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const tmp = DB_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2) + "\n");
  fs.renameSync(tmp, DB_PATH);
}

const app = express();
app.use(express.json({ limit: "10mb" }));

const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY);

app.get("/api/config", (_req, res) => {
  res.json({ aiEnabled });
});

app.get("/api/state", (_req, res) => {
  res.json(readDb());
});

app.put("/api/state", (req, res) => {
  const { dumps, themes, edges, excerpts } = req.body ?? {};
  if (![dumps, themes, edges, excerpts].every(Array.isArray)) {
    return res.status(400).json({ error: "state must have dumps/themes/edges/excerpts arrays" });
  }
  writeDb({ dumps, themes, edges, excerpts });
  res.json({ ok: true });
});

if (aiEnabled) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();

  // Extract themed excerpts from a dump, matching against the existing theme list
  // so the map grows instead of fragmenting.
  app.post("/api/extract", async (req, res) => {
    const { dumpText, themes } = req.body ?? {};
    if (typeof dumpText !== "string" || !dumpText.trim()) {
      return res.status(400).json({ error: "dumpText required" });
    }
    const themeList = (Array.isArray(themes) ? themes : [])
      .map((t) => `- id: ${t.id} | label: ${t.label} | ${t.description ?? ""}`)
      .join("\n");

    const schema = {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              excerpt_text: {
                type: "string",
                description: "Verbatim passage copied from the dump that expresses one idea",
              },
              existing_theme_id: {
                type: ["string", "null"],
                description: "id of a matching existing theme, or null if this needs a new theme",
              },
              new_theme_label: { type: ["string", "null"] },
              new_theme_description: { type: ["string", "null"] },
            },
            required: ["excerpt_text", "existing_theme_id", "new_theme_label", "new_theme_description"],
            additionalProperties: false,
          },
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    };

    try {
      const stream = client.messages.stream({
        model: "claude-opus-5",
        max_tokens: 16000,
        system:
          "You organize freeform thought-dumps into blog-post-sized themes. " +
          "Split the dump into self-contained idea passages (verbatim text from the dump, sentence-level or larger). " +
          "Match each passage to an existing theme when one genuinely fits; otherwise propose a new theme with a " +
          "short label (2-5 words, usable as a blog post topic) and a one-sentence description. " +
          "Prefer matching to existing themes over creating near-duplicates.",
        messages: [
          {
            role: "user",
            content:
              `Existing themes:\n${themeList || "(none yet)"}\n\n` +
              `Thought dump to organize:\n<dump>\n${dumpText}\n</dump>`,
          },
        ],
        output_config: { format: { type: "json_schema", schema } },
      });
      const message = await stream.finalMessage();
      if (message.stop_reason === "refusal") {
        return res.status(422).json({ error: "Model declined the request" });
      }
      const text = message.content.find((b) => b.type === "text")?.text ?? "{}";
      res.json(JSON.parse(text));
    } catch (err) {
      console.error("extract failed:", err);
      res.status(500).json({ error: String(err?.message ?? err) });
    }
  });
}

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Thought Map server on http://localhost:${PORT} (AI extraction: ${aiEnabled ? "on" : "off"})`);
});
