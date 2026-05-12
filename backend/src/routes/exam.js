const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware'); // O sihirli satırımız!

// 1. CREATE: Yeni Sınav Ekleme (POST /api/exams)
router.post('/', protect, async (req, res) => {
    try {
        const { course_name, exam_date, exam_time, location, description, color_code } = req.body;
        const userId = req.user.id || req.user.userId; // Token'dan gelen kullanıcı ID'si

        const newExam = await pool.query(
            `INSERT INTO exams 
            (user_id, course_name, exam_date, exam_time, location, description, color_code) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [userId, course_name, exam_date, exam_time, location, description, color_code || '#EF4444']
        );

        res.status(201).json(newExam.rows[0]);
    } catch (error) {
        console.error("Sınav ekleme hatası:", error.message);
        res.status(500).json({ message: "Sınav eklenirken bir hata oluştu." });
    }
});

// 2. READ: Kullanıcının tüm sınavlarını getirme (GET /api/exams)
router.get('/', async (req, res) => {
    try {
        const userId = 1;
        // Sınavları tarihe göre (yakından uzağa) sıralıyoruz
        const exams = await pool.query(
            "SELECT * FROM exams WHERE user_id = $1 ORDER BY exam_date ASC, exam_time ASC",
            [userId]
        );
        res.json(exams.rows);
    } catch (error) {
        console.error("Sınavları getirme hatası:", error.message);
        res.status(500).json({ message: "Sınavlar getirilemedi." });
    }
});

// 3. UPDATE: Sınavı güncelleme (PUT /api/exams/:id)
router.put('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { course_name, exam_date, exam_time, location, description, color_code } = req.body;
        const userId = req.user.id;

        const updateExam = await pool.query(
            `UPDATE exams SET 
            course_name = $1, exam_date = $2, exam_time = $3, 
            location = $4, description = $5, color_code = $6 
            WHERE id = $7 AND user_id = $8 RETURNING *`,
            [course_name, exam_date, exam_time, location, description, color_code, id, userId]
        );

        if (updateExam.rows.length === 0) {
            return res.status(404).json({ message: "Sınav bulunamadı veya yetkiniz yok." });
        }

        res.json(updateExam.rows[0]);
    } catch (error) {
        console.error("Sınav güncelleme hatası:", error.message);
        res.status(500).json({ message: "Sınav güncellenirken hata oluştu." });
    }
});

// 4. DELETE: Sınavı silme (DELETE /api/exams/:id)
router.delete('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const deleteExam = await pool.query(
            "DELETE FROM exams WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (deleteExam.rows.length === 0) {
            return res.status(404).json({ message: "Sınav bulunamadı veya yetkiniz yok." });
        }

        res.json({ message: "Sınav başarıyla silindi." });
    } catch (error) {
        console.error("Sınav silme hatası:", error.message);
        res.status(500).json({ message: "Sınav silinirken hata oluştu." });
    }
});

module.exports = router;