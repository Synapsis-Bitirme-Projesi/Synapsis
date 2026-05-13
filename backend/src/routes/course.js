const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Kendi DB bağlantı dosyanın yoluna göre düzelt
const { protect } = require('../middleware/authMiddleware'); // İçerideki gerçek isim neyse o// 1. CREATE: Yeni ders ekleme (POST /api/courses)
router.post('/', protect, async (req, res) => {
    try {
        const { course_name, course_code, day_of_week, start_time, end_time, location, color_code } = req.body;
        const userId = req.user.userId;

        const newCourse = await pool.query(
`INSERT INTO courses 
            (user_id, course_name, course_code, day_of_week, start_time, end_time, location, color_code) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [userId, course_name, course_code, day_of_week, start_time, end_time, location, color_code || '#3B82F6']
        );

        res.status(201).json(newCourse.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Ders eklenirken bir hata oluştu." });
    }
});

// 2. READ: Kullanıcının tüm ders programını getirme (GET /api/courses)
router.get('/', protect, async (req, res) => {
    try {
        const userId = req.user.userId;
        const courses = await pool.query(
            "SELECT * FROM courses WHERE user_id = $1 ORDER BY day_of_week ASC, start_time ASC",
            [userId] // Artık $1 olduğu için bu hata vermeyecek
        );
        res.json(courses.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Ders programı getirilemedi." });
    }
});

// 3. UPDATE: Mevcut bir dersi güncelleme (PUT /api/courses/:id)
router.put('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { course_name, course_code, day_of_week, start_time, end_time, location, color_code } = req.body;
        const userId = req.user.userId;

        const updateCourse = await pool.query(
            `UPDATE courses SET 
            course_name = $1, course_code = $2, day_of_week = $3, 
            start_time = $4, end_time = $5, location = $6, color_code = $7 
            WHERE id = $8 AND user_id = $9 RETURNING *`,
            [course_name, course_code, day_of_week, start_time, end_time, location, color_code, id, userId]
        );

        if (updateCourse.rows.length === 0) {
            return res.status(404).json({ message: "Ders bulunamadı veya yetkiniz yok." });
        }

        res.json(updateCourse.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Ders güncellenirken bir hata oluştu." });
    }
});

// 4. DELETE: Dersi programdan silme (DELETE /api/courses/:id)
router.delete('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const deleteCourse = await pool.query(
            "DELETE FROM courses WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );

        if (deleteCourse.rows.length === 0) {
            return res.status(404).json({ message: "Ders bulunamadı veya yetkiniz yok." });
        }

        res.json({ message: "Ders başarıyla silindi." });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Ders silinirken bir hata oluştu." });
    }
});

module.exports = router;