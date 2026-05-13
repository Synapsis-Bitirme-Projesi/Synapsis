const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

// 1. CREATE: Yeni görev ekleme (POST /api/tasks)
router.post('/', protect, async (req, res) => {
    try {
        const { title, description, priority, course_id, due_date, completed = false } = req.body;
        const userId = req.user.userId;

        const newTask = await pool.query(
            `INSERT INTO tasks 
            (user_id, title, description, priority, course_id, due_date, completed) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [userId, title, description || null, priority || 'medium', course_id || null, due_date || null, completed]
        );

        res.status(201).json(newTask.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Görev eklenirken bir hata oluştu." });
    }
});

// 2. READ: Kullanıcının tüm görevlerini getirme (GET /api/tasks)
router.get('/', protect, async (req, res) => {
    try {
        const userId = req.user.userId;
        const tasks = await pool.query(
            "SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );
        res.json(tasks.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Görevler getirilemedi." });
    }
});

// 3. UPDATE: Mevcut görevi güncelleme (PUT /api/tasks/:id)
router.put('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, priority, course_id, due_date, completed } = req.body;
        const userId = req.user.userId;

        const updateTask = await pool.query(
            `UPDATE tasks SET 
            title = $1, description = $2, priority = $3, 
            course_id = $4, due_date = $5, completed = $6
            WHERE id = $7 AND user_id = $8 RETURNING *`,
            [title, description || null, priority || 'medium', course_id || null, due_date || null, completed !== undefined ? completed : null, id, userId]
        );

        if (updateTask.rows.length === 0) {
            return res.status(404).json({ message: "Görev bulunamadı veya yetkiniz yok." });
        }

        res.json(updateTask.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Görev güncellenirken bir hata oluştu." });
    }
});

// 4. DELETE: Görevi silme (DELETE /api/tasks/:id)
router.delete('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const deleteTask = await pool.query(
            "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (deleteTask.rows.length === 0) {
            return res.status(404).json({ message: "Görev bulunamadı veya yetkiniz yok." });
        }

        res.json({ message: "Görev başarıyla silindi." });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Görev silinirken bir hata oluştu." });
    }
});

module.exports = router;