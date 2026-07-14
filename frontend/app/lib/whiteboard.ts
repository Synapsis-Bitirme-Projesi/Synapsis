export type WhiteboardNodeType = 'text' | 'sticky' | 'heading' | 'bullet';

export interface WhiteboardNode {
  id: string;
  type: WhiteboardNodeType;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
}

export interface WhiteboardStroke {
  id: string;
  points: Array<[number, number]>;
  color: string;
  width: number;
}

export interface WhiteboardData {
  version: 1;
  nodes: WhiteboardNode[];
  strokes: WhiteboardStroke[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export const DEFAULT_WHITEBOARD: WhiteboardData = {
  version: 1,
  nodes: [],
  strokes: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const NODE_COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#06B6D4',
  '#64748B',
];

export function createId(prefix = 'wb'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function createEmptyWhiteboard(): WhiteboardData {
  return {
    version: 1,
    nodes: [],
    strokes: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function parseWhiteboardData(raw: unknown): WhiteboardData {
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

  const data = value as Partial<WhiteboardData>;
  return {
    version: 1,
    nodes: Array.isArray(data.nodes)
      ? data.nodes
          .filter((node) => node && typeof node === 'object')
          .map((node: any) => ({
            id: String(node.id || createId('node')),
            type: (['text', 'sticky', 'heading', 'bullet'].includes(node.type)
              ? node.type
              : 'text') as WhiteboardNodeType,
            x: Number(node.x) || 0,
            y: Number(node.y) || 0,
            w: Math.max(120, Number(node.w) || 220),
            h: Math.max(60, Number(node.h) || 120),
            text: String(node.text || ''),
            color: String(node.color || NODE_COLORS[0]),
          }))
      : [],
    strokes: Array.isArray(data.strokes)
      ? data.strokes
          .filter((stroke) => stroke && typeof stroke === 'object' && Array.isArray(stroke.points))
          .map((stroke: any) => ({
            id: String(stroke.id || createId('stroke')),
            points: stroke.points
              .filter((point: unknown) => Array.isArray(point) && point.length >= 2)
              .map((point: any[]) => [Number(point[0]) || 0, Number(point[1]) || 0] as [number, number]),
            color: String(stroke.color || '#334155'),
            width: Math.max(1, Number(stroke.width) || 2),
          }))
          // Keep single-point strokes too — draw tool creates the stroke with 1 point first.
          .filter((stroke) => stroke.points.length >= 1)
      : [],
    viewport: {
      x: Number(data.viewport?.x) || 0,
      y: Number(data.viewport?.y) || 0,
      zoom: Math.min(2, Math.max(0.4, Number(data.viewport?.zoom) || 1)),
    },
  };
}

/** Convert whiteboard content into plain text the AI layer can consume. */
export function whiteboardToPlainText(data: WhiteboardData | null | undefined, title = ''): string {
  const board = data ? parseWhiteboardData(data) : createEmptyWhiteboard();
  const lines: string[] = [];

  if (title?.trim()) {
    lines.push(`# ${title.trim()}`);
    lines.push('');
  }

  const sorted = [...board.nodes].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  for (const node of sorted) {
    const text = String(node.text || '').trim();
    if (!text) continue;

    if (node.type === 'heading') {
      lines.push(`## ${text}`);
    } else if (node.type === 'bullet') {
      text.split(/\n+/).forEach((line) => {
        const cleaned = line.trim();
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

/** Best-effort plain text from either HTML content or whiteboard JSON. */
export function noteContentToPlainText(content: string | null | undefined, whiteboardData?: unknown): string {
  const fromBoard = whiteboardToPlainText(parseWhiteboardData(whiteboardData));
  if (fromBoard) return fromBoard;

  const raw = String(content || '');
  if (!raw.trim()) return '';

  // Strip simple HTML tags for AI/export paths.
  return raw
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
