const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool = require('../config/db');
const { emitCommunityPost, emitDirectMessage } = require('../utils/socketManager');

let communityTablesReady = false;
let directMessageTablesReady = false;
let contactRequestTablesReady = false;
let registrationVerificationTablesReady = false;

async function ensureCommunityTables() {
  if (communityTablesReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind VARCHAR(20) NOT NULL DEFAULT 'message' CHECK (kind IN ('message', 'note')),
      title VARCHAR(255),
      body TEXT NOT NULL,
      note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
    ON community_posts (created_at DESC)
  `);

  communityTablesReady = true;
}

async function ensureDirectMessageTables() {
  if (directMessageTablesReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id SERIAL PRIMARY KEY,
      sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_user_id
    ON direct_messages (sender_user_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_user_id
    ON direct_messages (recipient_user_id)
  `);

  directMessageTablesReady = true;
}

async function ensureContactRequestTables() {
  if (contactRequestTablesReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id SERIAL PRIMARY KEY,
      requester_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
      created_at TIMESTAMP DEFAULT NOW(),
      responded_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_requests_unique_pair
    ON contact_requests (requester_user_id, recipient_user_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_contact_requests_recipient_user_id
    ON contact_requests (recipient_user_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_contact_requests_requester_user_id
    ON contact_requests (requester_user_id)
  `);

  contactRequestTablesReady = true;
}

async function ensureRegistrationVerificationTables() {
  if (registrationVerificationTablesReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registration_verifications (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      full_name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_registration_verifications_email
    ON registration_verifications (email)
  `);

  registrationVerificationTablesReady = true;
}

const getSmtpSettings = () => {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const host = process.env.SMTP_HOST?.trim();
  const service = process.env.SMTP_SERVICE?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true';

  if (!user || !pass) {
    return null;
  }

  const providerDefaults = {
    'gmail.com': { host: 'smtp.gmail.com', port: 587, secure: false, service: 'gmail' },
    'googlemail.com': { host: 'smtp.gmail.com', port: 587, secure: false, service: 'gmail' },
    'hotmail.com': { host: 'smtp.office365.com', port: 587, secure: false, service: 'hotmail' },
    'outlook.com': { host: 'smtp.office365.com', port: 587, secure: false, service: 'hotmail' },
    'live.com': { host: 'smtp.office365.com', port: 587, secure: false, service: 'hotmail' },
    'yahoo.com': { host: 'smtp.mail.yahoo.com', port: 587, secure: false, service: 'yahoo' },
    'icloud.com': { host: 'smtp.mail.me.com', port: 587, secure: false, service: 'icloud' },
  };

  const domain = user.split('@')[1]?.toLowerCase();
  const defaultProvider = domain && providerDefaults[domain];

  if (service) {
    return {
      service,
      auth: { user, pass },
    };
  }

  if (host) {
    return {
      host,
      port,
      secure,
      auth: { user, pass },
    };
  }

  if (defaultProvider) {
    return {
      host: defaultProvider.host,
      port: defaultProvider.port,
      secure: defaultProvider.secure,
      auth: { user, pass },
    };
  }

  return null;
};

const getEmailTransport = () => {
  const smtpSettings = getSmtpSettings();
  if (!smtpSettings) {
    return null;
  }

  return nodemailer.createTransport(smtpSettings);
};

const sendEmailViaSendGrid = async (email, code) => {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  if (!apiKey) {
    throw new Error('SendGrid API anahtarı tanımlı değil. Lütfen .env dosyanıza SENDGRID_API_KEY ekleyin.');
  }

  if (!from) {
    throw new Error('E-posta gönderen adresi ayarlı değil. EMAIL_FROM veya SMTP_USER değerini .env dosyanıza ekleyin.');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }], subject: 'Synapsis Kayıt Doğrulama Kodu' }],
      from: { email: from },
      content: [
        {
          type: 'text/plain',
          value: `Synapsis kayıt doğrulama kodunuz: ${code}\n\nBu kod 10 dakika içinde geçerlidir.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid gönderimi başarısız: ${response.status} ${errorText}`);
  }
};

