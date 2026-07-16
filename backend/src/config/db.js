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
module.exports = pool;