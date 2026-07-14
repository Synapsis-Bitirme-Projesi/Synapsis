import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

// Compile-free runtime check via dynamic import of TS is not available;
// mirror the pure helpers with a tiny JS reimplementation path by requiring backend util.
const require = createRequire(import.meta.url);
const {
  parseWhiteboardData,
  whiteboardToPlainText,
  noteToAiText,
} = require('../../../../backend/src/utils/whiteboard.js');

test('parseWhiteboardData returns empty board for invalid input', () => {
  const board = parseWhiteboardData('not-json');
  assert.equal(board.version, 1);
  assert.deepEqual(board.nodes, []);
  assert.deepEqual(board.strokes, []);
});

test('whiteboardToPlainText exports headings and bullets for AI', () => {
  const text = whiteboardToPlainText({
    version: 1,
    nodes: [
      { id: '1', type: 'heading', x: 10, y: 10, w: 200, h: 60, text: 'Memory', color: '#3B82F6' },
      { id: '2', type: 'bullet', x: 10, y: 90, w: 220, h: 120, text: '- paging\n- segmentation', color: '#10B981' },
      { id: '3', type: 'sticky', x: 250, y: 20, w: 160, h: 120, text: 'Exam tip', color: '#F59E0B' },
    ],
    strokes: [{ id: 's1', points: [[0, 0], [10, 10]], color: '#000', width: 2 }],
    viewport: { x: 0, y: 0, zoom: 1 },
  }, 'OS Board');

  assert.match(text, /# OS Board/);
  assert.match(text, /## Memory/);
  assert.match(text, /- paging/);
  assert.match(text, /\[Sticky\] Exam tip/);
  assert.match(text, /1 sketch stroke/);
});

test('noteToAiText prefers whiteboard export over empty content', () => {
  const plain = noteToAiText({
    title: 'Networks',
    content: '',
    note_type: 'whiteboard',
    whiteboard_data: {
      version: 1,
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, w: 100, h: 80, text: 'TCP handshake', color: '#000' }],
      strokes: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  });

  assert.match(plain, /TCP handshake/);
});
