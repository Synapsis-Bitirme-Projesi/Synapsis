const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * POST /api/auth/register
 * Yeni kullanıcı oluşturur ve varsayılan dashboard ayarlarını atar.
 */
const register = async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ message: 'Lütfen tüm alanları doldurun.' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Phase 2: Varsayılan widget ve tema ayarları
    const defaultSettings = JSON.stringify({
      widgets: ['classes', 'exams', 'tasks'],
      theme: 'glassmorphism'
    });

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, settings) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name',
      [email, password_hash, full_name, defaultSettings]
    );

    res.status(201).json({
      message: 'Hesap başarıyla oluşturuldu.',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

/**
 * POST /api/auth/login
 * Kullanıcı girişi ve JWT oluşturma.
 */
const login = async (req, res) => {
  const { email, password } = req.body;
  console.log(`Giriş denemesi: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ message: 'E-posta ve şifre gereklidir.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Geçersiz bilgiler.' });
    }

    const dbPassword = user.password_hash || user.password;

    // Hibrit Şifre Kontrolü
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, dbPassword);
    } catch (e) {
      passwordMatch = false;
    }

    // Bcrypt hash değilse düz metin kontrolü
    if (!passwordMatch && password === dbPassword) {
      passwordMatch = true;
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Geçersiz bilgiler.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // JSON parse işlemi için yardımcı kontrol
    const safeSettings = (settings) => {
      if (typeof settings === 'string') {
        try { return JSON.parse(settings); } catch (e) { return { widgets: [] }; }
      }
      return settings || { widgets: [] };
    };

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name, // NextAuth session için kritik
        settings: safeSettings(user.settings)
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};



/**
 * GET /api/auth/me
 * Mevcut oturumdaki kullanıcı bilgilerini getirir.
 */
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, settings FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        settings: typeof user.settings === 'string' ? JSON.parse(user.settings) : user.settings
      }
    });
  } catch (err) {
    console.error('GetMe Error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

/**
 * PUT /api/auth/update-settings
 * Dashboard widget tercihlerini günceller.
 */
const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const userId = req.user.userId;

    const result = await pool.query(
      'UPDATE users SET settings = $1 WHERE id = $2 RETURNING settings',
      [JSON.stringify(settings), userId]
    );

    res.json({
      message: 'Ayarlar başarıyla güncellendi.',
      settings: typeof result.rows[0].settings === 'string'
        ? JSON.parse(result.rows[0].settings)
        : result.rows[0].settings
    });
  } catch (err) {
    console.error('Update Settings Error:', err);
    res.status(500).json({ message: 'Ayarlar güncellenirken bir hata oluştu.' });
  }
};
// backend/src/controllers/authController.js

const updateProfile = async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const userId = req.user.userId; // authMiddleware'den geliyor

    const result = await pool.query(
      'UPDATE users SET full_name = $1, email = $2 WHERE id = $3 RETURNING id, full_name, email',
      [full_name, email, userId]
    );

    res.json({
      message: 'Profil başarıyla güncellendi.',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ message: 'Profil güncellenirken bir hata oluştu.' });
  }
};

// module.exports kısmına eklemeyi unutma:
module.exports = { register, login, getMe, updateSettings, updateProfile };
