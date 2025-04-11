const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const auth = require('../middleware/auth');

// ফাইল আপলোড কনফিগারেশন
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/theses/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('PDF files only!'));
    }
  }
});

// নতুন থিসিস আপলোড
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const { title, university, department, year, keywords, abstract } = req.body;
    const authorId = req.user.id;
    
    // থিসিস ডেটাবেসে সেভ করা
    const [result] = await db.query(
      'INSERT INTO theses (title, author_id, university, department, year, abstract, file_path, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, authorId, university, department, year, abstract, `/uploads/theses/${req.file.filename}`, req.file.size]
    );

    const thesisId = result.insertId;

    // কীওয়ার্ডস ইনসার্ট করা
    if (keywords) {
      const keywordValues = keywords.split(',').map(keyword => [thesisId, keyword.trim()]);
      await db.query(
        'INSERT INTO keywords (thesis_id, keyword) VALUES ?',
        [keywordValues]
      );
    }

    // অ্যাডমিন লগ
    if (req.user.role === 'admin') {
      await db.query(
        'INSERT INTO admin_logs (admin_id, action, description) VALUES (?, ?, ?)',
        [req.user.id, 'upload_thesis', `Uploaded thesis ID: ${thesisId}`]
      );
    }

    res.status(201).json({ 
      message: 'Thesis uploaded successfully',
      thesisId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// থিসিস সার্চ
router.get('/', async (req, res) => {
  try {
    const { search, university, department, year, minRating } = req.query;
    let query = 'SELECT t.*, u.full_name AS author_name, AVG(r.rating) AS average_rating FROM theses t ';
    query += 'LEFT JOIN users u ON t.author_id = u.id ';
    query += 'LEFT JOIN ratings r ON t.id = r.thesis_id ';
    query += 'WHERE 1=1 ';
    
    const params = [];
    
    if (search) {
      query += 'AND (t.title LIKE ? OR t.abstract LIKE ? OR EXISTS (SELECT 1 FROM keywords k WHERE k.thesis_id = t.id AND k.keyword LIKE ?)) ';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (university) {
      query += 'AND t.university = ? ';
      params.push(university);
    }
    
    if (department) {
      query += 'AND t.department = ? ';
      params.push(department);
    }
    
    if (year) {
      query += 'AND t.year = ? ';
      params.push(year);
    }
    
    query += 'GROUP BY t.id ';
    
    if (minRating) {
      query += 'HAVING average_rating >= ? OR average_rating IS NULL ';
      params.push(minRating);
    }
    
    query += 'ORDER BY t.created_at DESC';
    
    const [theses] = await db.query(query, params);
    
    // প্রতিটি থিসিসের জন্য কীওয়ার্ড যোগ করা
    for (const thesis of theses) {
      const [keywords] = await db.query(
        'SELECT keyword FROM keywords WHERE thesis_id = ?',
        [thesis.id]
      );
      thesis.keywords = keywords.map(k => k.keyword);
    }
    
    res.json(theses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// থিসিস ডাউনলোড
router.get('/:id/download', async (req, res) => {
  try {
    const thesisId = req.params.id;
    const ipAddress = req.ip;
    const userId = req.user?.id || null;
    
    // থিসিস তথ্য পাওয়া
    const [theses] = await db.query('SELECT file_path FROM theses WHERE id = ?', [thesisId]);
    if (theses.length === 0) {
      return res.status(404).json({ message: 'Thesis not found' });
    }
    
    const thesis = theses[0];
    
    // ডাউনলোড কাউন্ট আপডেট
    await db.query(
      'UPDATE theses SET download_count = download_count + 1 WHERE id = ?',
      [thesisId]
    );
    
    // ডাউনলোড লগ
    await db.query(
      'INSERT INTO download_logs (thesis_id, user_id, ip_address) VALUES (?, ?, ?)',
      [thesisId, userId, ipAddress]
    );
    
    // ফাইল ডাউনলোড
    res.download(path.join(__dirname, '..', thesis.file_path));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// থিসিস রেটিং
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const thesisId = req.params.id;
    const userId = req.user.id;
    const { rating, review } = req.body;
    
    // রেটিং ভ্যালিডেশন
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    // চেক করা যে ইউজার আগে রেটিং দিয়েছেন কিনা
    const [existing] = await db.query(
      'SELECT id FROM ratings WHERE thesis_id = ? AND user_id = ?',
      [thesisId, userId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ message: 'You have already rated this thesis' });
    }
    
    // রেটিং সেভ করা
    await db.query(
      'INSERT INTO ratings (thesis_id, user_id, rating, review) VALUES (?, ?, ?, ?)',
      [thesisId, userId, rating, review]
    );
    
    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;