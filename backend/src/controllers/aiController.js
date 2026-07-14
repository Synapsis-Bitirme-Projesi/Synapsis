const { GoogleGenAI } = require('@google/genai');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
const pool = require('../config/db');
const { noteToAiText } = require('../utils/whiteboard');

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
});

let notebookTablesReady = false;

async function ensureNotebookTables() {
    if (notebookTablesReady) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_sources (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            source_type VARCHAR(50) NOT NULL DEFAULT 'upload',
            mime_type VARCHAR(100),
            raw_text TEXT NOT NULL,
            origin_note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_source_chunks (
            id SERIAL PRIMARY KEY,
            source_id INTEGER NOT NULL REFERENCES ai_sources(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL,
            chunk_text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_sources_user_id ON ai_sources(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_source_chunks_source_id ON ai_source_chunks(source_id);`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_artifacts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_name VARCHAR(255),
            artifact_type VARCHAR(50) NOT NULL DEFAULT 'summary',
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_artifacts_user_id ON ai_artifacts(user_id);`);

    notebookTablesReady = true;
}

ensureNotebookTables().catch((err) => {
    console.error('Notebook AI table init failed:', err.message);
});

function getUserId(req) {
    return req.user?.userId ?? req.user?.id;
}

function normalizeText(text) {
    return String(text || '')
        .replace(/\r/g, '\n')
        .replace(/[\t ]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function chunkText(text, chunkSize = 180, overlap = 35) {
    const words = normalizeText(text).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const chunks = [];
    let start = 0;

    while (start < words.length) {
        const end = Math.min(words.length, start + chunkSize);
        chunks.push(words.slice(start, end).join(' '));
        if (end >= words.length) break;
        start = Math.max(0, end - overlap);
    }

    return chunks;
}

function tokenize(text) {
    return normalizeText(text)
        .toLowerCase()
        .match(/[a-z0-9ğüşöçıİ]+/gu) || [];
}

function scoreChunk(query, sourceTitle, chunkText) {
    const queryTokens = new Set(tokenize(query));
    const chunkTokens = new Set(tokenize(`${sourceTitle} ${chunkText}`));
    let score = 0;

    for (const token of queryTokens) {
        if (chunkTokens.has(token)) score += 2;
        if (chunkText.toLowerCase().includes(token)) score += 1;
    }

    const loweredQuery = query.toLowerCase();
    if (sourceTitle.toLowerCase().includes(loweredQuery)) score += 3;
    if (chunkText.toLowerCase().includes(loweredQuery)) score += 3;

    return score;
}

function buildModeInstruction(mode) {
    switch (mode) {
        case 'summary':
            return 'Give a concise study summary, key takeaways, and important terms.';
        case 'questions':
            return 'Create exam-style practice questions with short answers.';
        case 'cards':
            return 'Create flashcards in a compact front / back format.';
        case 'compare':
            return 'Compare the sources, note agreements, differences, and any conflicts.';
        case 'explain':
            return 'Explain the topic in simple student-friendly language using only the sources.';
        default:
            return 'Answer the user clearly and helpfully using the provided sources.';
    }
}

function buildSystemInstruction(mode) {
    return `You are Synapsis Notebook, a NotebookLM-style academic assistant for university students.
Use only the provided source excerpts as evidence.
If the sources do not cover the question, say what is missing instead of inventing facts.
Always respond in markdown.
Use citations like [Source: Title] whenever you rely on an excerpt.
${buildModeInstruction(mode)}`;
}

function buildContextBlock(chunks) {
    if (!chunks.length) return 'No source excerpts were found.';

    return chunks
        .map((item, index) => {
            return `Source ${index + 1}: ${item.source_title} (${item.source_type})\n${item.chunk_text}`;
        })
        .join('\n\n---\n\n');
}

async function extractTextFromUpload(file) {
    const filename = file.originalname || 'upload';
    const extension = path.extname(filename).toLowerCase();
    const mimeType = (file.mimetype || '').toLowerCase();

    if (mimeType.includes('pdf') || extension === '.pdf') {
        const parser = new PDFParse({ data: file.buffer });
        const parsed = await parser.getText();
        await parser.destroy();
        return parsed.text || '';
    }

    if (mimeType.includes('word') || extension === '.docx') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value || '';
    }

    return file.buffer.toString('utf8');
}

async function storeSourceContent({ userId, title, content, sourceType, mimeType, originNoteId = null }) {
    const cleanTitle = normalizeText(title) || 'Untitled Source';
    const cleanContent = normalizeText(content);

    if (!cleanContent) {
        throw new Error('Kaynak içeriği boş olamaz.');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let sourceRow = null;

        if (originNoteId) {
            const existing = await client.query(
                'SELECT id FROM ai_sources WHERE user_id = $1 AND origin_note_id = $2 LIMIT 1',
                [userId, originNoteId]
            );

            if (existing.rows.length > 0) {
                const existingId = existing.rows[0].id;
                await client.query('DELETE FROM ai_source_chunks WHERE source_id = $1', [existingId]);
                const updated = await client.query(
                    `UPDATE ai_sources
                     SET title = $1, source_type = $2, mime_type = $3, raw_text = $4, updated_at = NOW()
                     WHERE id = $5 AND user_id = $6
                     RETURNING *`,
                    [cleanTitle, sourceType, mimeType, cleanContent, existingId, userId]
                );
                sourceRow = updated.rows[0];
            }
        }

        if (!sourceRow) {
            const inserted = await client.query(
                `INSERT INTO ai_sources (user_id, title, source_type, mime_type, raw_text, origin_note_id)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [userId, cleanTitle, sourceType, mimeType, cleanContent, originNoteId]
            );
            sourceRow = inserted.rows[0];
        }

        const chunks = chunkText(cleanContent);
        for (let index = 0; index < chunks.length; index += 1) {
            await client.query(
                `INSERT INTO ai_source_chunks (source_id, user_id, chunk_index, chunk_text)
                 VALUES ($1, $2, $3, $4)`,
                [sourceRow.id, userId, index, chunks[index]]
            );
        }

        await client.query('COMMIT');
        return { source: sourceRow, chunkCount: chunks.length };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function loadNotebookChunks(userId, sourceIds = [], courseName = null) {
    const normalizedSourceIds = Array.isArray(sourceIds)
        ? sourceIds.map((value) => Number(value)).filter((value) => Number.isFinite(value))
        : [];
    const selectedCourse = normalizeText(courseName);

    if (normalizedSourceIds.length > 0) {
        const filtered = await pool.query(
            `SELECT s.id AS source_id, s.title AS source_title, s.source_type, c.chunk_index, c.chunk_text
             FROM ai_sources s
             INNER JOIN ai_source_chunks c ON c.source_id = s.id
             WHERE s.user_id = $1 AND s.id = ANY($2::int[])
             ORDER BY s.updated_at DESC, c.chunk_index ASC`,
            [userId, normalizedSourceIds]
        );

        if (filtered.rows.length > 0) {
            return filtered.rows;
        }
    }

    if (selectedCourse) {
        const courseNotes = await pool.query(
            `SELECT id, title, content, course, course_name, note_type, whiteboard_data
             FROM notes
             WHERE user_id = $1
               AND (
                 course ILIKE $2
                 OR course_name ILIKE $2
               )
             ORDER BY updated_at DESC`,
            [userId, selectedCourse]
        );

        const courseRows = [];
        for (const note of courseNotes.rows) {
            const plain = noteToAiText(note);
            const noteChunks = chunkText(plain || note.title || '');
            if (noteChunks.length === 0) continue;

            noteChunks.forEach((chunk, index) => {
                courseRows.push({
                    source_id: `note-${note.id}`,
                    source_title: `${note.title} (${selectedCourse})`,
                    source_type: note.note_type === 'whiteboard' ? 'whiteboard-note' : 'course-note',
                    chunk_index: index,
                    chunk_text: chunk,
                });
            });
        }

        if (courseRows.length > 0) {
            return courseRows;
        }
    }

    const notebookSources = await pool.query(
        `SELECT s.id AS source_id, s.title AS source_title, s.source_type, c.chunk_index, c.chunk_text
         FROM ai_sources s
         INNER JOIN ai_source_chunks c ON c.source_id = s.id
         WHERE s.user_id = $1
         ORDER BY s.updated_at DESC, c.chunk_index ASC`,
        [userId]
    );

    if (notebookSources.rows.length > 0) {
        return notebookSources.rows;
    }

    const notes = await pool.query(
        `SELECT id, title, content, note_type, whiteboard_data
         FROM notes
         WHERE user_id = $1
         ORDER BY updated_at DESC`,
        [userId]
    );

    const fallbackRows = [];
    for (const note of notes.rows) {
        const plain = noteToAiText(note);
        const noteChunks = chunkText(plain || note.title || '');
        if (noteChunks.length === 0) continue;

        noteChunks.forEach((chunk, index) => {
            fallbackRows.push({
                source_id: `note-${note.id}`,
                source_title: note.title,
                source_type: note.note_type === 'whiteboard' ? 'whiteboard-note' : 'note',
                chunk_index: index,
                chunk_text: chunk,
            });
        });
    }

    return fallbackRows;
}

function selectRelevantChunks(prompt, chunks, maxChunks = 7) {
    if (!chunks.length) return [];

    return [...chunks]
        .map((item) => ({
            ...item,
            relevance: scoreChunk(prompt, item.source_title, item.chunk_text),
        }))
        .sort((a, b) => {
            if (b.relevance !== a.relevance) return b.relevance - a.relevance;
            if (b.chunk_text.length !== a.chunk_text.length) return b.chunk_text.length - a.chunk_text.length;
            return String(a.source_title).localeCompare(String(b.source_title));
        })
        .slice(0, maxChunks);
}

function buildOfflineResponse(mode, prompt, chunks) {
    const sourceList = chunks.slice(0, 5).map((item) => `- [Source: ${item.source_title}] ${item.chunk_text.slice(0, 250)}${item.chunk_text.length > 250 ? '…' : ''}`);
    const intro = mode === 'summary'
        ? 'I could not reach a local LLM, but here is a source-grounded summary from your notebook.'
        : 'I could not reach a local LLM, but here are the most relevant excerpts from your notebook.';

    return `${intro}\n\n${sourceList.join('\n\n')}\n\nQuestion: ${prompt}`;
}

async function streamTextToResponse(res, text) {
    const parts = String(text || '')
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

    for (const part of parts) {
        res.write(`data: ${JSON.stringify({ delta: `${part}\n\n` })}\n\n`);
    }
}

async function streamLocalOllamaResponse(res, systemInstruction, userPrompt) {
    const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    const model = process.env.OLLAMA_MODEL || 'llama3.1';

    const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            stream: true,
            messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userPrompt },
            ],
        }),
    });

    if (!response.ok || !response.body) {
        throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const payload = JSON.parse(trimmed);
            const delta = payload.message?.content || payload.response || '';
            if (delta) {
                res.write(`data: ${JSON.stringify({ delta })}\n\n`);
            }

            if (payload.done) {
                res.write('data: [DONE]\n\n');
                return;
            }
        }
    }

    res.write('data: [DONE]\n\n');
}

async function streamGeminiResponse(res, systemInstruction, userPrompt) {
    if (!ai) {
        throw new Error('GEMINI_API_KEY tanımlı değil.');
    }

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
            systemInstruction,
            temperature: 0.4,
        },
    });

    for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
            res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
        }
    }

    res.write('data: [DONE]\n\n');
}

async function createTextSource(req, res) {
    try {
        await ensureNotebookTables();

        const userId = getUserId(req);
        const { title, content, sourceType = 'text', mimeType = 'text/plain' } = req.body;

        if (!userId) return res.status(401).json({ message: 'Yetki bilgisi eksik.' });
        if (!content) return res.status(400).json({ message: 'Kaynak içeriği gerekli.' });

        const result = await storeSourceContent({
            userId,
            title: title || 'Text Source',
            content,
            sourceType,
            mimeType,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Source create error:', error.message);
        res.status(500).json({ message: 'Kaynak oluşturulamadı.' });
    }
}

async function uploadSources(req, res) {
    try {
        await ensureNotebookTables();

        const userId = getUserId(req);
        const files = req.files || [];

        if (!userId) return res.status(401).json({ message: 'Yetki bilgisi eksik.' });
        if (files.length === 0) return res.status(400).json({ message: 'Yüklenecek dosya bulunamadı.' });

        const imported = [];

        for (const file of files) {
            const extractedText = await extractTextFromUpload(file);
            const result = await storeSourceContent({
                userId,
                title: path.parse(file.originalname || 'upload').name,
                content: extractedText,
                sourceType: 'upload',
                mimeType: file.mimetype || 'application/octet-stream',
            });
            imported.push({
                title: result.source.title,
                sourceId: result.source.id,
                chunkCount: result.chunkCount,
            });
        }

        res.status(201).json({ imported });
    } catch (error) {
        console.error('Upload source error:', error.message);
        res.status(500).json({ message: 'Dosyalar içe aktarılamadı.' });
    }
}

async function importNotesAsSources(req, res) {
    try {
        await ensureNotebookTables();

        const userId = getUserId(req);
        const noteIds = Array.isArray(req.body.noteIds) ? req.body.noteIds : [];

        if (!userId) return res.status(401).json({ message: 'Yetki bilgisi eksik.' });

        const notesQuery = noteIds.length > 0
            ? await pool.query(
                'SELECT id, title, content, note_type, whiteboard_data FROM notes WHERE user_id = $1 AND id = ANY($2::int[])',
                [userId, noteIds.map((value) => Number(value)).filter((value) => Number.isFinite(value))]
            )
            : await pool.query(
                'SELECT id, title, content, note_type, whiteboard_data FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
                [userId]
            );

        const imported = [];

        for (const note of notesQuery.rows) {
            const result = await storeSourceContent({
                userId,
                title: note.title,
                content: noteToAiText(note) || note.content || '',
                sourceType: note.note_type === 'whiteboard' ? 'whiteboard-note' : 'note',
                mimeType: 'text/plain',
                originNoteId: note.id,
            });
            imported.push({
                noteId: note.id,
                title: result.source.title,
                sourceId: result.source.id,
                chunkCount: result.chunkCount,
            });
        }

        res.status(201).json({ imported });
    } catch (error) {
        console.error('Import notes error:', error.message);
        res.status(500).json({ message: 'Notlar kaynaklara aktarılırken hata oluştu.' });
    }
}

async function listSources(req, res) {
    try {
        await ensureNotebookTables();

        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: 'Yetki bilgisi eksik.' });

        const sources = await pool.query(
            `SELECT s.id, s.title, s.source_type, s.mime_type, s.created_at, s.updated_at, COUNT(c.id)::int AS chunk_count
             FROM ai_sources s
             LEFT JOIN ai_source_chunks c ON c.source_id = s.id
             WHERE s.user_id = $1
             GROUP BY s.id
             ORDER BY s.updated_at DESC, s.created_at DESC`,
            [userId]
        );

        res.json(sources.rows);
    } catch (error) {
        console.error('List sources error:', error.message);
        res.status(500).json({ message: 'Kaynaklar getirilemedi.' });
    }
}

async function deleteSource(req, res) {
    try {
        await ensureNotebookTables();

        const userId = getUserId(req);
        const sourceId = Number(req.params.id);

        if (!userId) return res.status(401).json({ message: 'Yetki bilgisi eksik.' });
        if (!Number.isFinite(sourceId)) return res.status(400).json({ message: 'Geçersiz kaynak kimliği.' });

        const deleted = await pool.query(
            'DELETE FROM ai_sources WHERE id = $1 AND user_id = $2 RETURNING id',
            [sourceId, userId]
        );

        if (deleted.rows.length === 0) {
            return res.status(404).json({ message: 'Kaynak bulunamadı.' });
        }

        res.json({ message: 'Kaynak silindi.' });
    } catch (error) {
        console.error('Delete source error:', error.message);
        res.status(500).json({ message: 'Kaynak silinemedi.' });
    }
}

async function streamAIResponse(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        await ensureNotebookTables();

        const userId = getUserId(req);
        const { prompt, sourceIds = [], mode = 'chat', courseName = null } = req.body;

        if (!userId) {
            res.write(`data: ${JSON.stringify({ error: 'Yetki bilgisi eksik.' })}\n\n`);
            res.end();
            return;
        }

        if (!prompt || !String(prompt).trim()) {
            res.write(`data: ${JSON.stringify({ error: 'Prompt gerekli.' })}\n\n`);
            res.end();
            return;
        }

        const corpus = await loadNotebookChunks(userId, sourceIds, courseName);
        const relevantChunks = selectRelevantChunks(prompt, corpus);
        const contextBlock = buildContextBlock(relevantChunks);
        const systemInstruction = buildSystemInstruction(mode);
        const courseHint = courseName ? `\nFocus on the course: ${courseName}.` : '';
        const userPrompt = `User question:\n${prompt}${courseHint}\n\nSource excerpts:\n${contextBlock}`;

        try {
            if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) {
                await streamLocalOllamaResponse(res, systemInstruction, userPrompt);
            } else if (ai) {
                await streamGeminiResponse(res, systemInstruction, userPrompt);
            } else {
                await streamTextToResponse(res, buildOfflineResponse(mode, prompt, relevantChunks));
                res.write('data: [DONE]\n\n');
            }
        } catch (localError) {
            console.error('Primary AI stream failed, falling back:', localError.message);

            if (ai) {
                await streamGeminiResponse(res, systemInstruction, userPrompt);
            } else {
                await streamTextToResponse(res, buildOfflineResponse(mode, prompt, relevantChunks));
                res.write('data: [DONE]\n\n');
            }
        }

        res.end();
    } catch (error) {
        console.error('AI Streaming Hatası:', error.message);
        res.write(`data: ${JSON.stringify({ error: 'Yapay zeka yanıtı üretilirken bir hata oluştu.' })}\n\n`);
        res.end();
    }
}

const saveArtifact = async (req, res) => {
    try {
        await ensureNotebookTables();

        const { courseName, artifactType, title, content } = req.body;
        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({ error: 'Yetki bilgisi eksik.' });
        }

        if (!courseName || !artifactType || !title || !content) {
            return res.status(400).json({ error: 'Eksik parametre gönderildi.' });
        }

        const newArtifact = await pool.query(
            'INSERT INTO ai_artifacts (user_id, course_name, artifact_type, title, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userId, courseName, artifactType, title, content]
        );

        res.status(201).json(newArtifact.rows[0]);
    } catch (err) {
        console.error('Artifact kaydetme hatası:', err.message);
        res.status(500).json({ error: 'Çıktı kaydedilemedi.' });
    }
};

const getArtifacts = async (req, res) => {
    try {
        await ensureNotebookTables();

        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Yetki bilgisi eksik.' });
        }

        const artifacts = await pool.query(
            'SELECT * FROM ai_artifacts WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        res.json(artifacts.rows);
    } catch (err) {
        console.error('Artifact çekme hatası:', err.message);
        res.status(500).json({ error: 'Kayıtlı çıktılar yüklenemedi.' });
    }
};

module.exports = {
    upload,
    createTextSource,
    uploadSources,
    importNotesAsSources,
    listSources,
    deleteSource,
    streamAIResponse,
    saveArtifact,
    getArtifacts,
};
