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

        // Frontend'in kafası karışmasın diye course alanını netleştirip gönderiyoruz
        const formattedNotes = result.rows.map(note => ({
            ...note,
            course: note.course || note.course_name || null
        }));

        res.json(formattedNotes);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Notlar getirilemedi.' });
    }
});

// POST /api/notes
router.post('/', protect, async (req, res) => {
    try {
        const { title, content, course_id, course } = req.body;
        const userId = req.user.userId;

        // Yeni bir not oluşturulurken de course bilgisini kaydediyoruz
        const result = await pool.query(
            'INSERT INTO notes (user_id, title, content, course_id, course, course_name) VALUES ($1, $2, $3, $4, $5, $5) RETURNING *',
            [userId, title || 'New Note', content || '', course_id || null, course || null]
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
        const { title, content, course, courseName, course_name } = req.body;
        const userId = req.user.userId;

        // Olası tüm ders isimlerini süzüp en net olanı alıyoruz
        const finalCourse = course || courseName || course_name || null;

        console.log(`--- notes.js ÜZERİNDEN NOT GÜNCELLEMESİ ÇALIŞTI ---`);
        console.log(`Not ID: ${id}, Kaydedilecek Ders: ${finalCourse}`);

        const result = await pool.query(
            'UPDATE notes SET title = $1, content = $2, course = $3, course_name = $4, updated_at = NOW() WHERE id = $5 AND user_id = $6 RETURNING *',
            [title, content, finalCourse, finalCourse, id, userId]
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