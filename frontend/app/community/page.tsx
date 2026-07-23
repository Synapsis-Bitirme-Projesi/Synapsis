"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, MessageSquare, Send, NotebookText, Users, Share2 } from "lucide-react";
import { API_BASE_URL } from "../lib/api";
import { initCommunitySocket } from "../lib/socket";

type CommunityPost = {
    id: number;
    kind: "message" | "note";
    title?: string | null;
    body: string;
    note_id?: number | null;
    sender_id: number;
    sender_name: string;
    shared_note_title?: string | null;
    shared_note_content?: string | null;
    created_at: string;
};

type NoteOption = {
    id: number;
    title: string;
    content?: string | null;
};

export default function CommunityPage() {
    const { data: session } = useSession();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [notes, setNotes] = useState<NoteOption[]>([]);
    const [kind, setKind] = useState<"message" | "note">("message");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [selectedNoteId, setSelectedNoteId] = useState<string>("");
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const token = (session as any)?.accessToken || (typeof window !== "undefined" ? localStorage.getItem("token") : null);

    const loadData = useCallback(async () => {
        if (!token) return;

        try {
            const [postsRes, notesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/auth/community/posts`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${API_BASE_URL}/api/auth/notes`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            if (!postsRes.ok || !notesRes.ok) {
                throw new Error("Sohbet verileri alınamadı.");
            }

            const postsData = await postsRes.json();
            const notesData = await notesRes.json();

            setPosts(Array.isArray(postsData.posts) ? postsData.posts : []);
            setNotes(Array.isArray(notesData) ? notesData.map((note: any) => ({
                id: Number(note.id),
                title: String(note.title || "Untitled"),
                content: String(note.content || ""),
            })) : []);
        } catch (err) {
            console.error(err);
            setError("Topluluk akışı yüklenemedi.");
        } finally {
            setLoadingPosts(false);
        }
    }, [token]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const appendCommunityPost = (newPost: CommunityPost) => {
        setPosts((current) => [newPost, ...current.filter((post) => post.id !== newPost.id)]);
    };

    useEffect(() => {
        if (!token) return;

        let mounted = true;
        let activeSocket: any = null;

        (async () => {
            const socket = await initCommunitySocket(token);
            if (!mounted || !socket) return;

            activeSocket = socket;
            socket.on('community:newPost', (newPost: CommunityPost) => {
                appendCommunityPost(newPost);
            });
        })();

        return () => {
            mounted = false;
            if (activeSocket) {
                activeSocket.off('community:newPost');
            }
        };
    }, [token]);

    const notePreview = useMemo(() => {
        return notes.find((note) => String(note.id) === selectedNoteId);
    }, [notes, selectedNoteId]);

    const submitPost = async () => {
        if (!token) {
            setError("Önce giriş yapmanız gerekiyor.");
            return;
        }

        if (kind === "message" && !body.trim()) {
            setError("Mesaj içeriği yazmanız gerekiyor.");
            return;
        }

        if (kind === "note" && !selectedNoteId) {
            setError("Paylaşılacak notu seçmelisiniz.");
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/community/posts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    kind,
                    title: title.trim() || undefined,
                    body: kind === "message" ? body.trim() : notePreview?.content || body.trim(),
                    noteId: kind === "note" ? selectedNoteId : undefined,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "Gönderi paylaşılamadı.");
            }

            setBody("");
            setTitle("");
            setSelectedNoteId("");
            setSuccess(kind === "note" ? "Not topluluk akışına paylaşıldı." : "Mesaj topluluk akışına gönderildi.");
            if (data?.post) {
                appendCommunityPost(data.post);
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Gönderi paylaşılırken hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0c] p-6 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#111113] md:p-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                <Users size={20} />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Community room</span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Study Share</h1>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Kullanıcılar notlarını paylaşabilir, kısa mesajlar gönderebilir ve ortak çalışma akışını izleyebilir.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111113]">
                        <div className="mb-4 flex items-center gap-2">
                            <MessageSquare size={18} className="text-blue-600" />
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">Community feed</h2>
                        </div>

                        {error && (
                            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                                {success}
                            </div>
                        )}

                        {loadingPosts ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <Loader2 className="animate-spin" size={16} />
                                Akış yükleniyor...
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                                Henüz hiç paylaşılan içerik yok. İlk mesajı veya notu siz paylaşın.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {posts.map((post) => (
                                    <article key={post.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white">{post.sender_name}</p>
                                                <p className="text-[11px] text-slate-400">
                                                    {new Date(post.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                {post.kind}
                                            </span>
                                        </div>

                                        {post.title && (
                                            <h3 className="mb-2 text-sm font-black text-slate-800 dark:text-slate-100">{post.title}</h3>
                                        )}

                                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{post.body}</p>

                                        {post.kind === "note" && post.shared_note_title && (
                                            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Shared note</p>
                                                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{post.shared_note_title}</p>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111113]">
                        <div className="mb-4 flex items-center gap-2">
                            <Share2 size={18} className="text-blue-600" />
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">Share with friends</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
                                <button
                                    onClick={() => setKind("message")}
                                    className={`rounded-xl px-3 py-2 text-sm font-bold transition-all ${kind === "message" ? "bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`}
                                >
                                    Message
                                </button>
                                <button
                                    onClick={() => setKind("note")}
                                    className={`rounded-xl px-3 py-2 text-sm font-bold transition-all ${kind === "note" ? "bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`}
                                >
                                    Share note
                                </button>
                            </div>

                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                                Title
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={kind === "message" ? "Optional topic" : "Shared note title"}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </label>

                            {kind === "note" && (
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Select one of your notes
                                    <select
                                        value={selectedNoteId}
                                        onChange={(e) => setSelectedNoteId(e.target.value)}
                                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    >
                                        <option value="">Choose a note</option>
                                        {notes.map((note) => (
                                            <option key={note.id} value={note.id}>
                                                {note.title}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}

                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                                {kind === "message" ? "Message" : "Note preview"}
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    rows={8}
                                    placeholder={kind === "message" ? "Share a quick study message with your friends..." : "Note content will be taken from the selected note."}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </label>

                            {kind === "note" && notePreview && (
                                <div className="rounded-2xl bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                                    <div className="mb-1 flex items-center gap-2 font-black">
                                        <NotebookText size={16} />
                                        {notePreview.title}
                                    </div>
                                    <p className="line-clamp-4 whitespace-pre-wrap">{notePreview.content}</p>
                                </div>
                            )}

                            <button
                                onClick={submitPost}
                                disabled={saving}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-60"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                {saving ? "Sharing..." : "Share now"}
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
