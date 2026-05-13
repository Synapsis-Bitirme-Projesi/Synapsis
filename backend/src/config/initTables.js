const pool = require('./db');

const addScheduleColumns = async () => {
  const columns = [
    'day_of_week INTEGER',
    'start_time TIME',
    'end_time TIME',
    'location VARCHAR(100)'
  ];
  for (const col of columns) {
    try {
      await pool.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS ${col}`);
      console.log(`Added ${col}`);
    } catch (e) {
      console.log('Column ${col} ok:', e.message);
    }
  }
};
addScheduleColumns();

pool.query(`
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    due_date TIMESTAMP,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).then(() => console.log('Tasks OK')).catch(e => console.error('Tasks error:', e));