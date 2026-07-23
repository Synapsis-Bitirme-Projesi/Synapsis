"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
    ArrowRight,
    BookOpen,
    Bookmark,
    Bot,
    Check,
    ChevronDown,
    FileText,
    HelpCircle,
    Layers,
    Loader2,
    Paperclip,
    Plus,
    RefreshCw,
    Search,
    Send,
    Sparkles,
    Trash2,
    Upload,
    User,
    X,
} from "lucide-react";
import { API_BASE_URL } from "../lib/api";

function cleanStudyText(value: string) {
    return String(value || "")
        .replace(/\*\*/g, "")
        .replace(/^#+\s*/gm, "")
        .replace(/^\s*[-*•]\s+/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

type PracticeItem = {
    id: string;
    question: string;
    answer: string;
};

type FlashcardItem = {
    id: string;
    front: string;
    back: string;
};

function parsePracticeItems(content: string): PracticeItem[] {
    const text = String(content || "").trim();
    if (!text) return [];

    const items: PracticeItem[] = [];

    // Preferred structured format:
    // ### Question 1 ... ### Answer 1 ...
    const structured = Array.from(
        text.matchAll(
            /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?Question\s*(\d+)(?:\*\*)?\s*[:.\-]?\s*([\s\S]*?)(?=(?:\n\s*(?:#{1,6}\s*)?(?:\*\*)?Answer\s*\1)|$)/gi
        )
    );

    for (const match of structured) {
        const index = match[1];
        const question = cleanStudyText(match[2] || "");
        const answerMatch = text.match(
            new RegExp(
                `(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?Answer\\s*${index}(?:\\*\\*)?\\s*[:.\\-]?\\s*([\\s\\S]*?)(?=(?:\\n\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?Question\\s*\\d+)|$)`,
                "i"
            )
        );
        const answer = cleanStudyText(answerMatch?.[1] || "");
        if (question && answer) {
            items.push({ id: `q-${index}`, question, answer });
        }
    }

    if (items.length > 0) return items;

    // Fallback: Q:/A: or Question:/Answer: pairs
    const pairRegex =
        /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?(?:Q(?:uestion)?)\s*\d*(?:\*\*)?\s*[:.\-]\s*([\s\S]*?)(?:\n)\s*(?:#{1,6}\s*)?(?:\*\*)?(?:A(?:nswer)?)\s*\d*(?:\*\*)?\s*[:.\-]\s*([\s\S]*?)(?=(?:\n\s*(?:#{1,6}\s*)?(?:\*\*)?(?:Q(?:uestion)?)\s*\d*)|$)/gi;

    let pairMatch: RegExpExecArray | null;
    let pairIndex = 1;
    while ((pairMatch = pairRegex.exec(text)) !== null) {
        const question = cleanStudyText(pairMatch[1] || "");
        const answer = cleanStudyText(pairMatch[2] || "");
        if (question && answer) {
            items.push({ id: `pair-${pairIndex++}`, question, answer });
        }
    }

    return items;
}

function parseFlashcardItems(content: string): FlashcardItem[] {
    const text = String(content || "").trim();
    if (!text) return [];

    const items: FlashcardItem[] = [];

    // Preferred:
    // ### Card 1
    // Front: ...
    // Back: ...
    const cardBlocks = Array.from(
        text.matchAll(
            /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?Card\s*(\d+)(?:\*\*)?\s*[:.\-]?\s*([\s\S]*?)(?=(?:\n\s*(?:#{1,6}\s*)?(?:\*\*)?Card\s*\d+)|$)/gi
        )
    );

    for (const match of cardBlocks) {
        const block = match[2] || "";
        const frontMatch = block.match(/(?:^|\n)\s*(?:\*\*)?Front(?:\*\*)?\s*[:.\-]\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*)?Back(?:\*\*)?\s*[:.\-])|$)/i);
        const backMatch = block.match(/(?:^|\n)\s*(?:\*\*)?Back(?:\*\*)?\s*[:.\-]\s*([\s\S]*?)$/i);
        const front = cleanStudyText(frontMatch?.[1] || "");
        const back = cleanStudyText(backMatch?.[1] || "");
        if (front && back) {
            items.push({ id: `card-${match[1]}`, front, back });
        }
    }

    if (items.length > 0) return items;

    // Fallback: Front:/Back: pairs without Card headings
    const pairRegex =
        /(?:^|\n)\s*(?:\*\*)?Front(?:\*\*)?\s*[:.\-]\s*([\s\S]*?)(?:\n)\s*(?:\*\*)?Back(?:\*\*)?\s*[:.\-]\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*)?Front(?:\*\*)?\s*[:.\-])|$)/gi;

    let pairMatch: RegExpExecArray | null;
    let pairIndex = 1;
    while ((pairMatch = pairRegex.exec(text)) !== null) {
        const front = cleanStudyText(pairMatch[1] || "");
        const back = cleanStudyText(pairMatch[2] || "");
        if (front && back) {
            items.push({ id: `fb-${pairIndex++}`, front, back });
        }
    }

    if (items.length > 0) return items;

    // Fallback: "term — definition" / "term: definition" lines
    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !/^#{1,6}\s|sources used|flashcard/i.test(line));

    lines.forEach((line, index) => {
        const split = line.split(/\s+[—–-]\s+|:\s+/);
        if (split.length >= 2) {
            const front = cleanStudyText(split[0]);
            const back = cleanStudyText(split.slice(1).join(": "));
            if (front && back && front.length < 180) {
                items.push({ id: `line-${index + 1}`, front, back });
            }
        }
    });

    return items;
}

function AssistantMarkdown({
    content,
    isUser = false,
}: {
    content: string;
    isUser?: boolean;
}) {
    const safeContent = String(content || '').trim();

    if (!safeContent) return <p>...</p>;

    if (isUser) {
        return <p className="whitespace-pre-wrap">{safeContent}</p>;
    }

    return (
        <div className="assistant-markdown max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    h1: ({ children }) => (
                        <h1 className="mb-3 mt-1 text-lg font-black text-slate-900 dark:text-white">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="mb-2 mt-4 text-base font-black text-slate-900 dark:text-white">{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="mb-2 mt-3 text-sm font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">
                            {children}
                        </h3>
                    ),
                    p: ({ children }) => (
                        <p className="my-2 leading-relaxed text-slate-700 dark:text-slate-200">{children}</p>
                    ),
                    ul: ({ children }) => (
                        <ul className="my-2 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-200">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="my-2 list-decimal space-y-1 pl-5 text-slate-700 dark:text-slate-200">{children}</ol>
                    ),
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    strong: ({ children }) => (
                        <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>
                    ),
                    em: ({ children }) => <em className="italic text-slate-600 dark:text-slate-300">{children}</em>,
                    code: ({ children }) => (
                        <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[12px] font-semibold text-blue-700 dark:bg-slate-800 dark:text-blue-300">
                            {children}
                        </code>
                    ),
                    pre: ({ children }) => (
                        <pre className="my-3 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-3 text-[12px] text-slate-100 dark:border-slate-700">
                            {children}
                        </pre>
                    ),
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 dark:text-blue-400"
                        >
                            {children}
                        </a>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="my-3 border-l-4 border-blue-400 bg-blue-50/70 px-3 py-2 text-slate-600 dark:border-blue-500 dark:bg-blue-950/30 dark:text-slate-300">
                            {children}
                        </blockquote>
                    ),
                    hr: () => <hr className="my-4 border-slate-200 dark:border-slate-700" />,
                }}
            >
                {safeContent}
            </ReactMarkdown>
        </div>
    );
}

function PracticeQuizView({ content }: { content: string }) {
    const items = useMemo(() => parsePracticeItems(content), [content]);
    const [revealed, setRevealed] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setRevealed({});
    }, [content]);

    if (items.length === 0) {
        return <AssistantMarkdown content={content} />;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-500">Practice set</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {items.length} question{items.length > 1 ? "s" : ""} · answers hidden
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        const allOpen = items.every((item) => revealed[item.id]);
                        if (allOpen) {
                            setRevealed({});
                            return;
                        }
                        const next: Record<string, boolean> = {};
                        items.forEach((item) => {
                            next[item.id] = true;
                        });
                        setRevealed(next);
                    }}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                    {items.every((item) => revealed[item.id]) ? "Hide all" : "Reveal all"}
                </button>
            </div>

            {items.map((item, index) => {
                const isOpen = Boolean(revealed[item.id]);
                return (
                    <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-950"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-[11px] font-black text-white">
                                Q{index + 1}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Practice question
                            </span>
                        </div>
                        <p className="text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
                            {item.question}
                        </p>

                        <div className="mt-3">
                            {!isOpen ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRevealed((prev) => ({
                                            ...prev,
                                            [item.id]: true,
                                        }))
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.98]"
                                >
                                    <HelpCircle size={14} />
                                    Answer
                                </button>
                            ) : (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                                            Answer
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRevealed((prev) => ({
                                                    ...prev,
                                                    [item.id]: false,
                                                }))
                                            }
                                            className="text-[10px] font-bold uppercase tracking-wide text-emerald-700/80 hover:text-emerald-800 dark:text-emerald-300"
                                        >
                                            Hide
                                        </button>
                                    </div>
                                    <p className="text-sm leading-relaxed text-emerald-950 dark:text-emerald-50 whitespace-pre-wrap">
                                        {item.answer}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function FlashcardsView({ content }: { content: string }) {
    const items = useMemo(() => parseFlashcardItems(content), [content]);
    const [flipped, setFlipped] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setFlipped({});
    }, [content]);

    if (items.length === 0) {
        return <AssistantMarkdown content={content} />;
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-500">Flashcards</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {items.length} card{items.length > 1 ? "s" : ""} · tap to flip
                    </p>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item, index) => {
                    const isFlipped = Boolean(flipped[item.id]);
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                                setFlipped((prev) => ({
                                    ...prev,
                                    [item.id]: !prev[item.id],
                                }))
                            }
                            className={`group relative min-h-[150px] rounded-3xl border p-4 text-left shadow-sm transition-all active:scale-[0.99] ${isFlipped
                                ? "border-violet-300 bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-violet-500/20"
                                : "border-slate-200 bg-white hover:border-violet-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                                }`}
                        >
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] ${isFlipped
                                        ? "bg-white/15 text-white"
                                        : "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300"
                                        }`}
                                >
                                    {isFlipped ? "Back" : "Front"} · {index + 1}
                                </span>
                                <span
                                    className={`text-[10px] font-bold uppercase tracking-wide ${isFlipped ? "text-white/80" : "text-slate-400"
                                        }`}
                                >
                                    Tap to flip
                                </span>
                            </div>
                            <p
                                className={`text-sm font-semibold leading-relaxed whitespace-pre-wrap ${isFlipped ? "text-white" : "text-slate-800 dark:text-slate-100"
                                    }`}
                            >
                                {isFlipped ? item.back : item.front}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function AssistantMessageBody({
    content,
    mode,
    isUser = false,
}: {
    content: string;
    mode?: AssistantMode;
    isUser?: boolean;
}) {
    if (isUser) {
        return <AssistantMarkdown content={content} isUser />;
    }

    if (mode === "questions") {
        return <PracticeQuizView content={content} />;
    }

    if (mode === "cards") {
        return <FlashcardsView content={content} />;
    }

    return <AssistantMarkdown content={content} />;
}

interface NotebookSource {
    id: number;
    title: string;
    source_type: string;
    mime_type?: string | null;
    chunk_count?: number;
    created_at?: string;
    updated_at?: string;
}

interface NotebookNote {
    id: number;
    title: string;
    content?: string | null;
    course?: string | null;
    course_name?: string | null;
    created_at?: string;
    updated_at?: string;
}

interface CourseOption {
    id: number;
    course_name: string;
}

type AssistantMode = "chat" | "summary" | "questions" | "cards" | "compare" | "explain";
type OutputFormat = "markdown" | "bullets" | "outline" | "qa";
type OutputDepth = "brief" | "standard" | "detailed";
type OutputTone = "neutral" | "exam" | "friendly" | "academic";

interface CitationRef {
    tag: string;
    sourceId?: string | number | null;
    noteId?: number | null;
    title: string;
    sourceType?: string;
    chunkIndex?: number;
    excerpt?: string;
}

interface Message {
    id: string;
    sender: "user" | "ai";
    text: string;
    timestamp: Date;
    mode?: AssistantMode;
    citations?: CitationRef[];
    cached?: boolean;
    preferences?: {
        format: OutputFormat;
        depth: OutputDepth;
        tone: OutputTone;
    };
    cacheKey?: string | null;
}

type SelectOption = {
    value: string;
    label: string;
    description?: string;
};

function AestheticSelect({
    label,
    value,
    options,
    onChange,
    icon,
    className = "",
    buttonClassName = "",
    menuAlign = "left",
}: {
    label?: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    icon?: React.ReactNode;
    className?: string;
    buttonClassName?: string;
    menuAlign?: "left" | "right";
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selected = options.find((option) => option.value === value) || options[0];

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            {label && (
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {label}
                </span>
            )}
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                className={`group flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-left shadow-sm outline-none transition-all hover:border-blue-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700/80 dark:bg-slate-900/90 dark:hover:border-blue-500/40 ${open ? "border-blue-400 ring-2 ring-blue-500/25 dark:border-blue-500/50" : ""
                    } ${buttonClassName}`}
            >
                <span className="flex min-w-0 items-center gap-2">
                    {icon && (
                        <span className="shrink-0 text-blue-600 dark:text-blue-400">{icon}</span>
                    )}
                    <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-100">
                        {selected?.label || "Select"}
                    </span>
                </span>
                <ChevronDown
                    size={14}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-blue-500 ${open ? "rotate-180 text-blue-500" : ""
                        }`}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    className={`absolute z-50 mt-2 min-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-700/80 dark:bg-[#121216]/95 dark:shadow-black/40 ${menuAlign === "right" ? "right-0" : "left-0"
                        }`}
                >
                    <div className="max-h-64 space-y-0.5 overflow-y-auto">
                        {options.map((option) => {
                            const isActive = option.value === value;
                            return (
                                <button
                                    key={option.value || "__empty"}
                                    type="button"
                                    role="option"
                                    aria-selected={isActive}
                                    onClick={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${isActive
                                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80"
                                        }`}
                                >
                                    <span
                                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isActive
                                            ? "border-white/40 bg-white/15 text-white"
                                            : "border-slate-300 text-transparent dark:border-slate-600"
                                            }`}
                                    >
                                        <Check size={10} strokeWidth={3} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-xs font-bold leading-tight">
                                            {option.label}
                                        </span>
                                        {option.description && (
                                            <span
                                                className={`mt-0.5 block text-[10px] leading-snug ${isActive
                                                    ? "text-blue-100"
                                                    : "text-slate-400 dark:text-slate-500"
                                                    }`}
                                            >
                                                {option.description}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

const FORMAT_OPTIONS: SelectOption[] = [
    { value: "markdown", label: "Markdown", description: "Headings and clean prose" },
    { value: "bullets", label: "Bullets", description: "Quick scannable points" },
    { value: "outline", label: "Outline", description: "Hierarchical study map" },
    { value: "qa", label: "Q&A", description: "Question and answer pairs" },
];

const DEPTH_OPTIONS: SelectOption[] = [
    { value: "brief", label: "Brief", description: "Only the essentials" },
    { value: "standard", label: "Standard", description: "Balanced study depth" },
    { value: "detailed", label: "Detailed", description: "Deeper nuance and examples" },
];

const TONE_OPTIONS: SelectOption[] = [
    { value: "neutral", label: "Neutral", description: "Clear and direct" },
    { value: "exam", label: "Exam prep", description: "Test-focused and precise" },
    { value: "friendly", label: "Friendly tutor", description: "Warm and simple" },
    { value: "academic", label: "Academic", description: "Formal university tone" },
];

const modeTemplates: Array<{
    mode: AssistantMode;
    label: string;
    icon: React.ReactNode;
    prompt: string;
}> = [
        {
            mode: "summary",
            label: "Summarize",
            icon: <FileText size={16} />,
            prompt: "Summarize the selected sources into concise study notes with key takeaways and important terms.",
        },
        {
            mode: "questions",
            label: "Practice",
            icon: <HelpCircle size={16} />,
            prompt: "Create exam-style practice questions and short answers based on the selected sources.",
        },
        {
            mode: "cards",
            label: "Flashcards",
            icon: <Layers size={16} />,
            prompt: "Create flashcards in a compact front / back format from the selected sources.",
        },
        {
            mode: "explain",
            label: "Explain",
            icon: <Sparkles size={16} />,
            prompt: "Explain the topic in simple student-friendly language using the selected sources.",
        },
        {
            mode: "compare",
            label: "Compare",
            icon: <ArrowRight size={16} />,
            prompt: "Compare the selected sources, highlight similarities, differences, and any contradictions.",
        },
    ];

export default function AssistantPanel() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            sender: "ai",
            text: "Drop in lecture notes, PDFs, or imported notes, then ask questions over the selected sources. Synapsis will try local Ollama first when it is available, then fall back to Gemini.",
            timestamp: new Date(),
            mode: "chat",
        },
    ]);
    const [sources, setSources] = useState<NotebookSource[]>([]);
    const [notes, setNotes] = useState<NotebookNote[]>([]);
    const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [loadingWorkspace, setLoadingWorkspace] = useState(true);
    const [workspaceError, setWorkspaceError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCreatingTextSource, setIsCreatingTextSource] = useState(false);
    const [isImportingNotes, setIsImportingNotes] = useState(false);
    const [sourceTitle, setSourceTitle] = useState("");
    const [sourceContent, setSourceContent] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMode, setSelectedMode] = useState<AssistantMode>("chat");
    const [activePanel, setActivePanel] = useState<"sources" | "notes">("sources");
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [outputFormat, setOutputFormat] = useState<OutputFormat>("markdown");
    const [outputDepth, setOutputDepth] = useState<OutputDepth>("standard");
    const [outputTone, setOutputTone] = useState<OutputTone>("neutral");
    const [bypassCache, setBypassCache] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const prefsHydratedRef = useRef(false);

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ type, message });
    };

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    const getToken = () => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("token");
    };

    const prefsStorageKey = (courseName: string) =>
        `synapsis-ai-prefs:${courseName || "all"}`;

    // Load format/depth/tone preferences per selected course
    useEffect(() => {
        if (typeof window === "undefined") return;
        prefsHydratedRef.current = false;
        try {
            const raw = localStorage.getItem(prefsStorageKey(selectedCourse));
            if (raw) {
                const parsed = JSON.parse(raw) as {
                    format?: OutputFormat;
                    depth?: OutputDepth;
                    tone?: OutputTone;
                };
                if (parsed.format) setOutputFormat(parsed.format);
                if (parsed.depth) setOutputDepth(parsed.depth);
                if (parsed.tone) setOutputTone(parsed.tone);
            } else {
                setOutputFormat("markdown");
                setOutputDepth("standard");
                setOutputTone("neutral");
            }
        } catch {
            // ignore corrupt prefs
        }
        prefsHydratedRef.current = true;
    }, [selectedCourse]);

    // Persist preferences whenever they change for the active course
    useEffect(() => {
        if (typeof window === "undefined" || !prefsHydratedRef.current) return;
        try {
            localStorage.setItem(
                prefsStorageKey(selectedCourse),
                JSON.stringify({
                    format: outputFormat,
                    depth: outputDepth,
                    tone: outputTone,
                })
            );
        } catch {
            // ignore quota / private mode
        }
    }, [selectedCourse, outputFormat, outputDepth, outputTone]);

    const filteredSources = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return sources;
        return sources.filter((source) => {
            return [source.title, source.source_type, String(source.chunk_count || "")]
                .join(" ")
                .toLowerCase()
                .includes(term);
        });
    }, [searchTerm, sources]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const loadWorkspace = async () => {
            const token = getToken();
            if (!token) {
                setWorkspaceError("No auth token found.");
                setLoadingWorkspace(false);
                return;
            }

            try {
                const [sourcesResponse, notesResponse, coursesResponse] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/auth/ai/sources`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get(`${API_BASE_URL}/api/notes`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get(`${API_BASE_URL}/api/courses`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                setSources(sourcesResponse.data || []);
                setNotes(notesResponse.data || []);

                const uniqueCourses = Array.from(
                    new Map(
                        (coursesResponse.data || [])
                            .filter((course: CourseOption) => course?.course_name)
                            .map((course: CourseOption) => [course.course_name, course])
                    ).values()
                ) as CourseOption[];
                setCourses(uniqueCourses);
            } catch (error) {
                console.error("Notebook workspace load failed:", error);
                setWorkspaceError("Sources could not be loaded.");
            } finally {
                setLoadingWorkspace(false);
            }
        };

        loadWorkspace();
    }, []);

    const refreshWorkspace = async () => {
        const token = getToken();
        if (!token) return;

        const [sourcesResponse, notesResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/auth/ai/sources`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`${API_BASE_URL}/api/notes`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
        ]);

        setSources(sourcesResponse.data || []);
        setNotes(notesResponse.data || []);
    };

    const toggleSource = (sourceId: number) => {
        setSelectedSourceIds((current) => {
            if (current.includes(sourceId)) {
                return current.filter((id) => id !== sourceId);
            }
            return [...current, sourceId];
        });
    };

    const clearSelectedSources = () => {
        setSelectedSourceIds([]);
    };

    const selectAllSources = () => {
        setSelectedSourceIds(sources.map((source) => source.id));
    };

    const handleAddTextSource = async () => {
        const token = getToken();
        if (!token || !sourceContent.trim()) return;

        setIsCreatingTextSource(true);
        try {
            await axios.post(
                `${API_BASE_URL}/api/auth/ai/sources`,
                {
                    title: sourceTitle.trim() || "Pasted Study Notes",
                    content: sourceContent,
                    sourceType: "text",
                    mimeType: "text/plain",
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSourceTitle("");
            setSourceContent("");
            await refreshWorkspace();
        } catch (error) {
            console.error("Text source error:", error);
            showToast("error", "Text source could not be added.");
        } finally {
            setIsCreatingTextSource(false);
        }
    };

    const handleUploadFiles = async (files: FileList | null) => {
        const token = getToken();
        if (!token || !files || files.length === 0) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            Array.from(files).forEach((file) => formData.append("files", file));

            await axios.post(`${API_BASE_URL}/api/auth/ai/sources/upload`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (fileInputRef.current) fileInputRef.current.value = "";
            await refreshWorkspace();
        } catch (error) {
            console.error("Upload source error:", error);
            showToast("error", "Files could not be uploaded.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleImportNotes = async (noteIds?: number[]) => {
        const token = getToken();
        if (!token) return;

        setIsImportingNotes(true);
        try {
            await axios.post(
                `${API_BASE_URL}/api/auth/ai/sources/import-notes`,
                { noteIds: noteIds || notes.map((note) => note.id) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await refreshWorkspace();
            setActivePanel("sources");
        } catch (error) {
            console.error("Import notes error:", error);
            showToast("error", "Notes could not be imported.");
        } finally {
            setIsImportingNotes(false);
        }
    };

    const handleDeleteSource = async (sourceId: number) => {
        const token = getToken();
        if (!token) return;

        try {
            await axios.delete(`${API_BASE_URL}/api/auth/ai/sources/${sourceId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSelectedSourceIds((current) => current.filter((id) => id !== sourceId));
            await refreshWorkspace();
        } catch (error) {
            console.error("Delete source error:", error);
            showToast("error", "Source could not be deleted.");
        }
    };

    const handleSaveArtifact = async (msg: Message) => {
        const token = getToken();
        if (!token || !msg.text) return;

        setSavingId(msg.id);
        try {
            const courseName =
                selectedCourse ||
                (selectedSourceIds.length > 0 ? `Notebook ${selectedSourceIds.length}` : "General Notebook");
            const title = msg.text.split("\n")[0].replace(/[#*]/g, "").trim() || "Notebook Output";
            const prefs = msg.preferences || {
                format: outputFormat,
                depth: outputDepth,
                tone: outputTone,
            };

            await axios.post(
                `${API_BASE_URL}/api/auth/ai/artifacts`,
                {
                    courseName,
                    artifactType: msg.mode || "summary",
                    title: title.length > 50 ? `${title.substring(0, 50)}...` : title,
                    content: msg.text,
                    citations: msg.citations || [],
                    format: prefs.format,
                    depth: prefs.depth,
                    tone: prefs.tone,
                    cacheKey: msg.cacheKey || null,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            showToast("success", "Saved to your collection.");
        } catch (error) {
            console.error("Artifact save error:", error);
            showToast("error", "Artifact could not be saved.");
        } finally {
            setSavingId(null);
        }
    };

    const sendMessageWithStreaming = async (promptText: string, mode: AssistantMode = "chat", displayText?: string) => {
        const token = getToken();
        if (!promptText.trim() || isLoading || !token) return;

        const prefs = {
            format: outputFormat,
            depth: outputDepth,
            tone: outputTone,
        };

        const userMessage: Message = {
            id: Math.random().toString(),
            sender: "user",
            text: displayText || promptText.trim(),
            timestamp: new Date(),
            mode,
            preferences: prefs,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        const aiMessageId = Math.random().toString();
        setMessages((prev) => [
            ...prev,
            {
                id: aiMessageId,
                sender: "ai",
                text: "",
                timestamp: new Date(),
                mode,
                preferences: prefs,
                citations: [],
            },
        ]);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    prompt: promptText,
                    mode,
                    sourceIds: selectedSourceIds,
                    courseName: selectedCourse || null,
                    format: prefs.format,
                    depth: prefs.depth,
                    tone: prefs.tone,
                    bypassCache,
                }),
            });

            if (!response.ok) {
                let errorMessage = `Assistant request failed (${response.status}).`;
                try {
                    const errorBody = await response.json();
                    errorMessage = errorBody?.error || errorBody?.message || errorMessage;
                } catch {
                    // keep default message when body is not JSON
                }
                throw new Error(errorMessage);
            }

            if (!response.body) throw new Error("Response stream is unavailable.");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            let buffer = "";
            let accumulatedText = "";
            let streamError: string | null = null;

            setIsLoading(false);

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                if (!value) continue;

                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split("\n\n");
                buffer = events.pop() || "";

                for (const event of events) {
                    const lines = event.split("\n");
                    for (const line of lines) {
                        if (!line.startsWith("data:")) continue;

                        const rawContent = line.slice(5).trim();
                        if (!rawContent) continue;

                        if (rawContent === "[DONE]") {
                            done = true;
                            break;
                        }

                        try {
                            const parsed = JSON.parse(rawContent);

                            if (parsed.error) {
                                streamError = String(parsed.error);
                                accumulatedText = streamError;
                                setMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg
                                    )
                                );
                                continue;
                            }

                            if (parsed.meta) {
                                setMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.id === aiMessageId
                                            ? {
                                                ...msg,
                                                citations: Array.isArray(parsed.meta.citations)
                                                    ? parsed.meta.citations
                                                    : msg.citations,
                                                cached: Boolean(parsed.meta.cached),
                                                cacheKey: parsed.meta.cacheKey || msg.cacheKey || null,
                                                preferences: parsed.meta.preferences || msg.preferences,
                                            }
                                            : msg
                                    )
                                );
                            }

                            const delta = parsed.delta || parsed.text || "";
                            if (!delta) continue;

                            accumulatedText += delta;
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg
                                )
                            );
                        } catch {
                            // Ignore non-JSON keep-alive / partial frames
                        }
                    }
                }
            }

            if (!accumulatedText.trim()) {
                throw new Error(streamError || "The assistant returned an empty response.");
            }
        } catch (error) {
            console.error("Notebook streaming error:", error);
            setIsLoading(false);
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : "The assistant could not respond right now.";
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === aiMessageId
                        ? { ...msg, text: message }
                        : msg
                )
            );
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessageWithStreaming(inputValue, selectedMode);
    };

    const runTemplate = (mode: AssistantMode, prompt: string, label: string) => {
        setSelectedMode(mode);
        sendMessageWithStreaming(prompt, mode, label);
    };

    const sourceCount = sources.length;
    const selectedCount = selectedSourceIds.length;

    return (
        <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
            {toast && (
                <div
                    role="alert"
                    className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-2xl transition-all ${toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                >
                    {toast.message}
                    <button
                        type="button"
                        onClick={() => setToast(null)}
                        className="ml-2 rounded-full p-0.5 hover:bg-white/20"
                        aria-label="Dismiss"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
            <aside className="space-y-6 xl:sticky xl:top-8 self-start">
                <section className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111113] shadow-2xl overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-blue-50 via-white to-sky-50 dark:from-slate-900 dark:via-[#111113] dark:to-slate-950">
                        <div className="flex items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-500 dark:text-blue-400">Study Notebook</p>
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Synapsis AI</h2>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Sources</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">{sourceCount}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            Use your own files and notes like NotebookLM. Local Ollama is used when available; otherwise the backend falls back to Gemini.
                        </p>
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                            >
                                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                Upload files
                            </button>
                            <button
                                onClick={() => handleImportNotes()}
                                disabled={isImportingNotes || notes.length === 0}
                                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-[0.98] disabled:opacity-50"
                            >
                                {isImportingNotes ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                                Import notes
                            </button>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.txt,.md,.docx,.json,.csv,.log"
                            className="hidden"
                            onChange={(event) => handleUploadFiles(event.target.files)}
                        />

                        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-black uppercase text-[11px] tracking-[0.24em]">
                                <Plus size={14} />
                                Paste source text
                            </div>
                            <input
                                type="text"
                                value={sourceTitle}
                                onChange={(e) => setSourceTitle(e.target.value)}
                                placeholder="Source title"
                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111113] px-4 py-3 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <textarea
                                value={sourceContent}
                                onChange={(e) => setSourceContent(e.target.value)}
                                placeholder="Paste lecture notes, outline, or article text here..."
                                className="min-h-[140px] w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111113] px-4 py-3 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                            />
                            <button
                                onClick={handleAddTextSource}
                                disabled={isCreatingTextSource || !sourceContent.trim()}
                                className="w-full rounded-2xl bg-slate-900 dark:bg-white px-4 py-3 text-sm font-bold text-white dark:text-slate-900 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                            >
                                {isCreatingTextSource ? "Adding source..." : "Add text source"}
                            </button>
                        </div>
                    </div>
                </section>

                <section className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111113] shadow-2xl overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Source Library</h3>
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                {selectedCount > 0 ? `${selectedCount} selected` : 'All sources are active by default'}
                            </p>
                        </div>
                        <button
                            onClick={() => setActivePanel(activePanel === 'sources' ? 'notes' : 'sources')}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                        >
                            {activePanel === 'sources' ? 'Show notes' : 'Show sources'}
                        </button>
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search sources"
                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={selectAllSources}
                                className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                            >
                                Select all
                            </button>
                            <button
                                onClick={clearSelectedSources}
                                className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                            >
                                Clear
                            </button>
                        </div>

                        {loadingWorkspace ? (
                            <div className="flex items-center justify-center py-10 text-slate-400 dark:text-slate-500">
                                <Loader2 size={18} className="animate-spin mr-2" />
                                Loading workspace...
                            </div>
                        ) : workspaceError ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                {workspaceError}
                            </div>
                        ) : activePanel === 'sources' ? (
                            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                {filteredSources.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-5 text-sm text-slate-500 dark:text-slate-400">
                                        No saved sources yet. Upload a file or paste text to start building your notebook.
                                    </div>
                                ) : (
                                    filteredSources.map((source) => {
                                        const selected = selectedSourceIds.includes(source.id);
                                        return (
                                            <div
                                                key={source.id}
                                                className={`rounded-3xl border p-4 transition-all ${selected
                                                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111113]'} `}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <button
                                                        onClick={() => toggleSource(source.id)}
                                                        className="text-left flex-1"
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={selected}
                                                                readOnly
                                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                                                                {source.title}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                                                            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">{source.source_type}</span>
                                                            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">{source.chunk_count || 0} chunks</span>
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSource(source.id)}
                                                        className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                {notes.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-5 text-sm text-slate-500 dark:text-slate-400">
                                        No notes found to import.
                                    </div>
                                ) : (
                                    notes.map((note) => (
                                        <div
                                            key={note.id}
                                            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                                                        {note.title}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 line-clamp-3">
                                                        {note.content || 'Empty note'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleImportNotes([note.id])}
                                                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all"
                                                >
                                                    Import
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </aside>

            <main className="space-y-6 min-w-0">
                <section className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111113] shadow-2xl overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-[#111113] dark:to-slate-900 flex flex-col gap-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-500 dark:text-blue-400">Notebook Chat</p>
                                <h2 className="mt-1 text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Ask questions across all your sources
                                </h2>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                                    The assistant will ground answers in the sources you selected and cite the source titles in the reply.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {modeTemplates.map((template) => (
                                    <button
                                        key={template.mode}
                                        onClick={() => {
                                            setSelectedMode(template.mode);
                                            runTemplate(template.mode, template.prompt, template.label);
                                        }}
                                        disabled={isLoading}
                                        className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.22em] transition-all active:scale-[0.98] disabled:opacity-50 ${selectedMode === template.mode
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {template.icon}
                                        {template.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="rounded-full bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                                {selectedCount > 0 ? `${selectedCount} selected sources` : 'All sources active'}
                            </div>
                            <div className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                                Local-first with Ollama fallback
                            </div>
                            <AestheticSelect
                                value={selectedCourse}
                                onChange={setSelectedCourse}
                                icon={<BookOpen size={14} />}
                                className="min-w-[11rem]"
                                buttonClassName="rounded-full px-3 py-1.5"
                                options={[
                                    { value: "", label: "All courses", description: "Use every linked course" },
                                    ...courses.map((course) => ({
                                        value: course.course_name,
                                        label: course.course_name,
                                    })),
                                ]}
                            />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <AestheticSelect
                                label="Format"
                                value={outputFormat}
                                onChange={(value) => setOutputFormat(value as OutputFormat)}
                                options={FORMAT_OPTIONS}
                            />
                            <AestheticSelect
                                label="Depth"
                                value={outputDepth}
                                onChange={(value) => setOutputDepth(value as OutputDepth)}
                                options={DEPTH_OPTIONS}
                            />
                            <AestheticSelect
                                label="Tone"
                                value={outputTone}
                                onChange={(value) => setOutputTone(value as OutputTone)}
                                options={TONE_OPTIONS}
                            />
                            <button
                                type="button"
                                onClick={() => setBypassCache((current) => !current)}
                                className={`flex h-full min-h-[4.25rem] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left shadow-sm transition-all ${bypassCache
                                    ? "border-amber-400/60 bg-amber-50 text-amber-900 shadow-amber-500/10 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
                                    : "border-slate-200/80 bg-white/90 text-slate-700 hover:border-blue-300 dark:border-slate-700/80 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-blue-500/40"
                                    }`}
                            >
                                <span
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bypassCache
                                        ? "bg-amber-500 text-white"
                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                                        }`}
                                >
                                    <RefreshCw size={15} className={bypassCache ? "animate-[spin_2.5s_linear_infinite]" : ""} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                                        Cache
                                    </span>
                                    <span className="block text-xs font-bold leading-tight">
                                        {bypassCache ? "Regenerate fresh" : "Use cached sets"}
                                    </span>
                                    <span className="mt-0.5 block text-[10px] leading-snug opacity-70">
                                        {bypassCache ? "Skip saved study sets" : "Faster repeat answers"}
                                    </span>
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-[#0d0d0f] min-h-[620px]">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-3 max-w-[88%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                            >
                                <div
                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${msg.sender === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600'
                                        }`}
                                >
                                    {msg.sender === 'user' ? <User size={18} /> : <Bot size={18} />}
                                </div>
                                <div className="flex flex-col gap-1.5 w-full">
                                    <div
                                        className={`p-4 md:p-5 rounded-3xl text-sm leading-relaxed ${msg.sender === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-none shadow-md whitespace-pre-line'
                                            : 'bg-white dark:bg-[#111113] text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-tl-none shadow-sm'
                                            }`}
                                    >
                                        {(msg.cached || msg.preferences) && msg.sender === 'ai' && msg.id !== 'welcome' && (
                                            <div className="mb-2 flex flex-wrap gap-1.5">
                                                {msg.cached && (
                                                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                                        Cached study set
                                                    </span>
                                                )}
                                                {msg.preferences && (
                                                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-300">
                                                        {msg.preferences.format} · {msg.preferences.depth} · {msg.preferences.tone}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <AssistantMessageBody
                                            content={msg.text || "..."}
                                            mode={msg.mode}
                                            isUser={msg.sender === "user"}
                                        />
                                        {msg.sender === 'ai' && msg.citations && msg.citations.length > 0 && (
                                            <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                    Source references
                                                </p>
                                                {msg.citations.map((citation) => (
                                                    <div
                                                        key={`${citation.tag}-${citation.sourceId}-${citation.chunkIndex}`}
                                                        className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 px-3 py-2"
                                                    >
                                                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                                            <span className="rounded-md bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-blue-700 dark:text-blue-300">
                                                                [{citation.tag}]
                                                            </span>
                                                            <span className="truncate">{citation.title}</span>
                                                            {typeof citation.noteId === 'number' && (
                                                                <span className="rounded-full bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] text-violet-700 dark:text-violet-300">
                                                                    note #{citation.noteId}
                                                                </span>
                                                            )}
                                                            {typeof citation.chunkIndex === 'number' && (
                                                                <span className="text-slate-400">block {citation.chunkIndex}</span>
                                                            )}
                                                        </div>
                                                        {citation.excerpt && (
                                                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
                                                                {citation.excerpt}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <span className={`text-[10px] block mt-1 text-right ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {msg.sender === 'ai' && msg.text && msg.id !== 'welcome' && (
                                        <button
                                            onClick={() => handleSaveArtifact(msg)}
                                            disabled={savingId === msg.id}
                                            className="self-start flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800/60 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200/50 dark:border-slate-700/50 transition-all active:scale-95 disabled:opacity-50 ml-1"
                                        >
                                            {savingId === msg.id ? <Loader2 size={12} className="animate-spin" /> : <Bookmark size={12} />}
                                            {savingId === msg.id ? 'Saving...' : 'Save to collection'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && !messages[messages.length - 1].text && (
                            <div className="flex gap-3 max-w-[88%] mr-auto">
                                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                                    <Bot size={18} />
                                </div>
                                <div className="p-4 bg-white dark:bg-[#111113] text-slate-500 border border-slate-100 dark:border-slate-800 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-2">
                                    <Loader2 className="animate-spin text-blue-600" size={16} />
                                    <span className="text-xs italic">Synapsis is reading your sources...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="px-4 py-3 bg-white dark:bg-[#111113] border-t border-slate-200 dark:border-slate-800">
                        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder={selectedSourceIds.length > 0 ? 'Ask about the selected sources...' : 'Ask anything across your notebook...'}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 pr-24"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500 hidden md:block">
                                    {selectedMode}
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !inputValue.trim()}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                Send
                            </button>
                        </form>
                    </div>
                </section>
            </main>
        </div>
    );
}
