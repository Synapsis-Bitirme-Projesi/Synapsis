function createEmptyWhiteboard() {
  return {
    version: 1,
    nodes: [],
    strokes: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

function parseWhiteboardData(raw) {
  if (!raw) return createEmptyWhiteboard();

  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return createEmptyWhiteboard();
    }
  }

  if (!value || typeof value !== 'object') return createEmptyWhiteboard();

  return {
    version: 1,
    nodes: Array.isArray(value.nodes) ? value.nodes : [],
    strokes: Array.isArray(value.strokes) ? value.strokes : [],
    viewport: value.viewport && typeof value.viewport === 'object'
      ? value.viewport
      : { x: 0, y: 0, zoom: 1 },
  };
}

/** Convert whiteboard JSON into plain text for AI summaries/flashcards. */
function whiteboardToPlainText(raw, title = '') {
  const board = parseWhiteboardData(raw);
  const lines = [];

  if (title && String(title).trim()) {
    lines.push(`# ${String(title).trim()}`, '');
  }

  const nodes = [...board.nodes].sort((a, b) => {
    const ay = Number(a?.y) || 0;
    const by = Number(b?.y) || 0;
    if (ay !== by) return ay - by;
    return (Number(a?.x) || 0) - (Number(b?.x) || 0);
  });

  for (const node of nodes) {
    const text = String(node?.text || '').trim();
    if (!text) continue;

    if (node.type === 'heading') {
      lines.push(`## ${text}`);
    } else if (node.type === 'bullet') {
      text.split(/\n+/).forEach((line) => {
        const cleaned = String(line || '').trim();
        if (cleaned) lines.push(`- ${cleaned.replace(/^[-*•]\s*/, '')}`);
      });
    } else if (node.type === 'sticky') {
      lines.push(`[Sticky] ${text}`);
    } else {
      lines.push(text);
    }
    lines.push('');
  }

  if (board.strokes.length > 0) {
    lines.push(`[Whiteboard includes ${board.strokes.length} sketch stroke${board.strokes.length === 1 ? '' : 's'}]`);
  }

  return lines.join('\n').trim();
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Prefer whiteboard export, otherwise strip HTML content. */
function noteToAiText(note) {
  if (!note) return '';

  const boardText = whiteboardToPlainText(note.whiteboard_data, note.title);
  if (boardText) return boardText;

  const content = String(note.content || '').trim();
  if (!content) return String(note.title || '').trim();

  // Content may already be plain text (whiteboard export) or HTML (tiptap).
  if (content.includes('<') && content.includes('>')) {
    return stripHtml(content) || String(note.title || '').trim();
  }

  return content;
}

module.exports = {
  createEmptyWhiteboard,
  parseWhiteboardData,
  whiteboardToPlainText,
  noteToAiText,
  stripHtml,
};
