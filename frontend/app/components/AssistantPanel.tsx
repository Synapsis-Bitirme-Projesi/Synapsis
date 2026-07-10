"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
    ArrowRight,
    BookOpen,
    Bookmark,
    Bot,
    FileText,
    HelpCircle,
    Layers,
    Loader2,
    Paperclip,
    Plus,
    Search,
    Send,
    Sparkles,
    Trash2,
    Upload,
    User,
} from "lucide-react";

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
    created_at?: string;
    updated_at?: string;
}

type AssistantMode = "chat" | "summary" | "questions" | "cards" | "compare" | "explain";

interface Message {
    id: string;
    sender: "user" | "ai";
    text: string;
    timestamp: Date;
    mode?: AssistantMode;
}

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

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getToken = () => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("token");
    };

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
                const [sourcesResponse, notesResponse] = await Promise.all([
                    axios.get("http://localhost:5000/api/auth/ai/sources", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get("http://localhost:5000/api/notes", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                setSources(sourcesResponse.data || []);
                setNotes(notesResponse.data || []);
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
            axios.get("http://localhost:5000/api/auth/ai/sources", {
                headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get("http://localhost:5000/api/notes", {
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
                "http://localhost:5000/api/auth/ai/sources",
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
            alert("Text source could not be added.");
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

            await axios.post("http://localhost:5000/api/auth/ai/sources/upload", formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (fileInputRef.current) fileInputRef.current.value = "";
            await refreshWorkspace();
        } catch (error) {
            console.error("Upload source error:", error);
            alert("Files could not be uploaded.");
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
                "http://localhost:5000/api/auth/ai/sources/import-notes",
                { noteIds: noteIds || notes.map((note) => note.id) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await refreshWorkspace();
            setActivePanel("sources");
        } catch (error) {
            console.error("Import notes error:", error);
            alert("Notes could not be imported.");
        } finally {
            setIsImportingNotes(false);
        }
    };

    const handleDeleteSource = async (sourceId: number) => {
        const token = getToken();
        if (!token) return;

        try {
            await axios.delete(`http://localhost:5000/api/auth/ai/sources/${sourceId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSelectedSourceIds((current) => current.filter((id) => id !== sourceId));
            await refreshWorkspace();
        } catch (error) {
            console.error("Delete source error:", error);
            alert("Source could not be deleted.");
        }
    };

    const handleSaveArtifact = async (msgId: string, text: string, mode?: AssistantMode) => {
        const token = getToken();
        if (!token) return;

        setSavingId(msgId);
        try {
            const courseName = selectedSourceIds.length > 0 ? `Notebook ${selectedSourceIds.length}` : "General Notebook";
            const title = text.split("\n")[0].replace(/[#*]/g, "").trim() || "Notebook Output";

            await axios.post(
                "http://localhost:5000/api/auth/ai/artifacts",
                {
                    courseName,
                    artifactType: mode || "summary",
                    title: title.length > 50 ? `${title.substring(0, 50)}...` : title,
                    content: text,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert("Saved to your collection.");
        } catch (error) {
            console.error("Artifact save error:", error);
            alert("Artifact could not be saved.");
        } finally {
            setSavingId(null);
        }
    };

    const sendMessageWithStreaming = async (promptText: string, mode: AssistantMode = "chat", displayText?: string) => {
        const token = getToken();
        if (!promptText.trim() || isLoading || !token) return;

        const userMessage: Message = {
            id: Math.random().toString(),
            sender: "user",
            text: displayText || promptText.trim(),
            timestamp: new Date(),
            mode,
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
            },
        ]);

        try {
            const response = await fetch("http://localhost:5000/api/auth/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    prompt: promptText,
                    mode,
                    sourceIds: selectedSourceIds,
                }),
            });

            if (!response.body) throw new Error("Response stream is unavailable.");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            let buffer = "";
            let accumulatedText = "";

            setIsLoading(false);

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                if (value) {
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

                            let delta = rawContent;
                            try {
                                const parsed = JSON.parse(rawContent);
                                delta = parsed.delta || parsed.text || rawContent;
                            } catch {
                                // raw text fallback
                            }

                            accumulatedText += delta;
                            setMessages((prev) =>
                                prev.map((msg) => (msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg))
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Notebook streaming error:", error);
            setIsLoading(false);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === aiMessageId
                        ? { ...msg, text: "The assistant could not respond right now." }
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
                                        className={`p-4 md:p-5 rounded-3xl text-sm leading-relaxed whitespace-pre-line ${msg.sender === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                                            : 'bg-white dark:bg-[#111113] text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-tl-none shadow-sm'
                                            }`}
                                    >
                                        <p>{msg.text || '...'}</p>
                                        <span className={`text-[10px] block mt-1 text-right ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {msg.sender === 'ai' && msg.text && msg.id !== 'welcome' && (
                                        <button
                                            onClick={() => handleSaveArtifact(msg.id, msg.text, msg.mode)}
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
