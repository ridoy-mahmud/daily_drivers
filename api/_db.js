/**
 * Shared MongoDB connection helper for Vercel serverless functions.
 * Caches the connection across warm invocations to avoid reconnecting.
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://tools_eve:4321@cluster0.0b7ezwy.mongodb.net/?appName=Cluster0';
const DB_NAME = 'toolvault';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// ─── Default bookmarks to seed on first request ────────────────
const DEFAULT_BOOKMARKS = [
  { name: 'Canva', url: 'https://www.canva.com', description: 'Design anything — social media graphics, presentations, posters & more.', logo: 'https://img.icons8.com/fluency/96/canva.png' },
  { name: 'ChatGPT', url: 'https://chat.openai.com', description: 'AI-powered assistant for writing, coding and brainstorming.', logo: 'https://img.icons8.com/fluency/96/chatgpt.png' },
  { name: 'Freepik', url: 'https://www.freepik.com', description: 'Free vectors, photos, PSD and icons for your projects.', logo: 'https://img.icons8.com/fluency/96/freepik.png' },
  { name: 'GitHub', url: 'https://github.com', description: 'Code hosting platform for version control and collaboration.', logo: 'https://img.icons8.com/fluency/96/github.png' },
  { name: 'Figma', url: 'https://www.figma.com', description: 'Collaborative interface design tool for teams.', logo: 'https://img.icons8.com/fluency/96/figma.png' },
  { name: 'Notion', url: 'https://www.notion.so', description: 'All-in-one workspace for notes, docs, and project management.', logo: 'https://img.icons8.com/fluency/96/notion.png' },
  { name: 'Cobalt Tools', url: 'https://cobalt.tools/settings/video', description: 'Media downloader — save videos and audio from popular platforms.', logo: 'https://cobalt.tools/favicon.ico' },
  { name: 'Gemini', url: 'https://gemini.google.com', description: "Google's AI assistant for creative and productive tasks.", logo: 'https://www.gstatic.com/lamda/images/gemini_favicon_f069958c85030456e93de685.png' },
  { name: 'NotebookLM', url: 'https://notebooklm.google.com', description: 'AI-powered research and note-taking tool by Google.', logo: 'https://notebooklm.google.com/favicon.ico' },
  { name: 'Grok', url: 'https://grok.com', description: "xAI's conversational AI with real-time knowledge.", logo: 'https://grok.com/images/favicon.ico' },
  { name: 'Claude', url: 'https://claude.ai', description: "Anthropic's helpful, harmless, and honest AI assistant.", logo: 'https://claude.ai/favicon.ico' },
  { name: 'Kimi', url: 'https://kimi.moonshot.cn', description: "Moonshot AI's intelligent assistant with long-context support.", logo: 'https://kimi.moonshot.cn/favicon.ico' },
  { name: 'Google AI Studio', url: 'https://aistudio.google.com', description: "Prototype and build with Google's generative AI models.", logo: 'https://aistudio.google.com/favicon.ico' },
  { name: 'OpenClaw', url: 'https://openclaw.com', description: 'Open-source AI tools and resources platform.', logo: 'https://openclaw.com/favicon.ico' },
  { name: 'DeepSeek', url: 'https://chat.deepseek.com', description: 'Advanced AI assistant for coding, math, and reasoning.', logo: 'https://chat.deepseek.com/favicon.ico' },
];

/**
 * Ensure the bookmarks collection has data, seed defaults if empty.
 * @param {Collection} collection
 */
async function ensureSeeded(collection) {
  const count = await collection.countDocuments();
  if (count === 0) {
    await collection.insertMany(DEFAULT_BOOKMARKS);
  }
}

module.exports = { connectToDatabase, ensureSeeded };