const sendVerificationEmail = async (email, code) => {
  const subject = 'Synapsis Kayıt Doğrulama Kodu';
  const text = `Synapsis kayıt doğrulama kodunuz: ${code}\n\nBu kod 10 dakika içinde geçerlidir.`;
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const transport = getEmailTransport();

  if (!transport && !process.env.SENDGRID_API_KEY) {
    throw new Error('SMTP yapılandırması eksik veya geçersiz. Lütfen .env dosyanızdaki SMTP_HOST, SMTP_USER, SMTP_PASS veya SENDGRID_API_KEY ayarlarını kontrol edin.');
  }

  if (transport) {
    try {
      await transport.sendMail({ from, to: email, subject, text });
      return;
    } catch (err) {
      console.error('SMTP gönderimi başarısız oldu:', err.message);
      if (process.env.SENDGRID_API_KEY) {
        await sendEmailViaSendGrid(email, code);
        return;
      }
      throw new Error('SMTP gönderimi başarısız oldu. Lütfen SMTP ayarlarınızı veya ağ erişiminizi kontrol edin.');
    }
  }

  await sendEmailViaSendGrid(email, code);
};

const generateVerificationCode = () => String(Math.floor(1000 + Math.random() * 9000));

const requestRegistrationCode = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'Lütfen ad, e-posta ve şifre girin.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
    }

    await ensureRegistrationVerificationTables();

    const password_hash = await bcrypt.hash(password, 10);
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO registration_verifications (email, full_name, password_hash, code, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email)
       DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, attempts = 0`,
      [email, full_name, password_hash, code, expiresAt]
    );

    await sendVerificationEmail(email, code);
    res.status(200).json({ message: 'Doğrulama kodu e-postanıza gönderildi.' });
  } catch (err) {
    console.error('Request Registration Code Error:', err);
    const clientMessage = err.message?.includes('SMTP yapılandırması eksik')
      ? err.message
      : 'Doğrulama kodu gönderilemedi.';
    res.status(500).json({ message: clientMessage });
  }
};

const confirmRegistrationCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'E-posta ve kod gerekli.' });
    }

    await ensureRegistrationVerificationTables();

    const result = await pool.query('SELECT * FROM registration_verifications WHERE email = $1', [email]);
    const record = result.rows[0];

    if (!record) {
      return res.status(404).json({ message: 'Kayıt isteği bulunamadı.' });
    }

    const now = new Date();
    if (new Date(record.expires_at) < now) {
      return res.status(400).json({ message: 'Kodun süresi doldu. Lütfen tekrar istekte bulunun.' });
    }

    if (record.attempts >= 5) {
      return res.status(429).json({ message: 'Çok fazla başarısız deneme. Lütfen tekrar kod isteyin.' });
    }

    if (record.code !== String(code)) {
      await pool.query('UPDATE registration_verifications SET attempts = attempts + 1 WHERE email = $1', [email]);
      return res.status(400).json({ message: 'Geçersiz doğrulama kodu.' });
    }

    const alreadyUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (alreadyUser.rowCount > 0) {
      await pool.query('DELETE FROM registration_verifications WHERE email = $1', [email]);
      return res.status(409).json({ message: 'Bu e-posta adresi zaten kayıtlı.' });
    }

    const defaultSettings = JSON.stringify({ widgets: ['classes', 'exams', 'tasks'], theme: 'glassmorphism' });
    const insertResult = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, settings) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name',
      [email, record.password_hash, record.full_name, defaultSettings]
    );

    await pool.query('DELETE FROM registration_verifications WHERE email = $1', [email]);

    res.status(201).json({ message: 'Kayıt doğrulandı ve kullanıcı oluşturuldu.', user: insertResult.rows[0] });
  } catch (err) {
    console.error('Confirm Registration Code Error:', err);
    res.status(500).json({ message: 'Kayıt doğrulaması başarısız.' });
  }
};

const areUsersConnected = async (userId, otherUserId) => {
  const connectionCheck = await pool.query(
    `SELECT 1 FROM contact_requests
     WHERE status = 'accepted'
       AND ((requester_user_id = $1 AND recipient_user_id = $2)
        OR (requester_user_id = $2 AND recipient_user_id = $1))
     LIMIT 1`,
    [userId, otherUserId]
  );
  return connectionCheck.rowCount > 0;
};

ensureCommunityTables().catch((err) => {
  console.error('Community tables init failed:', err.message);
});
ensureDirectMessageTables().catch((err) => {
  console.error('Direct message tables init failed:', err.message);
});
ensureContactRequestTables().catch((err) => {
  console.error('Contact request tables init failed:', err.message);
});
ensureRegistrationVerificationTables().catch((err) => {
  console.error('Registration verification tables init failed:', err.message);
});

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

const listCommunityPosts = async (req, res) => {
  try {
    await ensureCommunityTables();

    const result = await pool.query(`
      SELECT
        cp.id,
        cp.kind,
        cp.title,
        cp.body,
        cp.note_id,
        cp.created_at,
        u.id AS sender_id,
        u.full_name AS sender_name,
        n.title AS shared_note_title,
        n.content AS shared_note_content
      FROM community_posts cp
      JOIN users u ON u.id = cp.user_id
      LEFT JOIN notes n ON n.id = cp.note_id
      ORDER BY cp.created_at DESC
      LIMIT 80
    `);

    res.json({ posts: result.rows });
  } catch (err) {
    console.error('List Community Posts Error:', err.message);
    res.status(500).json({ error: 'Topluluk sohbeti yüklenemedi.' });
  }
};

const listUsers = async (req, res) => {
  try {
    await ensureContactRequestTables();

    const userId = req.user.userId;
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email
       FROM users u
       WHERE EXISTS (
         SELECT 1
         FROM contact_requests cr
         WHERE cr.status = 'accepted'
           AND ((cr.requester_user_id = $1 AND cr.recipient_user_id = u.id)
             OR (cr.recipient_user_id = $1 AND cr.requester_user_id = u.id))
       )
       ORDER BY u.full_name ASC`,
      [userId]
    );

    const users = result.rows.map((user) => ({ id: user.id, name: user.full_name, email: user.email }));
    res.json({ users });
  } catch (err) {
    console.error('List Users Error:', err.message);
    res.status(500).json({ error: 'Kullanıcı listesi yüklenemedi.' });
  }
};

