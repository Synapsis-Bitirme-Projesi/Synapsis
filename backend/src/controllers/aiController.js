const { GoogleGenAI } = require('@google/genai');
const pool = require('../config/db'); // Veritabanı bağlantısı

// SDK'yı API anahtarı ile başlatıyoruz
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const streamAIResponse = async (req, res) => {
    // Server-Sent Events (SSE) için HTTP header'larını ayarlıyoruz
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const { prompt, courseName } = req.body;

        // KRİTİK GÜVENCE: protect middleware'inden id veya userId olarak gelse de doğru eşleşsin
        const userId = req.user?.id || req.user?.userId;

        if (!userId) {
            res.write(`data: ${JSON.stringify({ error: "Kullanıcı oturumu doğrulanamadı." })}\n\n`);
            res.end();
            return;
        }

        let contextText = "";

        // Bağlam (Context) Hazırlığı: Eğer ders seçildiyse kullanıcının o derse ait notlarını çekiyoruz
        if (courseName && courseName !== "Select Course") {
            const notesQuery = await pool.query(
                'SELECT title, content FROM notes WHERE user_id = $1 AND (course = $2 OR tags @> ARRAY[$2]::varchar[])',
                [userId, courseName]
            );

            if (notesQuery.rows.length > 0) {
                contextText = `Kullanıcının ${courseName} dersi için aldığı gerçek ders notları aşağıdadır. Üreteceğin yanıtlarda ve sorulan sorularda öncelikle BU NOTLARI referans almalısın:\n`;
                notesQuery.rows.forEach(note => {
                    // HTML tag'lerini temizlemek istersen regex kullanabilirsin ancak Gemini HTML içeriği de başarıyla okur
                    contextText += `--- Not Başlığı: ${note.title} ---\nİçerik: ${note.content}\n\n`;
                });
            }
        }

        // Sistem Promptu şablonu
        const systemInstruction = `Sen Synapsis adında, üniversite öğrencilerine yardımcı olan akıllı bir akademik asistansın.
Kullanıcının adı Tolga. Yanıtlarını markdown formatında, anlaşılır ve akademik başarıyı odaklayan bir dilde ver.
Matematiksel ve fiziksel formülleri satır içinde veya blok halinde gösterirken kesinlikle standart LaTeX formatında (örneğin \\frac{a}{b} veya \\vec{v} gibi) yazmalısın.
Sana sağlanan ders notları bağlamına (Context) sıkı sıkıya sadık kalmaya çalış. Eğer bağlam yetersizse genel akademik bilgilerle destekle.

${contextText}`;

        // Gemini 2.5 Flash modelini streaming moduyla çağırıyoruz
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        });

        // Gelen parçaları (chunks) anında frontend'e basıyoruz
        for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
                res.write(`data: ${text}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (err) {
        console.error("AI Streaming Hatası:", err.message);
        res.write(`data: ${JSON.stringify({ error: "Yapay zeka yanıtı üretilirken bir hata oluştu." })}\n\n`);
        res.end();
    }
};

// Yeni bir yapay zeka çıktısını kaydetme
const saveArtifact = async (req, res) => {
    try {
        const { courseName, artifactType, title, content } = req.body;
        const userId = req.user?.id || req.user?.userId;

        if (!courseName || !artifactType || !title || !content) {
            return res.status(400).json({ error: "Eksik parametre gönderildi." });
        }

        const newArtifact = await pool.query(
            'INSERT INTO ai_artifacts (user_id, course_name, artifact_type, title, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userId, courseName, artifactType, title, content]
        );

        res.status(201).json(newArtifact.rows[0]);
    } catch (err) {
        console.error("Artifact kaydetme hatası:", err.message);
        res.status(500).json({ error: "Çıktı kaydedilemedi." });
    }
};

// Kullanıcının kayıtlı tüm çıktılarını getirme
const getArtifacts = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const artifacts = await pool.query(
            'SELECT * FROM ai_artifacts WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(artifacts.rows);
    } catch (err) {
        console.error("Artifact çekme hatası:", err.message);
        res.status(500).json({ error: "Kayıtlı çıktılar yüklenemedi." });
    }
};

module.exports = {
    streamAIResponse,
    saveArtifact,
    getArtifacts
};