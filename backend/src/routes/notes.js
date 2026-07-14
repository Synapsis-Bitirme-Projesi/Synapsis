const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const {
  createEmptyWhiteboard,
  parseWhiteboardData,
  whiteboardToPlainText,
} = require('../utils/whiteboard');

let notesColumnsReady = false;

async function ensureNotesColumns() {
  if (notesColumnsReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const columns = [
    "ALTER TABLE notes ADD COLUMN IF NOT EXISTS course VARCHAR(255)",
    "ALTER TABLE notes ADD COLUMN IF NOT EXISTS course_name VARCHAR(255)",
    "ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags TEXT[]",
    "ALTER TABLE notes ADD COLUMN IF NOT EXISTS note_type VARCHAR(20) DEFAULT 'text'",
    "ALTER TABLE notes ADD COLUMN IF NOT EXISTS whiteboard_data JSONB DEFAULT '{}'::jsonb",
  ];

  for (const sql of columns) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.error('notes column ensure failed:', err.message);
    }
  }

  notesColumnsReady = true;
}

ensureNotesColumns().catch((err) => {
  console.error('Notes table init failed:', err.message);
});

function normalizeNoteType(value) {
  return value === 'whiteboard' ? 'whiteboard' : 'text';
}

function formatNote(note) {
  if (!note) return note;

  const noteType = normalizeNoteType(note.note_type);
  const whiteboard = parseWhiteboardData(note.whiteboard_data);

  return {
    ...note,
    course: note.course || note.course_name || null,
    note_type: noteType,
    whiteboard_data: whiteboard,
  };
}

function resolveContent({ noteType, content, whiteboardData, title }) {
  if (noteType === 'whiteboard') {
    const board = parseWhiteboardData(whiteboardData);
    const plain = whiteboardToPlainText(board, title);
    return plain || String(content || '');
  }
  return content ?? '';
}

// GET /api/notes
router.get('/', protect, async (req, res) => {
  try {
    await ensureNotesColumns();
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );

    res.json(result.rows.map(formatNote));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Notlar getirilemedi.' });
  }
});

// POST /api/notes
router.post('/', protect, async (req, res) => {
  try {
    await ensureNotesColumns();

    const { title, content, course_id, course, note_type, whiteboard_data } = req.body;
    const userId = req.user.userId;
    const noteType = normalizeNoteType(note_type);
    const whiteboardData = noteType === 'whiteboard'
      ? parseWhiteboardData(whiteboard_data || createEmptyWhiteboard())
      : createEmptyWhiteboard();
    const finalTitle = title || (noteType === 'whiteboard' ? 'New Whiteboard' : 'New Note');
    const finalContent = resolveContent({
      noteType,
      content,
      whiteboardData,
      title: finalTitle,
    });

    const result = await pool.query(
      `INSERT INTO notes (
         user_id, title, content, course_id, course, course_name, note_type, whiteboard_data
       ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        finalTitle,
        finalContent,
        course_id || null,
        course || null,
        noteType,
        JSON.stringify(whiteboardData),
      ]
    );

    res.status(201).json(formatNote(result.rows[0]));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Not olusturulamadi.' });
  }
});

// PUT /api/notes/:id
router.put('/:id', protect, async (req, res) => {
  try {
    await ensureNotesColumns();

    const { id } = req.params;
    const {
      title,
      content,
      course,
      courseName,
      course_name,
      note_type,
      whiteboard_data,
    } = req.body;
    const userId = req.user.userId;

    const existing = await pool.query(
      'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Not bulunamadi.' });
    }

    const current = existing.rows[0];
    const finalCourse = course !== undefined
      ? course
      : (courseName !== undefined
        ? courseName
        : (course_name !== undefined ? course_name : (current.course || current.course_name || null)));

    const noteType = note_type !== undefined
      ? normalizeNoteType(note_type)
      : normalizeNoteType(current.note_type);

    const whiteboardData = whiteboard_data !== undefined
      ? parseWhiteboardData(whiteboard_data)
      : parseWhiteboardData(current.whiteboard_data);

    const finalTitle = title !== undefined ? title : current.title;
    const finalContent = content !== undefined || whiteboard_data !== undefined || note_type !== undefined
      ? resolveContent({
          noteType,
          content: content !== undefined ? content : current.content,
          whiteboardData,
          title: finalTitle,
        })
      : current.content;

    const result = await pool.query(
      `UPDATE notes
       SET title = $1,
           content = $2,
           course = $3,
           course_name = $4,
           note_type = $5,
           whiteboard_data = $6,
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [
        finalTitle,
        finalContent,
        finalCourse,
        finalCourse,
        noteType,
        JSON.stringify(whiteboardData),
        id,
        userId,
      ]
    );

    res.json(formatNote(result.rows[0]));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Not guncellenemedi.' });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await ensureNotesColumns();
    const { id } = req.params;
    const userId = req.user.userId;
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Not bulunamadi.' });
    }
    res.json({ message: 'Not silindi.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Not silinemedi.' });
  }
});

module.exports = router;
