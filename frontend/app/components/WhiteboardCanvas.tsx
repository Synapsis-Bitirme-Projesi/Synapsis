'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Eraser,
  Hand,
  Heading2,
  List,
  MousePointer2,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  NODE_COLORS,
  WhiteboardData,
  WhiteboardNode,
  WhiteboardNodeType,
  WhiteboardStroke,
  createEmptyWhiteboard,
  createId,
  parseWhiteboardData,
} from '../lib/whiteboard';

type Tool = 'select' | 'pan' | 'draw' | 'erase';

interface WhiteboardCanvasProps {
  value?: WhiteboardData | null;
  onChange?: (data: WhiteboardData) => void;
  className?: string;
}

const DEFAULT_SIZE: Record<WhiteboardNodeType, { w: number; h: number }> = {
  text: { w: 220, h: 120 },
  sticky: { w: 180, h: 160 },
  heading: { w: 260, h: 80 },
  bullet: { w: 240, h: 150 },
};

function pointsToPath(points: Array<[number, number]>) {
  if (!points.length) return '';
  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ');
}

export default function WhiteboardCanvas({ value, onChange, className = '' }: WhiteboardCanvasProps) {
  const [data, setData] = useState<WhiteboardData>(() => parseWhiteboardData(value));
  const [tool, setTool] = useState<Tool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawColor, setDrawColor] = useState('#334155');
  const [nodeColor, setNodeColor] = useState(NODE_COLORS[0]);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const dataRef = useRef(data);
  const dragRef = useRef<{
    mode: 'node' | 'pan' | 'draw' | null;
    nodeId?: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    strokeId?: string;
  } | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Sync external value when switching notes
  useEffect(() => {
    const next = parseWhiteboardData(value);
    setData(next);
    dataRef.current = next;
    setSelectedId(null);
  }, [value]);

  const commit = useCallback(
    (updater: (prev: WhiteboardData) => WhiteboardData) => {
      setData((prev) => {
        const next = updater(prev);
        dataRef.current = next;
        onChange?.(next);
        return next;
      });
    },
    [onChange]
  );

  const selectedNode = useMemo(
    () => data.nodes.find((n) => n.id === selectedId) || null,
    [data.nodes, selectedId]
  );

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const { x: vx, y: vy, zoom } = dataRef.current.viewport;
      return {
        x: (clientX - rect.left - vx) / zoom,
        y: (clientY - rect.top - vy) / zoom,
      };
    },
    []
  );

  const addNode = (type: WhiteboardNodeType) => {
    const size = DEFAULT_SIZE[type];
    const id = createId('node');
    const offset = data.nodes.length * 24;
    const node: WhiteboardNode = {
      id,
      type,
      x: 80 + offset,
      y: 80 + offset,
      w: size.w,
      h: size.h,
      text:
        type === 'heading'
          ? 'Concept title'
          : type === 'bullet'
            ? '- Key idea\n- Supporting point\n- Example'
            : type === 'sticky'
              ? 'Sticky note'
              : 'Text block',
      color: nodeColor,
    };

    commit((prev) => ({
      ...prev,
      nodes: [...prev.nodes, node],
    }));
    setSelectedId(id);
    setTool('select');
  };

  const updateNode = (id: string, patch: Partial<WhiteboardNode>) => {
    commit((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    commit((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== selectedId),
    }));
    setSelectedId(null);
  };

  const clearBoard = () => {
    if (!window.confirm('Clear this whiteboard?')) return;
    const empty = createEmptyWhiteboard();
    setData(empty);
    dataRef.current = empty;
    onChange?.(empty);
    setSelectedId(null);
  };

  const setZoom = (nextZoom: number) => {
    commit((prev) => ({
      ...prev,
      viewport: {
        ...prev.viewport,
        zoom: Math.min(2, Math.max(0.4, nextZoom)),
      },
    }));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-wb-ui]')) return;

    const world = screenToWorld(e.clientX, e.clientY);
    const board = boardRef.current;
    board?.setPointerCapture(e.pointerId);

    if (tool === 'pan' || e.shiftKey) {
      dragRef.current = {
        mode: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        originX: dataRef.current.viewport.x,
        originY: dataRef.current.viewport.y,
      };
      return;
    }

    if (tool === 'draw') {
      const strokeId = createId('stroke');
      const stroke: WhiteboardStroke = {
        id: strokeId,
        points: [[world.x, world.y]],
        color: drawColor,
        width: 2.5,
      };
      dragRef.current = {
        mode: 'draw',
        startX: e.clientX,
        startY: e.clientY,
        originX: world.x,
        originY: world.y,
        strokeId,
      };
      commit((prev) => ({
        ...prev,
        strokes: [...prev.strokes, stroke],
      }));
      setSelectedId(null);
      return;
    }

    if (tool === 'erase') {
      // erase strokes near pointer + deselect
      commit((prev) => ({
        ...prev,
        strokes: prev.strokes.filter((stroke) => {
          return !stroke.points.some(([x, y]) => {
            const dx = x - world.x;
            const dy = y - world.y;
            return dx * dx + dy * dy < 20 * 20;
          });
        }),
      }));
      setSelectedId(null);
      return;
    }

    // select tool: if clicked empty canvas, deselect
    if (!target.closest('[data-node-id]')) {
      setSelectedId(null);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === 'pan') {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      commit((prev) => ({
        ...prev,
        viewport: {
          ...prev.viewport,
          x: drag.originX + dx,
          y: drag.originY + dy,
        },
      }));
      return;
    }

    if (drag.mode === 'draw' && drag.strokeId) {
      const world = screenToWorld(e.clientX, e.clientY);
      commit((prev) => ({
        ...prev,
        strokes: prev.strokes.map((s) =>
          s.id === drag.strokeId
            ? { ...s, points: [...s.points, [world.x, world.y] as [number, number]] }
            : s
        ),
      }));
      return;
    }

    if (drag.mode === 'node' && drag.nodeId) {
      const zoom = dataRef.current.viewport.zoom || 1;
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;
      updateNode(drag.nodeId, {
        x: drag.originX + dx,
        y: drag.originY + dy,
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      boardRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const startNodeDrag = (e: React.PointerEvent, node: WhiteboardNode) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    setSelectedId(node.id);
    dragRef.current = {
      mode: 'node',
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: node.x,
      originY: node.y,
    };
  };

  const { x: vx, y: vy, zoom } = data.viewport;

  return (
    <div className={`flex h-full min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 ${className}`}>
      {/* Toolbar */}
      <div
        data-wb-ui
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"
      >
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <ToolButton active={tool === 'select'} onClick={() => setTool('select')} label="Select">
            <MousePointer2 size={15} />
          </ToolButton>
          <ToolButton active={tool === 'pan'} onClick={() => setTool('pan')} label="Pan">
            <Hand size={15} />
          </ToolButton>
          <ToolButton active={tool === 'draw'} onClick={() => setTool('draw')} label="Draw">
            <Pencil size={15} />
          </ToolButton>
          <ToolButton active={tool === 'erase'} onClick={() => setTool('erase')} label="Erase">
            <Eraser size={15} />
          </ToolButton>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center gap-1">
          <ToolButton onClick={() => addNode('text')} label="Text block">
            <Type size={15} />
          </ToolButton>
          <ToolButton onClick={() => addNode('heading')} label="Heading">
            <Heading2 size={15} />
          </ToolButton>
          <ToolButton onClick={() => addNode('bullet')} label="Bullet cluster">
            <List size={15} />
          </ToolButton>
          <ToolButton onClick={() => addNode('sticky')} label="Sticky">
            <StickyNote size={15} />
          </ToolButton>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Node</span>
          {NODE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setNodeColor(color);
                if (selectedId) updateNode(selectedId, { color });
              }}
              className={`h-5 w-5 rounded-full border-2 transition ${
                nodeColor === color ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Color ${color}`}
            />
          ))}
        </div>

        {tool === 'draw' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Ink</span>
            <input
              type="color"
              value={drawColor}
              onChange={(e) => setDrawColor(e.target.value)}
              className="h-7 w-8 cursor-pointer rounded border border-slate-200 bg-transparent dark:border-slate-600"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <ToolButton onClick={() => setZoom(zoom - 0.1)} label="Zoom out">
            <ZoomOut size={15} />
          </ToolButton>
          <span className="min-w-[3rem] text-center text-xs font-bold text-slate-500">
            {Math.round(zoom * 100)}%
          </span>
          <ToolButton onClick={() => setZoom(zoom + 0.1)} label="Zoom in">
            <ZoomIn size={15} />
          </ToolButton>
          {selectedId && (
            <ToolButton onClick={deleteSelected} label="Delete node" danger>
              <Trash2 size={15} />
            </ToolButton>
          )}
          <ToolButton onClick={clearBoard} label="Clear board" danger>
            <Plus size={15} className="rotate-45" />
          </ToolButton>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={boardRef}
        className={`relative flex-1 touch-none overflow-hidden ${
          tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : tool === 'draw' ? 'cursor-crosshair' : 'cursor-default'
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.35) 1px, transparent 0)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${vx}px ${vy}px`,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{
            transform: `translate(${vx}px, ${vy}px) scale(${zoom})`,
            width: 4000,
            height: 3000,
          }}
        >
          {/* Strokes */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {data.strokes.map((stroke) => (
              <path
                key={stroke.id}
                d={pointsToPath(stroke.points)}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {/* Nodes */}
          {data.nodes.map((node) => {
            const isSelected = node.id === selectedId;
            const isSticky = node.type === 'sticky';
            return (
              <div
                key={node.id}
                data-node-id={node.id}
                onPointerDown={(e) => startNodeDrag(e, node)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (tool === 'select') setSelectedId(node.id);
                }}
                className={`absolute flex flex-col overflow-hidden rounded-xl border shadow-md transition ${
                  isSelected
                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent'
                    : 'hover:shadow-lg'
                }`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.w,
                  minHeight: node.h,
                  borderColor: node.color,
                  backgroundColor: isSticky ? `${node.color}22` : 'rgba(255,255,255,0.95)',
                  borderLeftWidth: 4,
                }}
              >
                <div
                  className="flex items-center justify-between gap-2 border-b px-2 py-1 text-[10px] font-black uppercase tracking-wide"
                  style={{ borderColor: `${node.color}33`, color: node.color }}
                >
                  <span>{node.type}</span>
                  {isSelected && <span className="opacity-70">drag · edit</span>}
                </div>
                <textarea
                  value={node.text}
                  onChange={(e) => updateNode(node.id, { text: e.target.value })}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`min-h-[4rem] flex-1 resize-none bg-transparent px-2.5 py-2 text-slate-800 outline-none placeholder:text-slate-400 ${
                    node.type === 'heading'
                      ? 'text-base font-bold'
                      : node.type === 'bullet'
                        ? 'text-sm leading-relaxed'
                        : 'text-sm'
                  }`}
                  placeholder="Type here..."
                  spellCheck
                />
              </div>
            );
          })}
        </div>

        {data.nodes.length === 0 && data.strokes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-sm rounded-2xl border border-dashed border-slate-300 bg-white/80 px-5 py-4 text-center shadow-sm dark:border-slate-600 dark:bg-slate-900/80">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Empty whiteboard</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Add text blocks, stickies, headings, or bullet clusters. Draw sketches with the pencil tool. Hold Shift to pan.
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedNode && (
        <div
          data-wb-ui
          className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
        >
          <span className="font-bold text-slate-500">Selected:</span>
          <span className="rounded-lg bg-slate-100 px-2 py-1 font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {selectedNode.type}
          </span>
          <label className="ml-2 flex items-center gap-1 text-slate-500">
            W
            <input
              type="number"
              min={120}
              value={Math.round(selectedNode.w)}
              onChange={(e) => updateNode(selectedNode.id, { w: Number(e.target.value) || 120 })}
              className="w-16 rounded-lg border border-slate-200 bg-transparent px-2 py-1 dark:border-slate-600"
            />
          </label>
          <label className="flex items-center gap-1 text-slate-500">
            H
            <input
              type="number"
              min={60}
              value={Math.round(selectedNode.h)}
              onChange={(e) => updateNode(selectedNode.id, { h: Number(e.target.value) || 60 })}
              className="w-16 rounded-lg border border-slate-200 bg-transparent px-2 py-1 dark:border-slate-600"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  active,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : danger
            ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
