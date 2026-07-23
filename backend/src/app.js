const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
// require('./config/initTables'); // Temporarily disabled - syntax error in initTables.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // 1. CORS'u içeri al
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/course'); // Ders programı rotalarını ekle
const examRoutes = require('./routes/exam'); // Sınav rotalarını ekle
const taskRoutes = require('./routes/task'); // Görev rotalarını ekle
const notesRoutes = require('./routes/notes'); // Not rotalarını ekle
const { initSocket } = require('./utils/socketManager');
const app = express();

// 2. CORS ayarlarını yap (Önemli: authRoutes'tan önce olmalı)
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json());
app.get('/', (req, res) => {
  res.json({ message: 'Synapsis API is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes); // Ders programı rotalarını kullan
app.use('/api/exams', examRoutes); // Sınav rotalarını kullan
app.use('/api/tasks', taskRoutes); // Görev rotalarını kullan
app.use('/api/notes', notesRoutes); // Not rotalarını kullan
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    return next();
  } catch (err) {
    console.error('Socket auth failed:', err.message);
    return next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.join('community');
  if (socket.user?.userId) {
    socket.join(`user:${socket.user.userId}`);
  }

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

initSocket(io);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} zaten kullanımda. Ya bu portu kullanan süreci kapatın ya da backend için .env dosyanıza PORT=<başka port> ekleyin.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});