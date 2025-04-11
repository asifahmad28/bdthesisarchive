require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const setupSwagger = require('./config/swagger');

const app = express();

// মিডলওয়্যার
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// রাউটস
const authRoutes = require('./routes/auth');
const thesisRoutes = require('./routes/theses');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/theses', thesisRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

// Swagger ডকুমেন্টেশন
setupSwagger(app);

// এরর হ্যান্ডলিং
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API documentation: http://localhost:${PORT}/api-docs`);
});