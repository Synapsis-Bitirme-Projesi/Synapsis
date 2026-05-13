"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, LogIn } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.ok) {
            router.push("/dashboard");
        } else {
            setError("Giriş başarısız! E-posta veya şifre hatalı.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-[#0a0a0c] dark:to-slate-900 flex items-center justify-center p-6 text-slate-900 dark:text-slate-100">
            <div className="bg-white/80 dark:bg-[#111113]/90 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-800 w-full max-w-md">

                {/* Logo & Başlık */}
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl mb-4">
                        <LogIn size={32} />
                    </div>
                    <h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                        Synapsis Login
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Continue where you left off.</p>
                </div>

                {/* Hata Mesajı */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-800 animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Input */}
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="email"
                            placeholder="Email"
                            className="w-full pl-12 pr-4 py-4 bg-blue-50/50 dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {/* Password Input */}
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full pl-12 pr-4 py-4 bg-blue-50/50 dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/30 hover:scale-[1.02] active:scale-95 transition-all mt-2"
                    >
                        Sign In
                    </button>
                </form>

                <p className="text-center mt-8 text-slate-500 dark:text-slate-400 font-bold text-sm">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
}
