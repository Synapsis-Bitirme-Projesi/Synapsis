"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const taskTypeColor = (type) => {
  switch (type) {
    case 'Assignment': return '#3B82F6';
    case 'Quiz': return '#8B5CF6';
    case 'Project': return '#F97316';
    case 'Other': return '#6B7280';
    default: return '#10B981';
  }
};

const AcademicCalendar = ({ isDarkMode, onExamClick = null, tasks = [] }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [exams, setExams] = useState([]);

    // Takvim hesaplamaları
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Pazartesi'den başlaması için ayar (JS'de 0 Pazar'dır)
    const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    useEffect(() => {
        fetchExams();
    }, [currentDate]);

    const fetchExams = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/exams', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExams(res.data);
        } catch (err) { console.error(err); }
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

    return (
        <div className={`p-6 ${isDarkMode ? 'dark' : ''}`}>
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 transition-all">

                {/* Takvim Header */}
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">
                        {monthNames[currentDate.getMonth()]} <span className="text-blue-600 font-light">{currentDate.getFullYear()}</span>
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>

                {/* Gün İsimleri */}
                <div className="grid grid-cols-7 mb-4">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Takvim Grid */}
                <div className="grid grid-cols-7 gap-2">
                    {/* Ayın başındaki boşluklar */}
                    {[...Array(startingDay)].map((_, i) => (
                        <div key={`empty-${i}`} className="h-24 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-transparent"></div>
                    ))}

                    {/* Günler */}
                    {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1;
                        const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                        const dayExams = exams.filter(e => e.exam_date.slice(0,10) === dateString);
                        const dayTasks = tasks.filter(t => t.due_date?.slice(0,10) === dateString);
                        const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                        return (
                            <div key={day} className={`h-24 p-2 rounded-2xl border transition-all relative group cursor-pointer
                                ${isToday ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-900'}
                            `}>
                                <span className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {day}
                                </span>

                                <div className="mt-1 space-y-0.5 overflow-hidden">
                                    {dayExams.map(exam => (
                                        <div
                                            key={`exam-${exam.id}`}
                                            className={`text-[9px] p-1 rounded-md text-white font-medium truncate shadow-sm ${onExamClick ? 'cursor-pointer hover:opacity-75 active:scale-95' : ''}`}
                                            style={{ backgroundColor: exam.color_code }}
                                            title={exam.course_name}
                                            onClick={(e) => { if (onExamClick) { e.stopPropagation(); onExamClick(exam); } }}
                                        >
                                            {exam.course_name}
                                        </div>
                                    ))}
                                    {dayTasks.map(task => (
                                        <div
                                            key={`task-${task.id || task._id}`}
                                            className="text-[9px] p-1 rounded-md text-white font-medium truncate shadow-sm"
                                            style={{ backgroundColor: taskTypeColor(task.type) }}
                                            title={task.title}
                                        >
                                            ✓ {task.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AcademicCalendar;