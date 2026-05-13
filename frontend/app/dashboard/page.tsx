"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import WeeklySchedule from '../components/WeeklySchedule';
import AcademicCalendar from '../components/AcademicCalendar';
import { useSession } from "next-auth/react";
import { Search, Bell, Sun, Moon, Calendar, Clock, AlertCircle } from 'lucide-react';

interface Deadline {
    key: string;
    title: string;
    date: string;
    type: string;
    color: string;
    subtitle?: string;
}

interface Task {
    _id?: string;
    id?: string;
    title: string;
    priority: string;
    status?: string;
    due_date?: string;
    type?: string;
}

function deadlineColor(type: string): string {
    switch (type) {
        case 'Assignment': return '#3B82F6';
        case 'Quiz': return '#8B5CF6';
        case 'Project': return '#F97316';
        case 'Other': return '#6B7280';
        default: return '#10B981';
    }
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('synapsis-theme') === 'dark';
        }
        return false;
    });
    const [upcomingDeadlines, setUpcomingDeadlines] = useState<Deadline[]>([]);
    const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
    const [calendarTasks, setCalendarTasks] = useState<Task[]>([]);
    const [loadingDeadlines, setLoadingDeadlines] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [todayClassCount, setTodayClassCount] = useState<number | null>(null);
    const todayDow = new Date().getDay();

    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoadingDeadlines(false);
                setLoadingTasks(false);
                return;
            }
            const today = new Date().toISOString().slice(0, 10);

            // Courses → classes today count
            try {
                const res = await axios.get('http://localhost:5000/api/courses', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const count = (res.data as any[]).filter(c => c.day_of_week === todayDow).length;
                setTodayClassCount(count);
            } catch {
                setTodayClassCount(0);
            }

            // Exams + Tasks → unified Upcoming Deadlines
            try {
                const [examsRes, tasksRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/exams', { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get('http://localhost:5000/api/auth/tasks', { headers: { Authorization: `Bearer ${token}` } }),
                ]);

                const examDeadlines: Deadline[] = (examsRes.data as any[])
                    .filter(e => e.exam_date?.slice(0, 10) >= today)
                    .map(e => ({
                        key: `exam-${e.id}`,
                        title: e.course_name,
                        date: e.exam_date.slice(0, 10),
                        type: 'Exam',
                        color: e.color_code || '#EF4444',
                        subtitle: [e.exam_time, e.location].filter(Boolean).join(' · '),
                    }));

                const allTasks = tasksRes.data as Task[];

                const taskDeadlines: Deadline[] = allTasks
                    .filter(t => t.due_date && t.due_date.slice(0, 10) >= today && t.status !== 'done')
                    .map(t => ({
                        key: `task-${t._id || t.id}`,
                        title: t.title,
                        date: t.due_date!.slice(0, 10),
                        type: t.type || 'Task',
                        color: deadlineColor(t.type || 'Task'),
                    }));

                const merged = [...examDeadlines, ...taskDeadlines]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 5);
                setUpcomingDeadlines(merged);

                setCalendarTasks(allTasks.filter(t => t.due_date));

                const incomplete = allTasks
                    .filter(t => t.status !== 'done')
                    .sort((a, b) => (a.priority?.toLowerCase() === 'high' ? -1 : 1) - (b.priority?.toLowerCase() === 'high' ? -1 : 1))
                    .slice(0, 5);
                setUrgentTasks(incomplete);
            } catch (err) {
                console.error('Failed to fetch dashboard data:', err);
            } finally {
                setLoadingDeadlines(false);
                setLoadingTasks(false);
            }
        };
        fetchDashboardData();
    }, []);

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
                        placeholder="Search courses or exams..."
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
                        Hello, <span className="text-blue-600 dark:text-blue-400">{session?.user?.name || "User"}</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-2 bg-white dark:bg-[#111113] px-4 py-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                            <Calendar size={18} className="text-blue-500" />
                            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        {todayClassCount !== null && todayDow !== 0 && todayDow !== 6 && (
                            <div className="flex items-center gap-2 bg-white dark:bg-[#111113] px-4 py-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                                <Clock size={18} className="text-indigo-500" />
                                <span>
                                    {todayClassCount === 0
                                        ? "No classes today."
                                        : `You have ${todayClassCount} class${todayClassCount > 1 ? 'es' : ''} today.`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ÜST KARTLAR (Sınavlar & Görevler) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Upcoming Deadlines */}
                    <div className="bg-white dark:bg-[#111113] rounded-[40px] p-8 shadow-xl border border-slate-50 dark:border-slate-800 transition-all hover:scale-[1.01]">
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400"><Calendar size={28} /></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-sans">Deadlines</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 font-sans">Upcoming Deadlines</h3>
                        {loadingDeadlines ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                            </div>
                        ) : upcomingDeadlines.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm font-medium">
                                No upcoming deadlines.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingDeadlines.map(dl => {
                                    const d = new Date(dl.date + 'T00:00:00');
                                    const month = d.toLocaleDateString('en-US', { month: 'short' });
                                    const day = d.getDate();
                                    return (
                                        <div key={dl.key} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex flex-col items-center p-3 rounded-2xl shadow-md min-w-[60px]" style={{ backgroundColor: dl.color }}>
                                                <span className="text-[10px] font-bold text-white/80 uppercase">{month}</span>
                                                <span className="text-xl font-black text-white">{day}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{dl.title}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: dl.color }}>{dl.type}</span>
                                                    {dl.subtitle && <span className="text-sm text-slate-500 dark:text-slate-400 font-medium truncate">{dl.subtitle}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Acil Görevler */}
                    <div className="bg-white dark:bg-[#111113] rounded-[40px] p-8 shadow-xl border border-slate-50 dark:border-slate-800 transition-all hover:scale-[1.01]">
                        <div className="flex justify-between items-start mb-8">
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400"><AlertCircle size={28} /></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-sans">Priority</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 font-sans">Urgent Tasks</h3>
                        {loadingTasks ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-500"></div>
                            </div>
                        ) : urgentTasks.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm font-medium">
                                No pending tasks.
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {urgentTasks.map(task => (
                                    <li key={task._id || task.id} className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${task.priority?.toLowerCase() === 'high' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`}></div>
                                        <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate flex-1">{task.title}</span>
                                        {task.priority?.toLowerCase() === 'high' && (
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">High</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
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
                        Academic Calendar
                    </h3>
                    <div className="bg-white dark:bg-[#111113] rounded-[40px] shadow-xl p-4 border border-slate-100 dark:border-slate-800">
                        <AcademicCalendar isDarkMode={isDarkMode} tasks={calendarTasks} />
                    </div>
                </section>

            </main>
        </div>
    );
}