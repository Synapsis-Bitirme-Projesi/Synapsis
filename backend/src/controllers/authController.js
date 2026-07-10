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

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    res.json({ message: 'Profil güncellendi', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};
// Kullanıcı temasını getir
const getTheme = async (req, res) => {
  try {
    const userId = req.user.userId; // Middleware'den gelen id
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    res.json({ theme: user.rows[0]?.theme || 'light' });
  } catch (err) {
    res.status(500).json({ error: "Tema çekilemedi" });
  }
};

// Kullanıcı temasını güncelle
const updateTheme = async (req, res) => {
  try {
    const { theme } = req.body;
    const userId = req.user.userId;
    await pool.query('UPDATE users SET theme = $1 WHERE id = $2', [theme, userId]);
    res.json({ message: "Tema başarıyla güncellendi" });
  } catch (err) {
    res.status(500).json({ error: "Tema güncellenemedi" });
  }
};

const addTask = async (req, res) => {
  try {
    const { title, course, priority, description, due_date, type } = req.body;
    const userId = req.user.userId;

    let course_id = course ? parseInt(course) : null;
    if (isNaN(course_id)) {
      course_id = null;
    }
    const priority_val = (priority || 'medium').toLowerCase();
    const type_val = type || 'Task';

    if (!title) {
      return res.status(400).json({ error: "Görev başlığı zorunludur." });
    }

    const newTask = await pool.query(
      "INSERT INTO tasks (user_id, title, course_id, description, due_date, priority, status, type) VALUES ($1, $2, $3, $4, $5, $6, 'todo', $7) RETURNING *",
      [userId, title, course_id, description, due_date, priority_val, type_val]
    );

    res.status(201).json(newTask.rows[0]);
  } catch (err) {
    console.error("DB Hatası:", err.message);
    res.status(500).json({ error: "Görev kaydedilemedi." });
  }
};

// Kullanıcının Görevlerini Listeleme
const getTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tasks = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(tasks.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Görevler getirilemedi." });
  }
};
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Sadece kullanıcıya ait olan görevi sil (Güvenlik için)
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Görev bulunamadı veya yetkiniz yok." });
    }

    res.json({ message: "Görev başarıyla silindi." });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Görev silinirken hata oluştu." });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Status-only update (toggle complete)
    if (req.body.title === undefined) {
      const { status } = req.body;
      const result = await pool.query(
        'UPDATE tasks SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
        [status, id, userId]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Task not found." });
      return res.json(result.rows[0]);
    }

    // Full edit update
    const { title, description, due_date, priority, type, course } = req.body;
    let course_id = course ? parseInt(course) : null;
    if (isNaN(course_id)) course_id = null;

    const result = await pool.query(
      `UPDATE tasks SET title=$1, description=$2, due_date=$3, priority=$4, type=$5, course_id=$6
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [title, description || null, due_date || null, (priority || 'medium').toLowerCase(), type || 'Task', course_id, id, userId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Task not found." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update Task Error:", err.message);
    res.status(500).json({ error: "Failed to update task." });
  }
};
const addNote = async (req, res) => {
  try {
    const { title, content, course, tags } = req.body;
    const userId = req.user.userId;

    if (!title) {
      return res.status(400).json({ error: "Not başlığı zorunludur." });
    }

    const newNote = await pool.query(
      "INSERT INTO notes (user_id, title, content, course, tags) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [userId, title, content || "", course || null, tags || []]
    );

    res.status(201).json(newNote.rows[0]);
  } catch (err) {
    console.error("DB Not Ekleme Hatası:", err.message);
    res.status(500).json({ error: "Not kaydedilemedi." });
  }
};

// 2. Kullanıcının Tüm Notlarını Listeleme
// 2. Kullanıcının Tüm Notlarını Listeleme (Ders bilgisiyle beraber)
const getNotes = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    const notes = await pool.query(
      "SELECT id, title, content, course, course_name, created_at, updated_at, tags FROM notes WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    // Front-end'in kafası karışmasın diye her satıra hem course hem course_name basıyoruz
    const formattedNotes = notes.rows.map(note => ({
      ...note,
      course: note.course || note.course_name || null
    }));

    res.json(formattedNotes);
  } catch (err) {
    console.error("DB Not Listeleme Hatası:", err.message);
    res.status(500).json({ error: "Notlar getirilemedi." });
  }
};

// 3. Not Güncelleme (Ders bağlama/çözme burayı kullanacak)
const updateNote = async (req, res) => {
  try {
    const { id } = req.params;

    // Olası tüm isim kombinasyonlarını body'den süzüyoruz
    const { title, content, course, courseName, course_name } = req.body;
    const userId = req.user?.id || req.user?.userId;

    // Gelen değerlerden hangisi doluysa onu 'finalCourse' olarak seçiyoruz
    const finalCourse = course || courseName || course_name || null;

    console.log(`--- VERİTABANI YAZMA İŞLEMİ ---`);
    console.log(`Gelen Değerler -> course: ${course}, courseName: ${courseName}`);
    console.log(`Kaydedilecek Net Ders: ${finalCourse}`);

    // Veritabanındaki iki kolona da bu nihai değeri yazıyoruz
    const result = await pool.query(
      "UPDATE notes SET title = $1, content = $2, course = $3, course_name = $4 WHERE id = $5 AND user_id = $6 RETURNING *",
      [title, content, finalCourse, finalCourse, id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Not bulunamadı veya yetkiniz yok." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("DB Not Güncelleme Hatası:", err.message);
    res.status(500).json({ error: "Not güncellenemedi." });
  }
};

// 4. Not Silme
const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      "DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Not bulunamadı veya yetkiniz yok." });
    }

    res.json({ message: "Not başarıyla silindi." });
  } catch (err) {
    console.error("DB Not Silme Hatası:", err.message);
    res.status(500).json({ error: "Not silinirken hata oluştu." });
  }
};

module.exports = {
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
  updateTask,
  addNote,
  getNotes,
  updateNote,
  deleteNote
};