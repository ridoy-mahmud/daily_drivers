/**
 * PUT /api/bookmarks/[id]    — Update a bookmark
 * DELETE /api/bookmarks/[id] — Delete a bookmark
 */

const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_db');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid bookmark ID' });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('bookmarks');

    if (req.method === 'PUT') {
      const { name, url, description, logo } = req.body;
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (url !== undefined) updateData.url = url;
      if (description !== undefined) updateData.description = description;
      if (logo !== undefined) updateData.logo = logo;

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }

      const updated = await collection.findOne({ _id: new ObjectId(id) });
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const result = await collection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }

      return res.status(200).json({ message: 'Bookmark deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(`API /bookmarks/${id} error:`, err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
