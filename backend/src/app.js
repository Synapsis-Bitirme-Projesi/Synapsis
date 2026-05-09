require('dotenv').config();
const express = require('express');
const cors = require('cors'); // 1. CORS'u içeri al
const authRoutes = require('./routes/authRoutes');

const app = express();

// 2. CORS ayarlarını yap (Önemli: authRoutes'tan önce olmalı)
app.use(cors({
  origin: "http://localhost:3000", // Frontend adresine izin ver
  credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Synapsis API is running.' });
});

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});