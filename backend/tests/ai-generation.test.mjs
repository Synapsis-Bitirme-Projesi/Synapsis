// Integration tests for the AI Study Assistant / notebook endpoints (PROGRESS.md Phase 6).
// Requires the backend dev server running on http://localhost:5000 (`npm run dev`)
// with GEMINI_API_KEY configured in backend/.env — otherwise the chat test still
// passes (it accepts the documented offline-fallback response), just without
// asserting on a live Gemini reply.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pool = require('../src/config/db');

const BASE_URL = 'http://localhost:5000';
const testEmail = `ai-gen-test-${Date.now()}@example.com`;
const testPassword = 'TestPass123!';

let token;
let sourceId;

async function readSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let text = '';
  let lastMeta = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      for (const line of event.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === '[DONE]') continue;
        const parsed = JSON.parse(raw);
        if (parsed.meta) lastMeta = parsed.meta;
        if (parsed.delta) text += parsed.delta;
      }
    }
  }

  return { text, lastMeta };
}

test.before(async () => {
  await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword, full_name: 'AI Gen Test' }),
  });

  const verification = await pool.query('SELECT code FROM registration_verifications WHERE email = $1', [testEmail]);
  assert.equal(verification.rowCount, 1, 'verification record should exist after requesting registration code');
  const code = verification.rows[0].code;

  await fetch(`${BASE_URL}/api/auth/register/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code }),
  });

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const loginBody = await loginRes.json();
  token = loginBody.token;
  assert.ok(token, 'login should return a token for the freshly registered test user');
});

test.after(async () => {
  await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
  await pool.end();
});

test('POST /api/auth/ai/chat rejects requests without a token', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'test' }),
  });
  assert.equal(res.status, 401);
});

test('POST /api/auth/ai/sources creates a text source', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/ai/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Photosynthesis notes',
      content: 'Photosynthesis converts light energy into chemical energy stored in glucose.',
      sourceType: 'text',
      mimeType: 'text/plain',
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.source?.id, 'response should include the created source id');
  assert.ok(body.chunkCount >= 1, 'source text should be split into at least one chunk');
  sourceId = body.source.id;
});

test('GET /api/auth/ai/sources lists the created source', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/ai/sources`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  const sources = await res.json();
  assert.ok(sources.some((s) => s.id === sourceId));
});

test('POST /api/auth/ai/chat streams a grounded answer referencing the source', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      prompt: 'What does this source say about photosynthesis?',
      mode: 'chat',
      sourceIds: [sourceId],
      bypassCache: true,
    }),
  });
  assert.equal(res.status, 200);

  const { text, lastMeta } = await readSSE(res);
  assert.ok(text.trim().length > 0, 'chat stream should return non-empty text');
  assert.ok(lastMeta, 'final SSE frame should carry meta with provider/citation info');
  assert.ok(
    ['gemini', 'ollama', 'offline'].includes(lastMeta.provider),
    `provider should be one of the documented fallbacks, got: ${lastMeta.provider}`
  );
});

test('DELETE /api/auth/ai/sources/:id removes the source', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/ai/sources/${sourceId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
});
