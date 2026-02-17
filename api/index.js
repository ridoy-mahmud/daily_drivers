const { MongoClient, ObjectId } = require("mongodb");

// ─── MongoDB (cached across warm invocations) ─────────────────
const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://tools_eve:4321@cluster0.0b7ezwy.mongodb.net/?appName=Cluster0";
let cached = null;

async function getCollection() {
  if (cached) return cached;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  cached = client.db("toolvault").collection("bookmarks");
  // Seed if empty
  const count = await cached.countDocuments();
  if (count === 0) {
    await cached.insertMany([
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
        description:
          "AI-powered assistant for writing, coding and brainstorming.",
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
        description:
          "Code hosting platform for version control and collaboration.",
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
    ]);
  }
  return cached;
}

// ─── Vercel Serverless Handler ─────────────────────────────────
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const col = await getCollection();

    // Parse path: /api/bookmarks or /api/bookmarks/SOME_ID
    const url = req.url || "";
    const segments = url.split("?")[0].split("/").filter(Boolean);
    // segments = ['api', 'bookmarks'] or ['api', 'bookmarks', '<id>']
    const id = segments.length >= 3 ? segments[2] : null;

    // GET — list all
    if (req.method === "GET" && !id) {
      const bookmarks = await col.find({}).toArray();
      return res.status(200).json(bookmarks);
    }

    // POST — create
    if (req.method === "POST") {
      const { name, url: bmUrl, description, logo } = req.body;
      if (!name || !bmUrl)
        return res.status(400).json({ error: "Name and URL required" });
      const doc = {
        name,
        url: bmUrl,
        description: description || "",
        logo: logo || "",
      };
      const result = await col.insertOne(doc);
      return res.status(201).json({ ...doc, _id: result.insertedId });
    }

    // PUT — update
    if (req.method === "PUT" && id) {
      const { name, url: bmUrl, description, logo } = req.body;
      const update = {};
      if (name !== undefined) update.name = name;
      if (bmUrl !== undefined) update.url = bmUrl;
      if (description !== undefined) update.description = description;
      if (logo !== undefined) update.logo = logo;
      const result = await col.updateOne(
        { _id: new ObjectId(id) },
        { $set: update },
      );
      if (result.matchedCount === 0)
        return res.status(404).json({ error: "Not found" });
      const updated = await col.findOne({ _id: new ObjectId(id) });
      return res.status(200).json(updated);
    }

    // DELETE
    if (req.method === "DELETE" && id) {
      const result = await col.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0)
        return res.status(404).json({ error: "Not found" });
      return res.status(200).json({ message: "Deleted" });
    }

    // Fallback
    return res
      .status(404)
      .json({
        error: "Not found",
        debug_path: req.url,
        debug_method: req.method,
      });
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
