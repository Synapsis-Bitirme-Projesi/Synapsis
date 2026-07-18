const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Pool, types } = require('pg');

// Return DATE columns as plain "YYYY-MM-DD" strings instead of Date objects
// to prevent UTC-to-local timezone shift when the value crosses midnight
types.setTypeParser(1082, val => val);

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Bağlantı hatası:', err.stack);
  } else {
    console.log('Bağlantı başarılı! Veritabanı saati:', res.rows[0].now);
  }
});

// user_id is the filter column on every notes/courses/exams/tasks query;
// without an index each lookup is a full table scan that gets slower as a
// user's data grows (large note sets, dense calendars).
const PERFORMANCE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_exams_user_id ON exams(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)',
];

async function ensurePerformanceIndexes() {
  for (const sql of PERFORMANCE_INDEXES) {
    try {
      await pool.query(sql);
    } catch (err) {
      // Tables are created lazily by their own routes on first use; skip
      // quietly if one doesn't exist yet instead of crashing startup.
      console.error('Index ensure skipped:', err.message);
    }
  }
}

ensurePerformanceIndexes();

module.exports = pool;