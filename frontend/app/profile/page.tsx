"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { User, Mail, Save, X, Edit3 } from "lucide-react";

export default function ProfilePage() {
    const { data: session, update } = useSession();
    console.log("NextAuth Session Verisi:", session?.user);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: "", email: "" });

    // 1. ADIM: Veriyi yakalarken daha esnek davranıyoruz
    useEffect(() => {
        if (session?.user) {
            // NextAuth bazen ismi 'name' yerine 'full_name' içinde tutuyor olabilir
            const currentName = session.user.name || (session.user as any).full_name || "";

            if (!isEditing) {
                setFormData({
                    name: currentName,
                    email: session.user.email || ""
                });
            }
        }
    }, [session, isEditing]);

    const handleSave = async () => {
        const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;

        if (!token) {
            alert("Oturum süreniz dolmuş.");
            return;
        }

        try {
            const res = await fetch("http://127.0.0.1:5000/api/auth/update-profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    full_name: formData.name,
                    email: formData.email
                })
            });

            if (res.ok) {
                // 2. ADIM: Modu kapat ve state'i koru
                setIsEditing(false);

                // 3. ADIM: Session'ı manuel zorlayarak güncelle
                await update({
                    ...session,
                    user: {
                        ...session?.user,
                        name: formData.name,
                        email: formData.email
                    }
                });
            }
        } catch (error) {
            alert("Hata oluştu.");
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Üst başlık kısmı aynı */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Profilim</h1>
                </div>
                {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all">
                        <Edit3 size={18} /> Düzenle
                    </button>
                ) : (
                    <div className="flex gap-3">
                        <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-300">
                            <X size={18} /> İptal
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 shadow-lg">
                            <Save size={18} /> Kaydet
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                <div className="px-10 pb-10">
                    <div className="relative -top-12 flex items-end gap-6">
                        <div className="w-24 h-24 bg-white rounded-3xl p-1 shadow-lg flex items-center justify-center text-blue-600 text-3xl font-black italic">
                            {/* Avatar harfi için kontrol */}
                            {formData.name ? formData.name[0].toUpperCase() : (session?.user?.name ? session.user.name[0].toUpperCase() : "S")}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 -mt-6">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-4 mb-2">
                                <User size={18} className="text-blue-500" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tam Ad</p>
                            </div>
                            {isEditing ? (
                                <input
                                    className="w-full p-2 bg-white border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            ) : (
                                <p className="text-slate-900 font-black text-lg">
                                    {/* BURASI DEĞİŞTİ: formData.name boşsa isimsiz kullanıcı deme, state'e güven */}
                                    {formData.name || (session?.user?.name) || "İsim Belirtilmemiş"}
                                </p>
                            )}
                        </div>

                        {/* Email Alanı */}
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-4 mb-2">
                                <Mail size={18} className="text-purple-500" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-posta</p>
                            </div>
                            {isEditing ? (
                                <input
                                    className="w-full p-2 bg-white border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            ) : (
                                <p className="text-slate-900 font-black text-lg">
                                    {formData.email || session?.user?.email}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}