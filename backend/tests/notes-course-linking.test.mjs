// Integration tests for note-course linking (PROGRESS.md Phase 6).
// Requires the backend dev server running on http://localhost:5000 (`npm run dev`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pool = require('../src/config/db');

const BASE_URL = 'http://localhost:5000';
const testEmail = `notes-link-test-${Date.now()}@example.com`;
const testPassword = 'TestPass123!';

let token;
let noteId;

test.before(async () => {
  await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword, full_name: 'Notes Link Test' }),
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

test('GET /api/notes rejects requests without a token', async () => {
  const res = await fetch(`${BASE_URL}/api/notes`);
  assert.equal(res.status, 401);
});

test('POST /api/notes creates an unlinked note', async () => {
  const res = await fetch(`${BASE_URL}/api/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'Linking test note', content: 'Body text', course: null }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.course, null);
  noteId = body.id;
  assert.ok(noteId, 'created note should have an id');
});

test('PUT /api/notes/:id links the note to a course', async () => {
  const res = await fetch(`${BASE_URL}/api/notes/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Linking test note',
      content: 'Body text',
      course: 'Test Course 101',
      courseName: 'Test Course 101',
    }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.course, 'Test Course 101');
});

test('GET /api/notes reflects the linked course', async () => {
  const res = await fetch(`${BASE_URL}/api/notes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  const notes = await res.json();
  const found = notes.find((n) => n.id === noteId);
  assert.ok(found, 'linked note should appear in the notes list');
  assert.equal(found.course, 'Test Course 101');
});

test('PUT /api/notes/:id unlinks the note when course is null', async () => {
  const res = await fetch(`${BASE_URL}/api/notes/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'Linking test note', content: 'Body text', course: null, courseName: null }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.course, null, 'note should be unlinked after sending course: null');
});

test('PUT /api/notes/:id returns 404 for a note owned by another user or missing', async () => {
  const res = await fetch(`${BASE_URL}/api/notes/99999999`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'x', content: 'y', course: null }),
  });
  assert.equal(res.status, 404);
});

test('DELETE /api/notes/:id removes the note', async () => {
  const res = await fetch(`${BASE_URL}/api/notes/${noteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
});
