"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, CheckCircle, AlertCircle } from "lucide-react";

export default function Dashboard() {
    const { data: session, status } = useSession();
    const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });

    // API çağrısını dışarı aldık ki useEffect içinde karmaşa yaratmasın
    const fetchStats = useCallback(async () => {
        const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;
        if (!token) return;

        try {
            const res = await fetch("http://127.0.0.1:5000/api/tasks/stats", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setStats({
                    total: data.total || 0,
                    completed: data.completed || 0,
                    pending: data.pending || 0
                });
            }
        } catch (error) {
            console.error("Dashboard verisi çekilirken hata oluştu:", error);
        }
    }, [session]);

    useEffect(() => {
        if (status === "authenticated") {
            fetchStats();
        }
    }, [status, fetchStats]);

    // KRİTİK: Eğer profil sayfası açılıyor ama burası dönüyorsa 
    // buradaki null dönüşü Layout'taki spinner ile çakışıyor olabilir.
    // status "loading" olsa bile ana iskeleti render ederek kilitlenmeyi kırıyoruz.
    if (status === "loading") return null;

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            <header className="mb-10">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                    Hoş geldin, {session?.user?.name || "Tolga"} 👋
                </h1>
                <p className="text-slate-500 font-medium mt-2">İşlerin her zamanki gibi kontrol altında.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Toplam Görev */}
                <div className="p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 transition-all hover:shadow-md">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                        <LayoutDashboard size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Toplam Görev</p>
                        <p className="text-3xl font-black text-slate-900">{stats.total}</p>
                    </div>
                </div>

                {/* Tamamlanan */}
                <div className="p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 transition-all hover:shadow-md">
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                        <CheckCircle size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tamamlanan</p>
                        <p className="text-3xl font-black text-slate-900">{stats.completed}</p>
                    </div>
                </div>

                {/* Bekleyen */}
                <div className="p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 transition-all hover:shadow-md">
                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Bekleyen</p>
                        <p className="text-3xl font-black text-slate-900">{stats.pending}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}