const listAvailableUsers = async (req, res) => {
  try {
    await ensureContactRequestTables();

    const userId = req.user.userId;
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email
       FROM users u
       WHERE u.id <> $1
         AND u.id NOT IN (
           SELECT CASE
             WHEN requester_user_id = $1 THEN recipient_user_id
             ELSE requester_user_id
           END
           FROM contact_requests
           WHERE requester_user_id = $1 OR recipient_user_id = $1
         )
       ORDER BY u.full_name ASC`,
      [userId]
    );

    const users = result.rows.map((user) => ({ id: user.id, name: user.full_name, email: user.email }));
    res.json({ users });
  } catch (err) {
    console.error('List Available Users Error:', err.message);
    res.status(500).json({ error: 'Kullanıcı listesi yüklenemedi.' });
  }
};

const listContactRequests = async (req, res) => {
  try {
    await ensureContactRequestTables();

    const userId = req.user.userId;

    const incomingResult = await pool.query(
      `SELECT cr.id, cr.requester_user_id, cr.recipient_user_id, cr.status, cr.created_at,
              u.full_name AS requester_name, u.email AS requester_email
       FROM contact_requests cr
       JOIN users u ON u.id = cr.requester_user_id
       WHERE cr.recipient_user_id = $1 AND cr.status = 'pending'
       ORDER BY cr.created_at DESC`,
      [userId]
    );

    const outgoingResult = await pool.query(
      `SELECT cr.id, cr.requester_user_id, cr.recipient_user_id, cr.status, cr.created_at,
              u.full_name AS recipient_name, u.email AS recipient_email
       FROM contact_requests cr
       JOIN users u ON u.id = cr.recipient_user_id
       WHERE cr.requester_user_id = $1 AND cr.status = 'pending'
       ORDER BY cr.created_at DESC`,
      [userId]
    );

    res.json({ incoming: incomingResult.rows, outgoing: outgoingResult.rows });
  } catch (err) {
    console.error('List Contact Requests Error:', err.message);
    res.status(500).json({ error: 'İstekler yüklenemedi.' });
  }
};

const sendContactRequest = async (req, res) => {
  try {
    await ensureContactRequestTables();

    const requesterId = req.user.userId;
    const { recipientUserId } = req.body;
    const recipientId = Number(recipientUserId);

    if (!recipientId || Number.isNaN(recipientId) || recipientId === requesterId) {
      return res.status(400).json({ error: 'Geçerli bir kullanıcı seçilmelidir.' });
    }

    const userExists = await pool.query('SELECT id, full_name FROM users WHERE id = $1', [recipientId]);
    if (userExists.rowCount === 0) {
      return res.status(404).json({ error: 'Alıcı kullanıcı bulunamadı.' });
    }

    const existing = await pool.query(
      `SELECT id, requester_user_id, recipient_user_id, status
       FROM contact_requests
       WHERE (requester_user_id = $1 AND recipient_user_id = $2)
          OR (requester_user_id = $2 AND recipient_user_id = $1)
       LIMIT 1`,
      [requesterId, recipientId]
    );

    if (existing.rowCount > 0) {
      const existingRequest = existing.rows[0];
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ error: 'Bu kullanıcıyla zaten bağlantınız var.' });
      }

      if (existingRequest.status === 'pending') {
        if (existingRequest.requester_user_id === requesterId) {
          return res.status(400).json({ error: 'Bu kullanıcıya zaten bir istek gönderdiniz.' });
        }

        const accepted = await pool.query(
          `UPDATE contact_requests
           SET status = 'accepted', responded_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [existingRequest.id]
        );

        return res.status(200).json({ request: accepted.rows[0], accepted: true });
      }

      if (existingRequest.status === 'declined') {
        return res.status(400).json({ error: 'Bu kullanıcıya daha önce bir istek gönderdiniz ve reddedildi.' });
      }
    }

    const insertResult = await pool.query(
      `INSERT INTO contact_requests (requester_user_id, recipient_user_id)
       VALUES ($1, $2)
       RETURNING *`,
      [requesterId, recipientId]
    );

    res.status(201).json({ request: insertResult.rows[0] });
  } catch (err) {
    console.error('Send Contact Request Error:', err.message);
    res.status(500).json({ error: 'İstek gönderilemedi.' });
  }
};

