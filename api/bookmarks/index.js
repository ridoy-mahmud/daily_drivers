/**
 * GET /api/bookmarks  — Return all bookmarks
 * POST /api/bookmarks — Create a new bookmark
 */

const { connectToDatabase, ensureSeeded } = require("../_db");

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("bookmarks");

    // Seed defaults if empty
    await ensureSeeded(collection);

    if (req.method === "GET") {
      const bookmarks = await collection.find({}).toArray();
      return res.status(200).json(bookmarks);
    }

    if (req.method === "POST") {
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
      const result = await collection.insertOne(newBookmark);
      return res.status(201).json({ ...newBookmark, _id: result.insertedId });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("API /bookmarks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
