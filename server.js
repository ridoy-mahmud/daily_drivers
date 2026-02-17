/**
 * ToolVault — Express + MongoDB Backend Server
 * Serves the static frontend and provides REST API for bookmark CRUD.
 */

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const path = require("path");
const dns = require("dns");
const crypto = require("crypto");

// Force Google Public DNS for SRV lookups (fixes ECONNREFUSED on some networks)
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// ─── Admin Authentication ────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ridoy@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const activeSessions = new Set(); // store valid tokens in memory

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MongoDB Connection ──────────────────────────────────────────
const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://tools_eve:4321@cluster0.0b7ezwy.mongodb.net/?appName=Cluster0";
const DB_NAME = "toolvault";
const COLLECTION = "bookmarks";

let db;
let bookmarksCollection;

async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    bookmarksCollection = db.collection(COLLECTION);
    console.log("✅ Connected to MongoDB Atlas");

    // Seed default bookmarks if collection is empty
    const count = await bookmarksCollection.countDocuments();
    if (count === 0) {
      await seedDefaults();
    }
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

// ─── Default Bookmarks Seed ──────────────────────────────────────
async function seedDefaults() {
  const defaults = [
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
  ];

  await bookmarksCollection.insertMany(defaults);
  console.log(`📦 Seeded ${defaults.length} default bookmarks`);
}

// ─── Middleware ───────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve static files (index.html, script.js, etc.)
app.use(express.static(path.join(__dirname)));

// ─── Auth Middleware ──────────────────────────────────────────────

/**
 * POST /api/login
 * Validates admin credentials, returns a session token.
 */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString("hex");
    activeSessions.add(token);
    console.log("🔑 Admin logged in");
    return res.json({ token, message: "Login successful" });
  }
  return res.status(401).json({ error: "Invalid email or password" });
});

/**
 * POST /api/logout
 * Invalidates a session token.
 */
app.post("/api/logout", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  activeSessions.delete(token);
  res.json({ message: "Logged out" });
});

/**
 * GET /api/auth/check
 * Checks if current token is valid.
 */
app.get("/api/auth/check", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  res.json({ authenticated: activeSessions.has(token) });
});

/**
 * Auth middleware — protects routes that modify data.
 */
function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token || !activeSessions.has(token)) {
    return res
      .status(401)
      .json({ error: "Unauthorized — admin login required" });
  }
  next();
}

// ─── API Routes ──────────────────────────────────────────────────

/**
 * GET /api/bookmarks (public)
 * Returns all bookmarks sorted by creation order.
 */
app.get("/api/bookmarks", async (req, res) => {
  try {
    const bookmarks = await bookmarksCollection.find({}).toArray();
    res.json(bookmarks);
  } catch (err) {
    console.error("GET /api/bookmarks error:", err);
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

/**
 * POST /api/bookmarks
 * Create a new bookmark. Body: { name, url, description, logo }
 */
app.post("/api/bookmarks", requireAuth, async (req, res) => {
  try {
    const { name, url, description, logo } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: "Name and URL are required" });
    }
    const newBookmark = {
      name,
      url,
      description: description || "",
      logo: logo || "",
    };
    const result = await bookmarksCollection.insertOne(newBookmark);
    res.status(201).json({ ...newBookmark, _id: result.insertedId });
  } catch (err) {
    console.error("POST /api/bookmarks error:", err);
    res.status(500).json({ error: "Failed to create bookmark" });
  }
});

/**
 * PUT /api/bookmarks/:id
 * Update an existing bookmark. Body: { name, url, description, logo }
 */
app.put("/api/bookmarks/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, description, logo } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (description !== undefined) updateData.description = description;
    if (logo !== undefined) updateData.logo = logo;

    const result = await bookmarksCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    const updated = await bookmarksCollection.findOne({
      _id: new ObjectId(id),
    });
    res.json(updated);
  } catch (err) {
    console.error("PUT /api/bookmarks/:id error:", err);
    res.status(500).json({ error: "Failed to update bookmark" });
  }
});

/**
 * DELETE /api/bookmarks/:id
 * Delete a bookmark by its MongoDB _id.
 */
app.delete("/api/bookmarks/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await bookmarksCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    res.json({ message: "Bookmark deleted" });
  } catch (err) {
    console.error("DELETE /api/bookmarks/:id error:", err);
    res.status(500).json({ error: "Failed to delete bookmark" });
  }
});

// ─── Start Server ────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 ToolVault server running at http://localhost:${PORT}`);
  });
});
