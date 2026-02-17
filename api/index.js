/**
 * ToolVault — Vercel Serverless API (Express wrapper)
 * Single entry point for all /api/* routes on Vercel.
 */

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());

// ─── MongoDB Connection (cached across warm invocations) ─────────
const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://tools_eve:4321@cluster0.0b7ezwy.mongodb.net/?appName=Cluster0";
const DB_NAME = "toolvault";

let cachedClient = null;
let cachedDb = null;

async function getDb() {
  if (cachedClient && cachedDb) return cachedDb;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  cachedClient = client;
  cachedDb = client.db(DB_NAME);
  return cachedDb;
}

// ─── Default bookmarks seed ──────────────────────────────────────
const DEFAULTS = [
  {
    name: "Canva",
    url: "https://www.canva.com",
    description:
      "Design anything — social media graphics, presentations, posters & more.",
    logo: "https://img.icons8.com/fluency/96/canva.png",
  },
  {
    name: "ChatGPT",
    url: "https://chat.openai.com",
    description: "AI-powered assistant for writing, coding and brainstorming.",
    logo: "https://img.icons8.com/fluency/96/chatgpt.png",
  },
  {
    name: "Freepik",
    url: "https://www.freepik.com",
    description: "Free vectors, photos, PSD and icons for your projects.",
    logo: "https://img.icons8.com/fluency/96/freepik.png",
  },
  {
    name: "GitHub",
    url: "https://github.com",
    description: "Code hosting platform for version control and collaboration.",
    logo: "https://img.icons8.com/fluency/96/github.png",
  },
  {
    name: "Figma",
    url: "https://www.figma.com",
    description: "Collaborative interface design tool for teams.",
    logo: "https://img.icons8.com/fluency/96/figma.png",
  },
  {
    name: "Notion",
    url: "https://www.notion.so",
    description:
      "All-in-one workspace for notes, docs, and project management.",
    logo: "https://img.icons8.com/fluency/96/notion.png",
  },
  {
    name: "Cobalt Tools",
    url: "https://cobalt.tools/settings/video",
    description:
      "Media downloader — save videos and audio from popular platforms.",
    logo: "https://cobalt.tools/favicon.ico",
  },
  {
    name: "Gemini",
    url: "https://gemini.google.com",
    description: "Google's AI assistant for creative and productive tasks.",
    logo: "https://www.gstatic.com/lamda/images/gemini_favicon_f069958c85030456e93de685.png",
  },
  {
    name: "NotebookLM",
    url: "https://notebooklm.google.com",
    description: "AI-powered research and note-taking tool by Google.",
    logo: "https://notebooklm.google.com/favicon.ico",
  },
  {
    name: "Grok",
    url: "https://grok.com",
    description: "xAI's conversational AI with real-time knowledge.",
    logo: "https://grok.com/images/favicon.ico",
  },
  {
    name: "Claude",
    url: "https://claude.ai",
    description: "Anthropic's helpful, harmless, and honest AI assistant.",
    logo: "https://claude.ai/favicon.ico",
  },
  {
    name: "Kimi",
    url: "https://kimi.moonshot.cn",
    description:
      "Moonshot AI's intelligent assistant with long-context support.",
    logo: "https://kimi.moonshot.cn/favicon.ico",
  },
  {
    name: "Google AI Studio",
    url: "https://aistudio.google.com",
    description: "Prototype and build with Google's generative AI models.",
    logo: "https://aistudio.google.com/favicon.ico",
  },
  {
    name: "OpenClaw",
    url: "https://openclaw.com",
    description: "Open-source AI tools and resources platform.",
    logo: "https://openclaw.com/favicon.ico",
  },
  {
    name: "DeepSeek",
    url: "https://chat.deepseek.com",
    description: "Advanced AI assistant for coding, math, and reasoning.",
    logo: "https://chat.deepseek.com/favicon.ico",
  },
];

async function ensureSeeded(col) {
  const count = await col.countDocuments();
  if (count === 0) await col.insertMany(DEFAULTS);
}

// ─── Routes ──────────────────────────────────────────────────────
// Handle both /api/bookmarks and /bookmarks (Vercel may strip /api prefix)

// GET all bookmarks
async function getBookmarks(req, res) {
  try {
    const db = await getDb();
    const col = db.collection("bookmarks");
    await ensureSeeded(col);
    const bookmarks = await col.find({}).toArray();
    res.json(bookmarks);
  } catch (err) {
    console.error("GET bookmarks error:", err);
    res.status(500).json({ error: err.message });
  }
}
app.get("/api/bookmarks", getBookmarks);
app.get("/bookmarks", getBookmarks);

// POST create bookmark
async function postBookmark(req, res) {
  try {
    const { name, url, description, logo } = req.body;
    if (!name || !url)
      return res.status(400).json({ error: "Name and URL required" });
    const db = await getDb();
    const col = db.collection("bookmarks");
    const doc = { name, url, description: description || "", logo: logo || "" };
    const result = await col.insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (err) {
    console.error("POST error:", err);
    res.status(500).json({ error: err.message });
  }
}
app.post("/api/bookmarks", postBookmark);
app.post("/bookmarks", postBookmark);

// PUT update bookmark
async function putBookmark(req, res) {
  try {
    const { id } = req.params;
    const { name, url, description, logo } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (url !== undefined) update.url = url;
    if (description !== undefined) update.description = description;
    if (logo !== undefined) update.logo = logo;

    const db = await getDb();
    const col = db.collection("bookmarks");
    const result = await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: update },
    );
    if (result.matchedCount === 0)
      return res.status(404).json({ error: "Not found" });
    const updated = await col.findOne({ _id: new ObjectId(id) });
    res.json(updated);
  } catch (err) {
    console.error("PUT error:", err);
    res.status(500).json({ error: err.message });
  }
}
app.put("/api/bookmarks/:id", putBookmark);
app.put("/bookmarks/:id", putBookmark);

// DELETE bookmark
async function deleteBookmarkHandler(req, res) {
  try {
    const { id } = req.params;
    const db = await getDb();
    const col = db.collection("bookmarks");
    const result = await col.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0)
      return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE error:", err);
    res.status(500).json({ error: err.message });
  }
}
app.delete("/api/bookmarks/:id", deleteBookmarkHandler);
app.delete("/bookmarks/:id", deleteBookmarkHandler);

// Debug: catch-all to show what path Express actually receives
app.all("*", (req, res) => {
  res.status(404).json({
    debug: true,
    message: "Route not matched",
    path: req.path,
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
  });
});

// Export for Vercel serverless
module.exports = app;
