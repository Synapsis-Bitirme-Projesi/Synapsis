const express = require('express');
const router = express.Router();

// 1. Controller'dan tüm fonksiyonları (yeni eklediklerimiz dahil) çekiyoruz
const {
    register,
    login,
    getMe,
    updateSettings,
    updateProfile,
    getTheme,
    updateTheme,
    addTask,
    getTasks,
    deleteTask,
    updateTask
} = require('../controllers/authController');

// 2. Auth koruması sağlayan middleware
const { protect } = require('../middleware/authMiddleware');

// --- Auth Rotaları ---
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// --- Profil & Ayar Rotaları ---
router.put('/update-settings', protect, updateSettings);
router.put('/update-profile', protect, updateProfile);

// --- Tema (Dark/Light) Rotaları ---
router.get('/settings/theme', getTheme);
router.post('/settings/theme', protect, updateTheme);

// --- Görev (Task) Rotaları ---
// Frontend'den axios.post('/api/auth/tasks') ve axios.get('/api/auth/tasks') ile ulaşırsın
router.post('/tasks', protect, addTask);
router.get('/tasks', protect, getTasks);
// Mevcut rotaların altına ekle
router.delete('/tasks/:id', protect, deleteTask);
router.patch('/tasks/:id', protect, updateTask);

module.exports = router;