"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { initSocket } from "../lib/socket";
import { API_BASE_URL } from "../lib/api";
import { ArrowLeft, MessageSquare, Send, UserPlus, Users } from "lucide-react";

type UserItem = {
    id: number;
    name: string;
    email: string;
};

type ChatMessage = {
    id: number;
    sender_user_id: number;
    recipient_user_id: number;
    content: string;
    created_at: string;
    sender_name: string;
};

export default function MessagesPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [availableUsers, setAvailableUsers] = useState<UserItem[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<Array<{ id: number; requester_user_id: number; requester_name: string; requester_email: string }>>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<Array<{ id: number; recipient_user_id: number; recipient_name: string; recipient_email: string }>>([]);
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messageText, setMessageText] = useState("");
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [loadingAvailable, setLoadingAvailable] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState("");

    const token = (session as any)?.accessToken || (typeof window !== "undefined" ? localStorage.getItem("token") : null);

    const fetchUsers = async () => {
        if (!token) return;
        setError("");
        setLoadingUsers(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "Kullanıcılar yüklenemedi.");
            }
            setUsers(Array.isArray(data.users) ? data.users : []);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Kullanıcı listesi yüklenemedi.");
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchAvailableUsers = async () => {
        if (!token) return;
        setError("");
        setLoadingAvailable(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/users/available`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "Kullanıcılar yüklenemedi.");
            }
            setAvailableUsers(Array.isArray(data.users) ? data.users : []);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Kullanıcı listesi yüklenemedi.");
        } finally {
            setLoadingAvailable(false);
        }
    };

    const fetchContactRequests = async () => {
        if (!token) return;
        setError("");
        setLoadingRequests(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/users/requests`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "İstekler yüklenemedi.");
            }
            setIncomingRequests(Array.isArray(data.incoming) ? data.incoming : []);
            setOutgoingRequests(Array.isArray(data.outgoing) ? data.outgoing : []);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "İstekler yüklenemedi.");
        } finally {
            setLoadingRequests(false);
        }
    };

    const fetchMessages = async (userId: number) => {
        if (!token) return;
        setError("");
        setLoadingMessages(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/direct/messages?withUserId=${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "Mesajlar yüklenemedi.");
            }
            setMessages(Array.isArray(data.messages) ? data.messages : []);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Mesajlar yüklenemedi.");
        } finally {
            setLoadingMessages(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchAvailableUsers();
        fetchContactRequests();
    }, [token]);

    useEffect(() => {
        if (!selectedUser) {
            setMessages([]);
            return;
        }
        fetchMessages(selectedUser.id);
    }, [selectedUser, token]);

    useEffect(() => {
        if (!token) return;
        let activeSocket: any = null;
        const handleIncoming = (incoming: ChatMessage) => {
            if (!selectedUser) return;
            const isRelevant =
                incoming.sender_user_id === selectedUser.id || incoming.recipient_user_id === selectedUser.id;
            if (!isRelevant) return;
            setMessages((current) => [...current, incoming]);
        };

        (async () => {
            const socket = await initSocket(token);
            if (!socket) return;
            activeSocket = socket;
            socket.on("direct:message", handleIncoming);
        })();

        return () => {
            if (activeSocket) {
                activeSocket.off("direct:message", handleIncoming);
            }
        };
    }, [token, selectedUser]);

    const selectedUserName = useMemo(() => selectedUser?.name || "", [selectedUser]);

    const sendMessage = async () => {
        if (!selectedUser || !messageText.trim() || !token) return;
        setError("");

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/direct/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ recipientUserId: selectedUser.id, content: messageText.trim() }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "Mesaj gönderilemedi.");
            }

            if (data?.message) {
                setMessages((current) => [...current, data.message]);
            }
            setMessageText("");
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Mesaj gönderilirken hata oluştu.");
        }
    };

    const sendContactRequest = async (recipientId: number) => {
        if (!token) return;
        setError("");

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/users/requests`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ recipientUserId: recipientId }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "İstek gönderilemedi.");
            }
            await fetchAvailableUsers();
            await fetchContactRequests();
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "İstek gönderilirken hata oluştu.");
        }
    };

    const respondContactRequest = async (requestId: number, action: 'accepted' | 'declined') => {
        if (!token) return;
        setError("");

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/users/requests/${requestId}/respond`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ action }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "İstek yanıtlanamadı.");
            }
            await fetchUsers();
            await fetchAvailableUsers();
            await fetchContactRequests();
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "İstek yanıtlanırken hata oluştu.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0c] p-6 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#111113] md:p-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                <MessageSquare size={20} />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Messages</span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Private Chat</h1>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Kullanıcılar arasında özel mesajlaşma.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[280px_1.2fr]">
                    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111113]">
                        <div className="mb-4 flex items-center gap-2">
                            <Users size={18} className="text-blue-600" />
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">Users</h2>
                        </div>

                        {loadingUsers ? (
                            <div className="text-sm text-slate-500 dark:text-slate-400">Kullanıcılar yükleniyor...</div>
                        ) : users.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                                Başka kullanıcı bulunamadı.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {users.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${selectedUser?.id === user.id
                                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-300'
                                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <div>
                                            <p className="font-black">{user.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                        </div>
                                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            Chat
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111113]">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                {selectedUser ? (
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:bg-slate-800"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>
                                ) : null}
                                <div>
                                    <p className="text-sm font-black text-slate-900 dark:text-white">{selectedUser ? `Chat with ${selectedUserName}` : 'Choose a user to start'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Private direct messages are delivered instantly.</p>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                                {selectedUser ? 'Private' : 'Awaiting selection'}
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                                {error}
                            </div>
                        )}

                        {selectedUser ? (
                            <>
                                <div className="mb-4 h-[420px] overflow-y-auto rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/95">
                                    {loadingMessages ? (
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Mesajlar yükleniyor...</p>
                                    ) : messages.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                                            Bu kullanıcıyla henüz mesajlaşmadınız.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {messages.map((message) => {
                                                const isMine = message.sender_user_id !== selectedUser.id;
                                                return (
                                                    <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm leading-6 ${isMine
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200'
                                                            }`}>
                                                            <p className="font-semibold text-[11px] uppercase tracking-[0.2em] opacity-70">
                                                                {isMine ? 'You' : message.sender_name}
                                                            </p>
                                                            <p className="mt-2 whitespace-pre-wrap">{message.content}</p>
                                                            <p className="mt-2 text-[10px] opacity-70">{new Date(message.created_at).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <textarea
                                        value={messageText}
                                        onChange={(event) => setMessageText(event.target.value)}
                                        rows={3}
                                        placeholder={`Enter a message to ${selectedUser.name}...`}
                                        className="min-h-[88px] flex-1 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-900"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        className="inline-flex h-[88px] min-w-[120px] items-center justify-center rounded-3xl bg-blue-600 px-6 font-black text-white transition-all hover:bg-blue-700"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                                Sol taraftan bir kullanıcı seçerek özel mesajlaşmaya başlayabilirsiniz.
                            </div>
                        )}
                    </section>
                </div>
                <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111113]">
                    <div className="mb-4 flex items-center gap-2">
                        <UserPlus size={18} className="text-blue-600" />
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">Contact Requests</h2>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/95">
                            <p className="mb-3 font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Incoming</p>
                            {loadingRequests ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">Yükleniyor...</p>
                            ) : incomingRequests.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">Bekleyen isteğiniz yok.</p>
                            ) : (
                                <div className="space-y-3">
                                    {incomingRequests.map((request) => (
                                        <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f1115]">
                                            <p className="font-semibold text-slate-900 dark:text-slate-100">{request.requester_name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{request.requester_email}</p>
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => respondContactRequest(request.id, 'accepted')}
                                                    className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => respondContactRequest(request.id, 'declined')}
                                                    className="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-black text-white transition hover:bg-rose-700"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/95">
                            <p className="mb-3 font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Outgoing</p>
                            {loadingRequests ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">Yükleniyor...</p>
                            ) : outgoingRequests.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">Gönderilmiş bir isteğiniz yok.</p>
                            ) : (
                                <div className="space-y-3">
                                    {outgoingRequests.map((request) => (
                                        <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f1115]">
                                            <p className="font-semibold text-slate-900 dark:text-slate-100">{request.recipient_name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{request.recipient_email}</p>
                                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Waiting for response</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/95">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <p className="font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Send request</p>
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">Available</span>
                        </div>
                        {loadingAvailable ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Yükleniyor...</p>
                        ) : availableUsers.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Yeni kullanıcı isteği gönderebileceğiniz kimse yok.</p>
                        ) : (
                            <div className="space-y-3">
                                {availableUsers.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f1115]">
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                        </div>
                                        <button
                                            onClick={() => sendContactRequest(user.id)}
                                            className="rounded-2xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-700"
                                        >
                                            Request
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>            </div>
        </div>
    );
}
