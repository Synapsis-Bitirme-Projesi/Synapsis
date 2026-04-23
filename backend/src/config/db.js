const { Pool } = require('pg');
require('dotenv').config();

// Single pool instance reused across all queries.
// To switch from local PostgreSQL to Azure, only DATABASE_URL in .env needs to change.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Uncomment the line below when connecting to Azure (requires SSL):
  // ssl: { rejectUnauthorized: false }
});

module.exports = pool;
