const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { GoogleGenAI } = require('@google/genai');
const crypto = require('crypto');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const pool = require('../config/db');
const { noteToAiText } = require('../utils/whiteboard');

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const ollamaEnabled = Boolean(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL || process.env.OLLAMA_ENABLED === 'true');

if (!ai) {
    console.warn('GEMINI_API_KEY is missing. Study Buddy will fall back to Ollama/offline excerpts.');
} else {
    console.log('Gemini client ready for Study Buddy.');
}
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
});

const STUDY_CACHE_MODES = new Set(['summary', 'questions', 'cards', 'compare', 'explain']);
const OUTPUT_FORMATS = new Set(['markdown', 'bullets', 'outline', 'qa']);
const OUTPUT_DEPTHS = new Set(['brief', 'standard', 'detailed']);
const OUTPUT_TONES = new Set(['neutral', 'exam', 'friendly', 'academic']);

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

    // Optional metadata columns for saved study outputs
    await pool.query(`ALTER TABLE ai_artifacts ADD COLUMN IF NOT EXISTS output_format VARCHAR(50) DEFAULT 'markdown';`);
    await pool.query(`ALTER TABLE ai_artifacts ADD COLUMN IF NOT EXISTS output_depth VARCHAR(50) DEFAULT 'standard';`);
    await pool.query(`ALTER TABLE ai_artifacts ADD COLUMN IF NOT EXISTS output_tone VARCHAR(50) DEFAULT 'neutral';`);
    await pool.query(`ALTER TABLE ai_artifacts ADD COLUMN IF NOT EXISTS citations JSONB DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE ai_artifacts ADD COLUMN IF NOT EXISTS cache_key VARCHAR(64);`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_study_cache (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            cache_key VARCHAR(64) NOT NULL,
            course_name VARCHAR(255),
            mode VARCHAR(50) NOT NULL,
            output_format VARCHAR(50) NOT NULL DEFAULT 'markdown',
            output_depth VARCHAR(50) NOT NULL DEFAULT 'standard',
            output_tone VARCHAR(50) NOT NULL DEFAULT 'neutral',
            prompt TEXT NOT NULL,
            content TEXT NOT NULL,
            citations JSONB DEFAULT '[]'::jsonb,
            source_fingerprint TEXT,
            hit_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (user_id, cache_key)
        );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_study_cache_user_id ON ai_study_cache(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_study_cache_key ON ai_study_cache(cache_key);`);

    // Remove previously cached offline/fallback answers so Gemini can regenerate them.
    await pool.query(`
        DELETE FROM ai_study_cache
        WHERE content ILIKE '%could not reach a local LLM%'
           OR content ILIKE '%Yapay zeka yanıtı üretilirken bir hata oluştu%'
    `);

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
            return `Create 4-8 exam-style practice questions with short answers.
Use EXACTLY this structure for every item so the UI can hide answers:

### Question 1
<question text>

### Answer 1
<short answer>

### Question 2
...

Do not put the answer inside the question block. Keep answers concise.`;
        case 'cards':
            return `Create 6-12 flashcards.
Use EXACTLY this structure for every card so the UI can render flip cards:

### Card 1
Front: <term or prompt>
Back: <definition or answer>

### Card 2
Front: ...
Back: ...

Keep each front/back to 1-3 short sentences. Do not use other formats.`;
        case 'compare':
            return 'Compare the sources, note agreements, differences, and any conflicts.';
        case 'explain':
            return 'Explain the topic in simple student-friendly language using only the sources.';
        default:
            return 'Answer the user clearly and helpfully using the provided sources.';
    }
}

function normalizePreferences({ format, depth, tone, outputFormat, outputDepth, outputTone } = {}) {
    const resolvedFormat = String(format || outputFormat || 'markdown').toLowerCase();
    const resolvedDepth = String(depth || outputDepth || 'standard').toLowerCase();
    const resolvedTone = String(tone || outputTone || 'neutral').toLowerCase();

    return {
        format: OUTPUT_FORMATS.has(resolvedFormat) ? resolvedFormat : 'markdown',
        depth: OUTPUT_DEPTHS.has(resolvedDepth) ? resolvedDepth : 'standard',
        tone: OUTPUT_TONES.has(resolvedTone) ? resolvedTone : 'neutral',
    };
}

function buildPreferenceInstruction(prefs) {
    const formatLine = {
        markdown: 'Format the answer as clean markdown with short headings.',
        bullets: 'Format the answer mostly as bullet points; keep prose minimal.',
        outline: 'Format the answer as a hierarchical outline (I / A / 1 style or nested bullets).',
        qa: 'Format the answer as Q&A pairs (Question then Answer).',
    }[prefs.format];

    const depthLine = {
        brief: 'Keep it brief: only the essentials (roughly 5-8 short bullets or equivalent).',
        standard: 'Use a balanced depth suitable for a study session.',
        detailed: 'Go deeper: include nuance, edge cases, and extra examples when sources support them.',
    }[prefs.depth];

    const toneLine = {
        neutral: 'Use a clear, neutral study tone.',
        exam: 'Use an exam-prep tone: precise, test-oriented, and action-focused.',
        friendly: 'Use a friendly tutor tone that stays encouraging and simple.',
        academic: 'Use a formal academic tone appropriate for university coursework.',
    }[prefs.tone];

    return `${formatLine}\n${depthLine}\n${toneLine}`;
}

function buildSystemInstruction(mode, prefs = normalizePreferences()) {
    return `You are Synapsis Notebook, a NotebookLM-style academic assistant for university students.
Use only the provided source excerpts as evidence.
If the sources do not cover the question, say what is missing instead of inventing facts.
${buildPreferenceInstruction(prefs)}
When you rely on an excerpt, cite it inline using the exact citation tags provided in the source block, e.g. [S1] or [S2].
At the end of the response, add a short "Sources used" section listing the citation tags you referenced with their titles.
Do not invent source tags that were not provided.
${buildModeInstruction(mode)}`;
}

function buildCitationRecords(chunks) {
    return chunks.map((item, index) => {
        const tag = `S${index + 1}`;
        const sourceId = item.source_id;
        const noteMatch = String(sourceId || '').match(/^note-(\d+)$/i);
        const excerpt = normalizeText(item.chunk_text).slice(0, 220);

        return {
            tag,
            sourceId,
            noteId: noteMatch ? Number(noteMatch[1]) : (item.origin_note_id || null),
            title: item.source_title,
            sourceType: item.source_type,
            chunkIndex: Number(item.chunk_index) || 0,
            excerpt: excerpt + (String(item.chunk_text || '').length > 220 ? '…' : ''),
        };
    });
}

function buildContextBlock(chunks, citations = []) {
    if (!chunks.length) return 'No source excerpts were found.';

    return chunks
        .map((item, index) => {
            const citation = citations[index] || { tag: `S${index + 1}`, title: item.source_title, chunkIndex: item.chunk_index };
            const noteHint = citation.noteId ? ` | note#${citation.noteId}` : '';
            return `[${citation.tag}] ${citation.title} (${item.source_type}${noteHint} | block ${citation.chunkIndex})\n${item.chunk_text}`;
        })
        .join('\n\n---\n\n');
}

