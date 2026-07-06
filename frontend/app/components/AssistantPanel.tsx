"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Sparkles, User, Bot, Loader2, BookOpen, HelpCircle, FileText, Layers, Bookmark } from "lucide-react";
import axios from "axios";

interface Message {
    id: string;
    sender: "user" | "ai";
    text: string;
    timestamp: Date;
    isPromptTemplate?: boolean;
    templateType?: "summary" | "questions" | "cards";
}

export default function AssistantPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            sender: "ai",
            text: "Selam Tolga! Bugün hangi dersine çalışıyoruz? Yukarıdan ders bağlamını seçip aşağıdaki hızlı modları kullanabilirsin veya direkt bana soru sorabilirsin.",
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);

    const [courses] = useState<string[]>(["Math 101", "Physics", "Software Eng.", "Digital Design"]);
    const [selectedCourse, setSelectedCourse] = useState<string>("Select Course");

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Çıktıyı Veritabanına Kaydetme Fonksiyonu
    const handleSaveArtifact = async (msgId: string, text: string, type?: "summary" | "questions" | "cards") => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setSavingId(msgId);
        try {
            const artifactType = type || "summary";
            const courseName = selectedCourse !== "Select Course" ? selectedCourse : "Genel";

            // Başlığı içeriğin ilk satırından türetelim
            const title = text.split("\n")[0].replace(/[#*]/g, "").trim() || `${courseName} AI Çıktısı`;

            await axios.post(
                "http://localhost:5000/api/auth/ai/artifacts",
                {
                    courseName,
                    artifactType,
                    title: title.length > 50 ? title.substring(0, 50) + "..." : title,
                    content: text
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert("Başarıyla koleksiyonuna kaydedildi!");
        } catch (err) {
            console.error("Artifact kaydetme hatası:", err);
            alert("Kaydedilirken bir hata oluştu.");
        } finally {
            setSavingId(null);
        }
    };

    // Canlı Yayın (Streaming) İstek Mantığı
    const sendMessageWithStreaming = async (promptText: string, userDisplayForm?: string, templateType?: "summary" | "questions" | "cards") => {
        if (!promptText.trim() || isLoading) return;

        const token = localStorage.getItem("token");
        if (!token) {
            alert("Oturum bulunamadı, lütfen tekrar giriş yapın.");
            return;
        }

        const userMessage: Message = {
            id: Math.random().toString(),
            sender: "user",
            text: userDisplayForm || promptText.trim(),
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        const aiMessageId = Math.random().toString();
        const placeholderAiMessage: Message = {
            id: aiMessageId,
            sender: "ai",
            text: "",
            timestamp: new Date(),
            isPromptTemplate: !!templateType,
            templateType
        };
        setMessages((prev) => [...prev, placeholderAiMessage]);

        try {
            const response = await fetch("http://localhost:5000/api/auth/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: promptText,
                    courseName: selectedCourse
                })
            });

            if (!response.body) throw new Error("Stream gövdesi okunamaz durumda.");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            let accumulatedText = "";

            setIsLoading(false);

            // app/components/AssistantPanel.tsx içindeki döngü alanı:

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                if (value) {
                    const chunkStr = decoder.decode(value, { stream: true });

                    // Satırları bölüyoruz
                    const lines = chunkStr.split("\n");
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const rawContent = line.slice(6); // "data: " kısmını kırp

                            if (rawContent.trim() === "[DONE]") {
                                done = true;
                                break;
                            }

                            // Gelen veriyi doğrudan biriktir (JSON.parse çilelerine son)
                            accumulatedText += rawContent;

                            // Ekrana anlık bas
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg
                                )
                            );
                        }
                    }
                }
            }

        } catch (err) {
            console.error("Streaming Hatası:", err);
            setIsLoading(false);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === aiMessageId ? { ...msg, text: "Yapay zeka ile iletişim kurulurken bir hata oluştu." } : msg
                )
            );
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessageWithStreaming(inputValue);
    };

    const triggerMode = (mode: "summary" | "questions" | "cards") => {
        const courseText = selectedCourse !== "Select Course" ? selectedCourse : "Genel";
        if (mode === "summary") {
            sendMessageWithStreaming(`[SUMMARY] Bana ${courseText} dersi notlarımdan çok kısa bir konu özeti çıkar.`, "📝 Konu Özeti Çıkar", "summary");
        } else if (mode === "questions") {
            sendMessageWithStreaming(`[QUESTIONS] ${courseText} dersi için sınavda çıkabilecek örnek sorular hazırla.`, "❓ Örnek Sorular Üret", "questions");
        } else if (mode === "cards") {
            sendMessageWithStreaming(`[CARDS] ${courseText} dersi için hızlı tekrar kartları (flashcards) oluştur.`, "🎴 Flashcard Kartları Yap", "cards");
        }
    };

    return (
        <>
            {/* PANELİ AÇMA BUTONU */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 transition-all hover:scale-110 active:scale-95 z-50 group"
                >
                    <MessageSquare size={24} />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold text-sm uppercase tracking-wider">
                        AI Assistant
                    </span>
                </button>
            )}

            {/* ASİSTAN PANELİ GÖVDESİ */}
            <div
                className={`fixed top-0 right-0 h-full w-full md:w-[400px] bg-white dark:bg-[#111113] border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-300 z-50 flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                {/* HEADER */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 bg-slate-50 dark:bg-[#161619]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-500/10 p-2 rounded-xl text-blue-600 dark:text-blue-400">
                                <Sparkles size={20} className="animate-pulse" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-wider">Synapsis AI</h3>
                                <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Online Study Buddy
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* COURSE SELECTOR DROPDOWN */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
                        <BookOpen size={16} className="text-slate-400 shrink-0" />
                        <select
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="w-full bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                        >
                            <option value="Select Course">Select a Class Context</option>
                            {courses.map((c, index) => (
                                <option key={index} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* CHAT MESSAGES AREA */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-[#0d0d0f]">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                }`}
                        >
                            <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${msg.sender === "user" ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600"
                                    }`}
                            >
                                {msg.sender === "user" ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className="flex flex-col gap-1.5 w-full">
                                <div
                                    className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${msg.sender === "user" ? "bg-blue-600 text-white rounded-tr-none shadow-md" : "bg-white dark:bg-[#111113] text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-tl-none shadow-sm"
                                        }`}
                                >
                                    <p>{msg.text || "..."}</p>
                                    <span className={`text-[10px] block mt-1 text-right ${msg.sender === "user" ? "text-blue-200" : "text-slate-400"}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                {/* SADECE YAPAY ZEKA MESAJLARI BİTTİĞİNDE BELİREN KAYDET BUTONU */}
                                {msg.sender === "ai" && msg.text && msg.id !== "welcome" && (
                                    <button
                                        onClick={() => handleSaveArtifact(msg.id, msg.text, msg.templateType)}
                                        disabled={savingId === msg.id}
                                        className="self-start flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800/60 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200/50 dark:border-slate-700/50 transition-all active:scale-95 disabled:opacity-50 ml-1"
                                    >
                                        {savingId === msg.id ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <Bookmark size={12} />
                                        )}
                                        {savingId === msg.id ? "Kaydediliyor..." : "Çıktıyı Koleksiyona Kaydet"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* INITIAL LOADING STATE */}
                    {isLoading && !messages[messages.length - 1].text && (
                        <div className="flex gap-3 max-w-[85%] mr-auto">
                            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                                <Bot size={16} />
                            </div>
                            <div className="p-4 bg-white dark:bg-[#111113] text-slate-500 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                <Loader2 className="animate-spin text-blue-600" size={16} />
                                <span className="text-xs italic">Synapsis düşünüyor...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* PROMPT TEMPLATES */}
                <div className="px-4 py-2 bg-slate-50 dark:bg-[#161619] border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2">
                    <button
                        onClick={() => triggerMode("summary")}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-all active:scale-95 text-center gap-1 shadow-sm disabled:opacity-50"
                    >
                        <FileText size={16} className="text-blue-500" />
                        <span>Özet Çıkar</span>
                    </button>
                    <button
                        onClick={() => triggerMode("questions")}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-all active:scale-95 text-center gap-1 shadow-sm disabled:opacity-50"
                    >
                        <HelpCircle size={16} className="text-purple-500" />
                        <span>Örnek Soru</span>
                    </button>
                    <button
                        onClick={() => triggerMode("cards")}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-all active:scale-95 text-center gap-1 shadow-sm disabled:opacity-50"
                    >
                        <Layers size={16} className="text-orange-500" />
                        <span>Flashcard</span>
                    </button>
                </div>

                {/* INPUT FORM */}
                <form
                    onSubmit={handleFormSubmit}
                    className="p-4 bg-white dark:bg-[#111113] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
                >
                    <input
                        type="text"
                        placeholder={selectedCourse !== "Select Course" ? `${selectedCourse} hakkında soru sabitle...` : "Sorunu buraya yazabilirsin..."}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        disabled={isLoading}
                        className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white p-3 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </>
    );
}