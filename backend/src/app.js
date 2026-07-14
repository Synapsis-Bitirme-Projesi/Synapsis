require('dotenv').config();// require('./config/initTables'); // Temporarily disabled - syntax error in initTables.js
const express = require('express');
const cors = require('cors'); // 1. CORS'u içeri al
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/course'); // Ders programı rotalarını ekle
const examRoutes = require('./routes/exam'); // Sınav rotalarını ekle
const taskRoutes = require('./routes/task'); // Görev rotalarını ekle
const notesRoutes = require('./routes/notes'); // Not rotalarını ekle
const app = express();

// 2. CORS ayarlarını yap (Önemli: authRoutes'tan önce olmalı)
app.use(cors({
  origin: "http://localhost:3000", // Frontend adresine izin ver
  credentials: true
}));

app.use(express.json());
app.use('/api/notes', require('./routes/notes'));
// VEYA
app.use('/api/auth', require('./routes/authRoutes'));
app.get('/', (req, res) => {
  res.json({ message: 'Synapsis API is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes); // Ders programı rotalarını kullan
app.use('/api/exams', examRoutes); // Sınav rotalarını kullan
app.use('/api/tasks', taskRoutes); // Görev rotalarını kullan
app.use('/api/notes', notesRoutes); // Not rotalarını kullan
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});