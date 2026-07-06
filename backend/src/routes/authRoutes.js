const express = require('express');
const router = express.Router();

// 1. Auth & Task Controller Fonksiyonları
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

// 2. AI Controller Fonksiyonları
const {
    streamAIResponse,
    saveArtifact,
    getArtifacts
} = require('../controllers/aiController');

// 3. Middleware
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
router.post('/tasks', protect, addTask);
router.get('/tasks', protect, getTasks);
router.delete('/tasks/:id', protect, deleteTask);
router.patch('/tasks/:id', protect, updateTask);

// --- AI Asistan & Artefakt Rotaları ---
router.post('/ai/chat', protect, streamAIResponse);           // Chat Akışı (Streaming)
router.post('/ai/artifacts', protect, saveArtifact);     // Çıktı Kaydetme
router.get('/ai/artifacts', protect, getArtifacts);       // Kayıtlı Çıktıları Listeleme

module.exports = router;