function buildCacheKey({ userId, mode, prefs, prompt, courseName, sourceFingerprint }) {
    const payload = JSON.stringify({
        userId: Number(userId),
        mode: String(mode || 'chat'),
        format: prefs.format,
        depth: prefs.depth,
        tone: prefs.tone,
        prompt: normalizeText(prompt).toLowerCase(),
        courseName: normalizeText(courseName || '').toLowerCase(),
        sourceFingerprint: String(sourceFingerprint || ''),
    });

    return crypto.createHash('sha256').update(payload).digest('hex');
}

function buildSourceFingerprint(chunks, sourceIds = []) {
    const fromChunks = chunks
        .map((item) => `${item.source_id}:${item.chunk_index}:${normalizeText(item.chunk_text).slice(0, 40)}`)
        .sort()
        .join('|');
    const fromIds = (Array.isArray(sourceIds) ? sourceIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
        .sort((a, b) => a - b)
        .join(',');
    return crypto.createHash('sha256').update(`${fromIds}::${fromChunks}`).digest('hex');
}

async function getCachedStudySet(userId, cacheKey) {
    const result = await pool.query(
        `SELECT id, content, citations, mode, output_format, output_depth, output_tone, course_name, hit_count
         FROM ai_study_cache
         WHERE user_id = $1 AND cache_key = $2
         LIMIT 1`,
        [userId, cacheKey]
    );

    if (result.rows.length === 0) return null;

    await pool.query(
        `UPDATE ai_study_cache
         SET hit_count = hit_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [result.rows[0].id]
    );

    return result.rows[0];
}

async function saveStudyCache({
    userId,
    cacheKey,
    courseName,
    mode,
    prefs,
    prompt,
    content,
    citations,
    sourceFingerprint,
}) {
    if (!content || !String(content).trim()) return null;

    const result = await pool.query(
        `INSERT INTO ai_study_cache (
            user_id, cache_key, course_name, mode,
            output_format, output_depth, output_tone,
            prompt, content, citations, source_fingerprint, hit_count
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,0)
         ON CONFLICT (user_id, cache_key)
         DO UPDATE SET
            content = EXCLUDED.content,
            citations = EXCLUDED.citations,
            source_fingerprint = EXCLUDED.source_fingerprint,
            course_name = EXCLUDED.course_name,
            updated_at = NOW()
         RETURNING id`,
        [
            userId,
            cacheKey,
            courseName || null,
            mode,
            prefs.format,
            prefs.depth,
            prefs.tone,
            normalizeText(prompt),
            String(content),
            JSON.stringify(citations || []),
            sourceFingerprint || null,
        ]
    );

    return result.rows[0] || null;
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
            `SELECT s.id AS source_id, s.title AS source_title, s.source_type, s.origin_note_id,
                    c.chunk_index, c.chunk_text
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
                    origin_note_id: note.id,
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
        `SELECT s.id AS source_id, s.title AS source_title, s.source_type, s.origin_note_id,
                c.chunk_index, c.chunk_text
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
                origin_note_id: note.id,
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

function buildOfflineResponse(mode, prompt, chunks, citations = []) {
    const sourceList = (citations.length ? citations : chunks.slice(0, 5).map((item, index) => ({
        tag: `S${index + 1}`,
        title: item.source_title,
        excerpt: item.chunk_text.slice(0, 250) + (item.chunk_text.length > 250 ? '…' : ''),
    }))).slice(0, 5).map((item) => `- [${item.tag || 'S?'}] ${item.title || item.source_title}: ${item.excerpt || item.chunk_text?.slice(0, 250) || ''}`);

    const intro = mode === 'summary'
        ? 'I could not reach a local LLM, but here is a source-grounded summary from your notebook.'
        : 'I could not reach a local LLM, but here are the most relevant excerpts from your notebook.';

    return `${intro}\n\n${sourceList.join('\n\n')}\n\nQuestion: ${prompt}\n\n### Sources used\n${sourceList.map((line) => line.replace(/^-\s*/, '')).join('\n')}`;
}

function isDegradedResponse(text) {
    const value = String(text || '');
    return /could not reach a local LLM/i.test(value)
        || /Yapay zeka yanıtı üretilirken bir hata oluştu/i.test(value);
}

async function generateModelStream(res, systemInstruction, userPrompt, {
    mode,
    prompt,
    relevantChunks,
    citations,
}) {
    const errors = [];

    // Prefer Gemini whenever a key is configured.
    if (ai) {
        try {
            const text = await streamGeminiResponse(res, systemInstruction, userPrompt);
            if (text && text.trim()) {
                return { text, provider: 'gemini', degraded: false };
            }
            errors.push('Gemini returned an empty response.');
        } catch (error) {
            errors.push(`Gemini: ${error.message}`);
            console.error('Gemini stream failed:', error.message);
        }
    }

    // Optional local Ollama fallback (only when explicitly enabled).
    if (ollamaEnabled) {
        try {
            const text = await streamLocalOllamaResponse(res, systemInstruction, userPrompt);
            if (text && text.trim()) {
                return { text, provider: 'ollama', degraded: false };
            }
            errors.push('Ollama returned an empty response.');
        } catch (error) {
            errors.push(`Ollama: ${error.message}`);
            console.error('Ollama stream failed:', error.message);
        }
    }

    console.error('All AI providers failed, using offline excerpts:', errors.join(' | '));
    const text = await streamTextToResponse(
        res,
        buildOfflineResponse(mode, prompt, relevantChunks, citations)
    );
    return { text, provider: 'offline', degraded: true };
}

async function streamTextToResponse(res, text) {
    const full = String(text || '');
    const parts = full
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

    for (const part of parts) {
        res.write(`data: ${JSON.stringify({ delta: `${part}\n\n` })}\n\n`);
    }

    return full;
}

async function streamLocalOllamaResponse(res, systemInstruction, userPrompt) {
    const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    const model = process.env.OLLAMA_MODEL || 'llama3.1';
    const controller = new AbortController();
    const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 8000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
        response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                model,
                stream: true,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: userPrompt },
                ],
            }),
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`Ollama timed out after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok || !response.body) {
        throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

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
                fullText += delta;
                res.write(`data: ${JSON.stringify({ delta })}\n\n`);
            }

            if (payload.done) {
                return fullText;
            }
        }
    }

    return fullText;
}

async function streamGeminiResponse(res, systemInstruction, userPrompt) {
    if (!ai) {
        throw new Error('GEMINI_API_KEY tanımlı değil.');
    }

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-flash-latest',
        contents: userPrompt,
        config: {
            systemInstruction,
            temperature: 0.4,
        },
    });

    let fullText = '';
    for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
            fullText += text;
            res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
        }
    }

    return fullText;
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
        const {
            prompt,
            sourceIds = [],
            mode = 'chat',
            courseName = null,
            format,
            depth,
            tone,
            outputFormat,
            outputDepth,
            outputTone,
            bypassCache = false,
        } = req.body;

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

        const prefs = normalizePreferences({ format, depth, tone, outputFormat, outputDepth, outputTone });
        const corpus = await loadNotebookChunks(userId, sourceIds, courseName);
        const relevantChunks = selectRelevantChunks(prompt, corpus);
        const citations = buildCitationRecords(relevantChunks);
        const contextBlock = buildContextBlock(relevantChunks, citations);
        const systemInstruction = buildSystemInstruction(mode, prefs);
        const courseHint = courseName ? `\nFocus on the course: ${courseName}.` : '';
        const preferenceHint = `\nOutput preferences → format: ${prefs.format}, depth: ${prefs.depth}, tone: ${prefs.tone}.`;
        const userPrompt = `User question:\n${prompt}${courseHint}${preferenceHint}\n\nSource excerpts (cite with the [S#] tags):\n${contextBlock}`;

        const sourceFingerprint = buildSourceFingerprint(relevantChunks, sourceIds);
        const cacheKey = buildCacheKey({
            userId,
            mode,
            prefs,
            prompt,
            courseName,
            sourceFingerprint,
        });
        const canUseCache = STUDY_CACHE_MODES.has(String(mode || '')) && !bypassCache;

        // Emit citation metadata first so the UI can show source references
        res.write(`data: ${JSON.stringify({
            meta: {
                citations,
                preferences: prefs,
                cacheKey,
                cached: false,
            },
        })}\n\n`);

        if (canUseCache) {
            const cached = await getCachedStudySet(userId, cacheKey);
            if (cached?.content && !isDegradedResponse(cached.content)) {
                res.write(`data: ${JSON.stringify({
                    meta: {
                        citations: cached.citations || citations,
                        preferences: {
                            format: cached.output_format || prefs.format,
                            depth: cached.output_depth || prefs.depth,
                            tone: cached.output_tone || prefs.tone,
                        },
                        cacheKey,
                        cached: true,
                        cacheHits: Number(cached.hit_count || 0) + 1,
                        provider: 'cache',
                    },
                })}\n\n`);
                await streamTextToResponse(res, cached.content);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }

            // Drop previously cached offline/fallback answers so Gemini can regenerate.
            if (cached?.content && isDegradedResponse(cached.content)) {
                try {
                    await pool.query(
                        'DELETE FROM ai_study_cache WHERE user_id = $1 AND cache_key = $2',
                        [userId, cacheKey]
                    );
                } catch (cacheCleanupError) {
                    console.error('Degraded cache cleanup failed:', cacheCleanupError.message);
                }
            }
        }

        const generation = await generateModelStream(res, systemInstruction, userPrompt, {
            mode,
            prompt,
            relevantChunks,
            citations,
        });
        const fullText = generation.text || '';

        res.write(`data: ${JSON.stringify({
            meta: {
                citations,
                preferences: prefs,
                cacheKey,
                cached: false,
                provider: generation.provider,
                degraded: Boolean(generation.degraded),
            },
        })}\n\n`);

        if (canUseCache && fullText && !generation.degraded && !isDegradedResponse(fullText)) {
            try {
                await saveStudyCache({
                    userId,
                    cacheKey,
                    courseName,
                    mode,
                    prefs,
                    prompt,
                    content: fullText,
                    citations,
                    sourceFingerprint,
                });
            } catch (cacheError) {
                console.error('Study cache save failed:', cacheError.message);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('AI Streaming Hatası:', error.message);
        try {
            res.write(`data: ${JSON.stringify({ error: 'Yapay zeka yanıtı üretilirken bir hata oluştu.' })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        } catch {
            // response may already be closed
        }
    }
}

const saveArtifact = async (req, res) => {
    try {
        await ensureNotebookTables();

        const {
            courseName,
            artifactType,
            title,
            content,
            citations = [],
            format,
            depth,
            tone,
            outputFormat,
            outputDepth,
            outputTone,
            cacheKey = null,
        } = req.body;
        const userId = getUserId(req);
        const prefs = normalizePreferences({ format, depth, tone, outputFormat, outputDepth, outputTone });

        if (!userId) {
            return res.status(401).json({ error: 'Yetki bilgisi eksik.' });
        }

        if (!courseName || !artifactType || !title || !content) {
            return res.status(400).json({ error: 'Eksik parametre gönderildi.' });
        }

        const newArtifact = await pool.query(
            `INSERT INTO ai_artifacts (
                user_id, course_name, artifact_type, title, content,
                output_format, output_depth, output_tone, citations, cache_key
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
             RETURNING *`,
            [
                userId,
                courseName,
                artifactType,
                title,
                content,
                prefs.format,
                prefs.depth,
                prefs.tone,
                JSON.stringify(Array.isArray(citations) ? citations : []),
                cacheKey || null,
            ]
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
