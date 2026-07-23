const express = require('express');
const router = express.Router();

// 1. Auth & Task Controller Fonksiyonları
const {
    login,
    requestRegistrationCode,
    confirmRegistrationCode,
    getMe,
    updateSettings,
    updateProfile,
    getTheme,
    updateTheme,
    listCommunityPosts,
    createCommunityPost,
    listUsers,
    listAvailableUsers,
    listContactRequests,
    sendContactRequest,
    respondContactRequest,
    listDirectMessages,
    createDirectMessage,
    addTask,
    getTasks,
    deleteTask,
    updateTask,
    addNote,
    getNotes,
    updateNote,
    deleteNote
} = require('../controllers/authController');

// 2. AI Controller Fonksiyonları
const {
    upload,
    createTextSource,
    uploadSources,
    importNotesAsSources,
    listSources,
    deleteSource,
    streamAIResponse,
    saveArtifact,
    getArtifacts
} = require('../controllers/aiController');

// 3. Middleware
const { protect } = require('../middleware/authMiddleware');

// --- Auth Rotaları ---
router.post('/register', requestRegistrationCode);
router.post('/register/confirm', confirmRegistrationCode);
router.post('/login', login);
router.get('/me', protect, getMe);

// --- Profil & Ayar Rotaları ---
router.put('/update-settings', protect, updateSettings);
router.put('/update-profile', protect, updateProfile);

// --- Tema (Dark/Light) Rotaları ---
router.get('/settings/theme', getTheme);
router.post('/settings/theme', protect, updateTheme);

// --- Topluluk Sohbeti Rotaları ---
router.get('/community/posts', protect, listCommunityPosts);
router.post('/community/posts', protect, createCommunityPost);

// --- Kullanıcılar Arası Mesajlaşma Rotaları ---
router.get('/users', protect, listUsers);
router.get('/users/available', protect, listAvailableUsers);
router.get('/users/requests', protect, listContactRequests);
router.post('/users/requests', protect, sendContactRequest);
router.post('/users/requests/:id/respond', protect, respondContactRequest);
router.get('/direct/messages', protect, listDirectMessages);
router.post('/direct/messages', protect, createDirectMessage);

// --- Görev (Task) Rotaları ---
router.post('/tasks', protect, addTask);
router.get('/tasks', protect, getTasks);
router.delete('/tasks/:id', protect, deleteTask);
router.patch('/tasks/:id', protect, updateTask);

// --- AI Asistan & Artefakt Rotaları ---
router.get('/ai/sources', protect, listSources);
router.post('/ai/sources', protect, createTextSource);
router.post('/ai/sources/upload', protect, upload.array('files', 10), uploadSources);
router.post('/ai/sources/import-notes', protect, importNotesAsSources);
router.delete('/ai/sources/:id', protect, deleteSource);
router.post('/ai/chat', protect, streamAIResponse);           // Chat Akışı (Streaming)
router.post('/ai/artifacts', protect, saveArtifact);     // Çıktı Kaydetme
router.get('/ai/artifacts', protect, getArtifacts);       // Kayıtlı Çıktıları Listeleme
// Eğer notes kelimesi ana rota prefix'indeyse (örneğin app.use('/api/notes', notesRoutes)) sadece /:id olur:
router.put('/:id', protect, updateNote);

// Eğer ana rota /api ise şu şekilde olmalıdır:
router.put('/notes/:id', protect, updateNote);
router.post('/notes', protect, addNote);

router.get('/notes', protect, getNotes);

router.put('/notes/:id', protect, updateNote);

router.delete('/notes/:id', protect, deleteNote);
module.exports = router;