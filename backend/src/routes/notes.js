const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

// GET /api/notes
router.get('/', protect, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query(
            'SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Notlar getirilemedi.' });
    }
});

// POST /api/notes
router.post('/', protect, async (req, res) => {
    try {
        const { title, content, course_id } = req.body;
        const userId = req.user.userId;
        const result = await pool.query(
            'INSERT INTO notes (user_id, title, content, course_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, title || 'New Note', content || '', course_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Not oluşturulamadı.' });
    }
});

// PUT /api/notes/:id
router.put('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        const userId = req.user.userId;
        const result = await pool.query(
            'UPDATE notes SET title = $1, content = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
            [title, content, id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Not bulunamadı.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Not güncellenemedi.' });
    }
});

// DELETE /api/notes/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const result = await pool.query(
            'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Not bulunamadı.' });
        }
        res.json({ message: 'Not silindi.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Not silinemedi.' });
    }
});

module.exports = router;
