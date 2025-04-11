const express = require('express');
const router = express.Router();
const db = require('../config/db');
const adminAuth = require('../middleware/adminAuth');

// সব ইউজার দেখা
router.get('/users', adminAuth, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, university, department, student_id, is_verified, role, created_at FROM users'
    );
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ইউজার রোল আপডেট
router.put('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    await db.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, userId]
    );
    
    // অ্যাডমিন লগ
    await db.query(
      'INSERT INTO admin_logs (admin_id, action, description) VALUES (?, ?, ?)',
      [req.user.id, 'update_role', `Updated user ${userId} role to ${role}`]
    );
    
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// থিসিস ম্যানেজমেন্ট
router.delete('/theses/:id', adminAuth, async (req, res) => {
  try {
    const thesisId = req.params.id;
    
    // থিসিস ডিলিট
    await db.query('DELETE FROM theses WHERE id = ?', [thesisId]);
    
    // অ্যাডমিন লগ
    await db.query(
      'INSERT INTO admin_logs (admin_id, action, description) VALUES (?, ?, ?)',
      [req.user.id, 'delete_thesis', `Deleted thesis ID: ${thesisId}`]
    );
    
    res.json({ message: 'Thesis deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// এনালিটিক্স ডেটা
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    // মোট থিসিস, ডাউনলোড, ইউজার
    const [stats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM theses) AS total_theses,
        (SELECT SUM(download_count) FROM theses) AS total_downloads,
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE is_verified = TRUE) AS verified_users
    `);
    
    // জনপ্রিয় থিসিস
    const [popular] = await db.query(`
      SELECT t.id, t.title, t.download_count, u.full_name AS author_name
      FROM theses t
      JOIN users u ON t.author_id = u.id
      ORDER BY t.download_count DESC
      LIMIT 5
    `);
    
    // সাম্প্রতিক ডাউনলোড
    const [recentDownloads] = await db.query(`
      SELECT dl.thesis_id, t.title, u.full_name AS user_name, dl.ip_address, dl.downloaded_at
      FROM download_logs dl
      LEFT JOIN theses t ON dl.thesis_id = t.id
      LEFT JOIN users u ON dl.user_id = u.id
      ORDER BY dl.downloaded_at DESC
      LIMIT 10
    `);
    
    // অ্যাডমিন অ্যাকশন লগ
    const [adminLogs] = await db.query(`
      SELECT al.action, al.description, al.performed_at, u.full_name AS admin_name
      FROM admin_logs al
      JOIN users u ON al.admin_id = u.id
      ORDER BY al.performed_at DESC
      LIMIT 20
    `);
    
    res.json({
      stats: stats[0],
      popularTheses: popular,
      recentDownloads,
      adminLogs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;