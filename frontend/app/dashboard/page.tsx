"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import WeeklySchedule from '../components/WeeklySchedule';
import AcademicCalendar from '../components/AcademicCalendar';
import { useSession } from "next-auth/react";
import { Search, Bell, Sun, Moon, Calendar, Clock, AlertCircle, GraduationCap } from 'lucide-react';

export default function DashboardPage() {
    const { data: session } = useSession();
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('synapsis-theme') === 'dark';
        }
        return false;
    });

    useEffect(() => {
        const syncWithDB = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:5000/api/auth/settings/theme', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const dbTheme = res.data.theme === 'dark';
                if (dbTheme !== isDarkMode) setIsDarkMode(dbTheme);
            } catch (err) {
                console.error("Tema DB'den alınamadı");
            }
        };
        syncWithDB();
    }, []);

    const handleThemeToggle = async () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/auth/settings/theme',
                { theme: newMode ? 'dark' : 'light' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (err) {
            console.error("Tema DB'ye kaydedilemedi");
        }
    };

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('synapsis-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('synapsis-theme', 'light');
        }
    }, [isDarkMode]);

    return (
        <div className="min-h-screen bg-transparent transition-colors duration-500">

            {/* HEADER */}
            <header className="h-20 bg-white/80 dark:bg-[#0d0d0f]/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-40 transition-colors">
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Ders veya sınav ara..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border-none text-sm outline-none text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={handleThemeToggle} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                        {isDarkMode ? <Sun size={22} className="text-yellow-400 animate-pulse" /> : <Moon size={22} />}
                    </button>
                    <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><Bell size={20} /></button>
                    <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 hidden sm:block">{session?.user?.name || "User"}</span>
                        <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">{session?.user?.name?.[0] || "U"}</div>
                    </div>
                </div>
            </header>

            <main className="p-8 md:p-12 space-y-12 max-w-[1400px] mx-auto">

                {/* KARŞILAMA MESAJI */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Merhaba, <span className="text-blue-600 dark:text-blue-400">{session?.user?.name || "User"}</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-2 bg-white dark:bg-[#111113] px-4 py-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                            <Calendar size={18} className="text-blue-500" />
                            <span>6 Mayıs 2026, Çarşamba</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-[#111113] px-4 py-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                            <Clock size={18} className="text-indigo-500" />
                            <span>Bugün 2 dersin var.</span>
                        </div>
                    </div>
                </div>

                {/* ÜST KARTLAR (Sınavlar & Görevler) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Yaklaşan Sınavlar */}
                    <div className="bg-white dark:bg-[#111113] rounded-[40px] p-8 shadow-xl border border-slate-50 dark:border-slate-800 transition-all hover:scale-[1.01]">
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400"><Calendar size={28} /></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-sans">Son Tarihler</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 font-sans">Yaklaşan Sınavlar</h3>
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 min-w-[70px]">
                                    <span className="text-[10px] font-bold text-blue-100 uppercase">May</span>
                                    <span className="text-2xl font-black text-white">14</span>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">Final Project Due</p>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium italic">Synapsis Phase 2</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Acil Görevler */}
                    <div className="bg-white dark:bg-[#111113] rounded-[40px] p-8 shadow-xl border border-slate-50 dark:border-slate-800 transition-all hover:scale-[1.01]">
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400"><AlertCircle size={28} /></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-sans">Öncelik</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 font-sans">Acil Görevler</h3>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-4 group cursor-pointer">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse"></div>
                                <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-rose-500 transition-colors">Azure DB ayarlarını tamamla</span>
                            </li>
                            <li className="flex items-center gap-4 opacity-50"><div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600"></div><span className="font-medium text-slate-500 dark:text-slate-400 line-through">Layout düzenlemesi yapıldı</span></li>
                        </ul>
                    </div>
                </div>

                {/* 📅 HAFTALIK DERS PROGRAMI */}
                <section className="bg-white dark:bg-[#111113] rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
                    <WeeklySchedule isDarkMode={isDarkMode} />
                </section>

                {/* 🗓️ AKADEMİK TAKVİM (GERİ GELDİ) */}
                <section className="pb-10">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6 flex items-center gap-3 transition-colors">
                        <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                        Akademik Takvim
                    </h3>
                    <div className="bg-white dark:bg-[#111113] rounded-[40px] shadow-xl p-4 border border-slate-100 dark:border-slate-800">
                        <AcademicCalendar isDarkMode={isDarkMode} />
                    </div>
                </section>

            </main>
        </div>
    );
}