const db = require('../config/db');
const path = require('path');

// থিসিস আপলোড
exports.uploadThesis = async (req, res) => {
  try {
    const { title, university, department, year, keywords, abstract } = req.body;
    const authorId = req.user.id;
    const filePath = `/uploads/theses/${req.file.filename}`;

    // থিসিস ডেটাবেসে সেভ করা
    const [result] = await db.query(
      `INSERT INTO theses 
      (title, author_id, university, department, year, abstract, file_path, file_size) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, authorId, university, department, year, abstract, filePath, req.file.size]
    );

    // কীওয়ার্ডস ইনসার্ট করা
    if (keywords) {
      const keywordValues = keywords.split(',').map(keyword => [result.insertId, keyword.trim()]);
      await db.query(
        'INSERT INTO keywords (thesis_id, keyword) VALUES ?',
        [keywordValues]
      );
    }

    return { 
      success: true,
      thesisId: result.insertId
    };
  } catch (error) {
    console.error('Error uploading thesis:', error);
    throw error;
  }
};

// থিসিস সার্চ
exports.searchTheses = async (searchParams) => {
  try {
    const { search, university, department, year, minRating } = searchParams;
    
    let query = `
      SELECT t.*, u.full_name AS author_name, AVG(r.rating) AS average_rating 
      FROM theses t
      LEFT JOIN users u ON t.author_id = u.id
      LEFT JOIN ratings r ON t.id = r.thesis_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (t.title LIKE ? OR t.abstract LIKE ? OR EXISTS 
               (SELECT 1 FROM keywords k WHERE k.thesis_id = t.id AND k.keyword LIKE ?))`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    // অন্যান্য ফিল্টার যোগ করুন...
    
    query += ' GROUP BY t.id ORDER BY t.created_at DESC';
    
    const theses = await db.query(query, params);
    
    // প্রতিটি থিসিসের জন্য কীওয়ার্ড যোগ করা
    for (const thesis of theses) {
      thesis.keywords = await db.query(
        'SELECT keyword FROM keywords WHERE thesis_id = ?',
        [thesis.id]
      );
    }
    
    return theses;
  } catch (error) {
    console.error('Error searching theses:', error);
    throw error;
  }
};