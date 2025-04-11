const db = require('../config/db');

// সব ইউজার দেখা
exports.getAllUsers = async () => {
  return await db.query(
    `SELECT id, full_name, email, university, department, 
    student_id, is_verified, role, created_at 
    FROM users`
  );
};

// ইউজার রোল আপডেট
exports.updateUserRole = async (userId, role, adminId) => {
  await db.query(
    'UPDATE users SET role = ? WHERE id = ?',
    [role, userId]
  );
  
  // অ্যাডমিন লগ
  await db.query(
    `INSERT INTO admin_logs 
    (admin_id, action, description) 
    VALUES (?, ?, ?)`,
    [adminId, 'update_role', `Updated user ${userId} role to ${role}`]
  );
};

// এনালিটিক্স ডেটা
exports.getAnalytics = async () => {
  const [stats] = await db.query(`
    SELECT 
      (SELECT COUNT(*) FROM theses) AS total_theses,
      (SELECT SUM(download_count) FROM theses) AS total_downloads,
      (SELECT COUNT(*) FROM users) AS total_users
  `);
  
  const [popularTheses] = await db.query(`
    SELECT t.id, t.title, t.download_count, u.full_name AS author_name
    FROM theses t
    JOIN users u ON t.author_id = u.id
    ORDER BY t.download_count DESC
    LIMIT 5
  `);
  
  return {
    stats: stats[0],
    popularTheses
  };
};