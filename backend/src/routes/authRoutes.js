const express = require('express');
const router = express.Router();

// 1. BURAYA updateProfile fonksiyonunu da ekledik:
const {
    register,
    login,
    getMe,
    updateSettings,
    updateProfile
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);

// Sadece giriş yapmış kullanıcılar kendi bilgilerini görebilir
router.get('/me', protect, getMe);

// Ayarlar ve Profil güncelleme rotaları
router.put('/update-settings', protect, updateSettings);
router.put('/update-profile', protect, updateProfile);

module.exports = router;