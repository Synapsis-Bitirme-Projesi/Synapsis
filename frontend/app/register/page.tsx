"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Mail, Lock, User as UserIcon } from "lucide-react";

export default function RegisterPage() {
    const [formData, setFormData] = useState({ name: "", email: "", password: "" });
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); // Hata mesajını temizle

        try {
            const res = await fetch("http://127.0.0.1:5000/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // KRİTİK DEĞİŞİKLİK: name -> full_name eşlemesi yapıldı
                body: JSON.stringify({
                    full_name: formData.name,
                    email: formData.email,
                    password: formData.password
                }),
            });

            if (res.ok) {
                router.push("/login");
            } else {
                const data = await res.json();
                setError(data.message || "Kayıt başarısız.");
            }
        } catch (err) {
            setError("Sunucuya bağlanılamadı. Lütfen backend'in çalıştığından emin olun.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-blue-50 text-blue-600 rounded-2xl mb-4 shadow-sm">
                        <UserPlus size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Hesap Oluştur</h2>
                    <p className="text-slate-500 font-medium mt-3">Synapsis dünyasına katılın.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Ad Soyad */}
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Ad Soyad"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none border border-transparent focus:border-blue-100"
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    {/* E-posta */}
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="email"
                            placeholder="E-posta"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none border border-transparent focus:border-blue-100"
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    {/* Şifre */}
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="password"
                            placeholder="Şifre"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none border border-transparent focus:border-blue-100"
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <button className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 transition-all mt-4">
                        Kayıt Ol
                    </button>
                </form>

                <p className="text-center mt-8 text-slate-500 font-bold text-sm">
                    Zaten hesabınız var mı?{" "}
                    <Link href="/login" className="text-blue-600 hover:underline">Giriş Yap</Link>
                </p>
            </div>
        </div>
    );
}