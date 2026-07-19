"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { User, Mail, Save, X, Edit3, Shield, Sparkles } from "lucide-react";
import { API_BASE_URL } from "../lib/api";

export default function ProfilePage() {
    const { data: session, status, update } = useSession();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({ full_name: "", email: "" });

    // Session verisini forma güvenli bir şekilde aktarma
    useEffect(() => {
        if (session?.user && !isEditing) {
            const displayName = session.user.name || (session.user as any).full_name || "";
            setFormData({
                full_name: displayName,
                email: session.user.email || ""
            });
        }
    }, [session, isEditing]);

    const handleSave = async () => {
        setIsSaving(true);
        const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;

        if (!token) {
            alert("Oturum süreniz dolmuş, lütfen tekrar giriş yapın.");
            setIsSaving(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/update-profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    full_name: formData.full_name,
                    email: formData.email
                })
            });

            if (res.ok) {
                await update({ name: formData.full_name, email: formData.email });
                setIsEditing(false);
            } else {
                const errorData = await res.json();
                alert(`Hata: ${errorData.message}`);
            }
        } catch (error) {
            console.error("İstek hatası:", error);
            alert("Sunucuya ulaşılamadı.");
        } finally {
            setIsSaving(false);
        }
    };

    // Yüklenme asılı kalmasın diye sade bir iskelet
    if (status === "loading") return null;

    const userInitial = formData.full_name?.[0]?.toUpperCase() || "T";

    return (
        <div className="p-8 md:p-12 max-w-5xl mx-auto min-h-screen">
            {/* Sayfa Başlığı */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="text-blue-500" size={24} />
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">My Profile</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Manage your Synapsis account and personal preferences.</p>
                </div>

                {/* Aksiyon Butonları */}
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        <Edit3 size={18} /> Edit Profile
                    </button>
                ) : (
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsEditing(false)}
                            disabled={isSaving}
                            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                        >
                            <X size={18} /> Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
                        >
                            {isSaving ? (
                                <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div>
                            ) : (
                                <><Save size={18} /> Save</>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Ana Profil Kartı */}
            <div className="bg-white dark:bg-[#111113] rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-slate-900/60 border border-slate-100 dark:border-slate-800 overflow-hidden relative">
                {/* Dekoratif Arka Plan (Banner) */}
                <div className="h-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
                </div>

                <div className="px-8 md:px-12 pb-12">
                    {/* Avatar Alanı */}
                    <div className="relative -top-16 flex justify-between items-end mb-2">
                        <div className="w-32 h-32 bg-white dark:bg-[#1a1a1f] rounded-[2rem] p-1.5 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 flex items-center justify-center text-blue-600 text-5xl font-black italic border-4 border-slate-50 dark:border-slate-800 shrink-0 transform transition-transform hover:scale-105">
                            <div className="w-full h-full bg-blue-50 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center dark:text-blue-400">
                                {userInitial}
                            </div>
                        </div>

                        {/* Rozet */}
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl font-bold text-sm mb-4 border border-indigo-100 dark:border-indigo-800">
                            <Shield size={16} />
                            Active User
                        </div>
                    </div>

                    {/* Form Alanları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
                        {/* İsim Alanı */}
                        <div className={`p-6 rounded-3xl transition-colors ${isEditing ? 'bg-blue-50/50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <User size={20} />
                                </div>
                                <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Full Name</p>
                            </div>
                            {isEditing ? (
                                <input
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-700 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-800 dark:text-white transition-all text-lg"
                                    value={formData.full_name}
                                    placeholder="Enter your name"
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            ) : (
                                <p className="text-slate-800 dark:text-slate-100 font-black text-xl px-2">
                                    {formData.full_name || "Not specified"}
                                </p>
                            )}
                        </div>

                        {/* E-posta Alanı */}
                        <div className={`p-6 rounded-3xl transition-colors ${isEditing ? 'bg-purple-50/50 dark:bg-purple-900/20 border-2 border-purple-100 dark:border-purple-800' : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg">
                                    <Mail size={20} />
                                </div>
                                <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email Address</p>
                            </div>
                            {isEditing ? (
                                <input
                                    type="email"
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-700 rounded-xl outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 font-bold text-slate-800 dark:text-white transition-all text-lg"
                                    value={formData.email}
                                    placeholder="ornek@email.com"
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            ) : (
                                <p className="text-slate-800 dark:text-slate-100 font-black text-xl px-2 truncate">
                                    {formData.email || "Not specified"}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}