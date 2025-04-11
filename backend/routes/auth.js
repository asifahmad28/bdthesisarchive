const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const sendEmail = require('../config/email');
const { v4: uuidv4 } = require('uuid');

// রেজিস্ট্রেশন (ইমেইল ভেরিফিকেশন সহ)
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, university, department, studentId } = req.body;
    
    // ইমেইল চেক
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // পাসওয়ার্ড হ্যাশ
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    // ইউজার তৈরি
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, password, university, department, student_id, verification_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [fullName, email, hashedPassword, university, department, studentId, verificationToken]
    );

    // ভেরিফিকেশন ইমেইল পাঠানো
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const emailSent = await sendEmail(
      email,
      'Verify Your Email - Thesis Portal',
      `<p>Please click <a href="${verificationLink}">here</a> to verify your email.</p>`
    );

    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    res.status(201).json({ message: 'Registration successful. Please check your email for verification.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ইমেইল ভেরিফিকেশন
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    const [result] = await db.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = ?',
      [token]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// লগইন
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // ইউজার খোঁজা
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // ইমেইল ভেরিফাইড কিনা চেক
    if (!user.is_verified) {
      return res.status(400).json({ message: 'Please verify your email first' });
    }

    // পাসওয়ার্ড মিলানো
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // JWT টোকেন তৈরি
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5d' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            university: user.university,
            department: user.department,
            role: user.role
          }
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// পাসওয়ার্ড রিসেট রিকোয়েস্ট
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // ইউজার খোঁজা
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'User not found' });
    }

    const user = users[0];
    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // টোকেন সেট করা
    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, user.id]
    );

    // রিসেট ইমেইল পাঠানো
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const emailSent = await sendEmail(
      email,
      'Password Reset Request - Thesis Portal',
      `<p>Please click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>`
    );

    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send reset email' });
    }

    res.json({ message: 'Password reset link sent to your email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// পাসওয়ার্ড রিসেট
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // ইউজার খোঁজা
    const [users] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const user = users[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // পাসওয়ার্ড আপডেট এবং টোকেন রিমুভ
    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// লগইন এন্ডপয়েন্ট
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // ইউজার খোঁজা
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'ভুল ইমেইল বা পাসওয়ার্ড' });
        }

        const user = users[0];

        // ইমেইল ভেরিফাইড কিনা চেক
        if (!user.is_verified) {
            return res.status(400).json({ message: 'অ্যাকাউন্ট ভেরিফাই করা হয়নি। ইমেইল চেক করুন' });
        }

        // পাসওয়ার্ড মিলানো
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'ভুল ইমেইল বা পাসওয়ার্ড' });
        }

        // JWT টোকেন তৈরি
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5d' },
            (err, token) => {
                if (err) throw err;
                res.json({ 
                    token,
                    user: {
                        id: user.id,
                        fullName: user.full_name,
                        email: user.email,
                        university: user.university,
                        department: user.department,
                        role: user.role
                    }
                });
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;