const respondContactRequest = async (req, res) => {
  try {
    await ensureContactRequestTables();

    const userId = req.user.userId;
    const requestId = Number(req.params.id);
    const { action } = req.body;

    if (!requestId || Number.isNaN(requestId)) {
      return res.status(400).json({ error: 'Geçerli bir istek seçilmelidir.' });
    }

    if (!['accepted', 'declined'].includes(action)) {
      return res.status(400).json({ error: 'Geçerli bir işlem seçilmelidir.' });
    }

    const requestResult = await pool.query(
      'SELECT * FROM contact_requests WHERE id = $1 AND recipient_user_id = $2 AND status = $3',
      [requestId, userId, 'pending']
    );

    if (requestResult.rowCount === 0) {
      return res.status(404).json({ error: 'Bekleyen istek bulunamadı.' });
    }

    const updateResult = await pool.query(
      `UPDATE contact_requests
       SET status = $1, responded_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [action, requestId]
    );

    res.json({ request: updateResult.rows[0] });
  } catch (err) {
    console.error('Respond Contact Request Error:', err.message);
    res.status(500).json({ error: 'İstek yanıtlanamadı.' });
  }
};

const listDirectMessages = async (req, res) => {
  try {
    await ensureDirectMessageTables();
    await ensureContactRequestTables();

    const userId = req.user.userId;
    const otherUserId = Number(req.query.withUserId);

    if (!otherUserId || Number.isNaN(otherUserId)) {
      return res.status(400).json({ error: 'Geçerli bir kullanıcı seçilmelidir.' });
    }

    if (!(await areUsersConnected(userId, otherUserId))) {
      return res.status(403).json({ error: 'Bu kullanıcıyla mesajlaşma izniniz yok.' });
    }

    const result = await pool.query(
      `SELECT dm.id, dm.sender_user_id, dm.recipient_user_id, dm.content, dm.created_at,
              u.full_name AS sender_name
       FROM direct_messages dm
       JOIN users u ON u.id = dm.sender_user_id
       WHERE (dm.sender_user_id = $1 AND dm.recipient_user_id = $2)
          OR (dm.sender_user_id = $2 AND dm.recipient_user_id = $1)
       ORDER BY dm.created_at ASC`,
      [userId, otherUserId]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    console.error('List Direct Messages Error:', err.message);
    res.status(500).json({ error: 'Mesajlar yüklenemedi.' });
  }
};

const createDirectMessage = async (req, res) => {
  try {
    await ensureDirectMessageTables();
    await ensureContactRequestTables();

    const senderId = req.user.userId;
    const { recipientUserId, content } = req.body;
    const recipientId = Number(recipientUserId);
    const body = String(content || '').trim();

    if (!recipientId || Number.isNaN(recipientId) || recipientId === senderId) {
      return res.status(400).json({ error: 'Geçerli bir alıcı seçilmelidir.' });
    }
    if (!body) {
      return res.status(400).json({ error: 'Mesaj içeriği zorunludur.' });
    }

    if (!(await areUsersConnected(senderId, recipientId))) {
      return res.status(403).json({ error: 'Bu kullanıcıyla mesajlaşma izniniz yok. Önce bağlantı isteği gönderin ve kabul edilmesini bekleyin.' });
    }

    const userExists = await pool.query('SELECT id, full_name FROM users WHERE id = $1', [recipientId]);
    if (userExists.rowCount === 0) {
      return res.status(404).json({ error: 'Alıcı kullanıcı bulunamadı.' });
    }

    const insertResult = await pool.query(
      `INSERT INTO direct_messages (sender_user_id, recipient_user_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [senderId, recipientId, body]
    );

    const message = insertResult.rows[0];
    const enriched = await pool.query(
      `SELECT dm.id, dm.sender_user_id, dm.recipient_user_id, dm.content, dm.created_at,
              u.full_name AS sender_name
       FROM direct_messages dm
       JOIN users u ON u.id = dm.sender_user_id
       WHERE dm.id = $1`,
      [message.id]
    );

    const directMessage = enriched.rows[0];
    emitDirectMessage(directMessage, recipientId);

    res.status(201).json({ message: directMessage });
  } catch (err) {
    console.error('Create Direct Message Error:', err.message);
    res.status(500).json({ error: 'Mesaj gönderilemedi.' });
  }
};

const createCommunityPost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { kind = 'message', title, body, noteId } = req.body;
    const safeKind = kind === 'note' ? 'note' : 'message';
    const safeBody = String(body || '').trim();

    if (!safeBody) {
      return res.status(400).json({ error: 'Gönderi içeriği zorunludur.' });
    }

    let resolvedNoteId = noteId ? Number(noteId) : null;
    let resolvedTitle = String(title || '').trim();
    let resolvedBody = safeBody;

    if (safeKind === 'note') {
      if (!resolvedNoteId || Number.isNaN(resolvedNoteId)) {
        return res.status(400).json({ error: 'Paylaşılacak not seçilmedi.' });
      }

      const noteResult = await pool.query(
        'SELECT id, title, content FROM notes WHERE id = $1 AND user_id = $2',
        [resolvedNoteId, userId]
      );

      if (noteResult.rowCount === 0) {
        return res.status(404).json({ error: 'Paylaşmak istediğiniz not bulunamadı.' });
      }

      const sharedNote = noteResult.rows[0];
      resolvedTitle = resolvedTitle || sharedNote.title || 'Shared note';
      resolvedBody = sharedNote.content || '';
    }

    const insertResult = await pool.query(
      `INSERT INTO community_posts (user_id, kind, title, body, note_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, safeKind, resolvedTitle || null, resolvedBody, resolvedNoteId]
    );

    const post = insertResult.rows[0];
    const enriched = await pool.query(`
      SELECT
        cp.id,
        cp.kind,
        cp.title,
        cp.body,
        cp.note_id,
        cp.created_at,
        u.id AS sender_id,
        u.full_name AS sender_name,
        n.title AS shared_note_title,
        n.content AS shared_note_content
      FROM community_posts cp
      JOIN users u ON u.id = cp.user_id
      LEFT JOIN notes n ON n.id = cp.note_id
      WHERE cp.id = $1
    `, [post.id]);

    const createdPost = enriched.rows[0];
    emitCommunityPost(createdPost);
    res.status(201).json({ post: createdPost });
  } catch (err) {
    console.error('Create Community Post Error:', err.message);
    res.status(500).json({ error: 'Topluluk paylaşımı oluşturulamadı.' });
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
  requestRegistrationCode,
  confirmRegistrationCode,
  login,
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
};