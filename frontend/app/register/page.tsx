"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, User as UserIcon, Mail, Lock, Key } from "lucide-react";
import { API_BASE_URL } from "../lib/api";

export default function RegisterPage() {
    const [step, setStep] = useState<1 | 2>(1);
    const [formData, setFormData] = useState({ name: "", email: "", password: "", code: "" });
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setInfo("");
        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: formData.name,
                    email: formData.email,
                    password: formData.password
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setInfo(data.message || "Doğrulama kodu gönderildi. E-postanızı kontrol edin.");
                setStep(2);
            } else {
                setError(data.message || "Doğrulama kodu gönderilemedi.");
            }
        } catch (err) {
            setError("Sunucuya bağlanılamadı. Lütfen backend'in çalıştığından emin olun.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setInfo("");
        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/register/confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    code: formData.code
                }),
            });

            const data = await res.json();
            if (res.ok) {
                router.push("/login");
            } else {
                setError(data.message || "Doğrulama başarısız.");
            }
        } catch (err) {
            setError("Sunucuya bağlanılamadı. Lütfen backend'in çalıştığından emin olun.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = "w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-100 dark:focus:border-blue-800 transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0c] flex items-center justify-center p-6 text-slate-900 dark:text-slate-100">
            <div className="max-w-md w-full bg-white dark:bg-[#111113] rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 dark:border-slate-800">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl mb-4 shadow-sm">
                        <UserPlus size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Create Account</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-3">Join Synapsis today.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-800 animate-pulse">
                        {error}
                    </div>
                )}
                {info && (
                    <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-sm font-bold border border-emerald-100 dark:border-emerald-800">
                        {info}
                    </div>
                )}

                <form onSubmit={step === 1 ? handleSendCode : handleConfirmCode} className="space-y-4">
                    {step === 1 ? (
                        <>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={formData.name}
                                    className={inputClass}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="email"
                                    placeholder="E-posta"
                                    value={formData.email}
                                    className={inputClass}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="password"
                                    placeholder="Şifre"
                                    value={formData.password}
                                    className={inputClass}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="email"
                                    placeholder="E-posta"
                                    value={formData.email}
                                    className={inputClass}
                                    disabled
                                />
                            </div>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Doğrulama Kodu"
                                    value={formData.code}
                                    className={inputClass}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                />
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-100 dark:shadow-blue-900/30 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 transition-all mt-4 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {step === 1 ? 'Kod Gönder' : 'Kodu Onayla'}
                    </button>
                </form>
            </div>
        </div>
    );
}

