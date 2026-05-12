"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus } from 'lucide-react';

const WeeklySchedule = ({ isDarkMode }) => {
    const [courses, setCourses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const days = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA'];
    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/courses', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className={`w-full transition-colors duration-500 ${isDarkMode ? 'dark bg-slate-900' : 'bg-white'}`}>
            <div className="max-w-7xl mx-auto overflow-hidden">

                {/* HEADER BÖLÜMÜ: bg-slate-800/bg-black yerine isDarkMode kontrolü eklendi */}
                <div className={`p-6 flex justify-between items-center border-b transition-colors duration-300 ${isDarkMode ? 'bg-black border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                    <div>
                        {/* Başlık Rengi: Aydınlıkta text-slate-900 (Siyah), Karanlıkta text-white */}
                        <h2 className={`text-2xl font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                            Haftalık Ders Programı
                        </h2>
                        <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                            Akademik takviminizi buradan yönetin.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <Plus size={18} />
                        <span>Yeni Ders</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* GÜN BAŞLIKLARI */}
                        <div className={`grid grid-cols-[80px_repeat(5,1fr)] border-b transition-colors duration-300 ${isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                            <div className="p-4"></div>
                            {days.map(day => (
                                <div key={day} className={`p-4 text-center font-bold text-xs uppercase tracking-widest transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                    }`}>
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* SAAT SATIRLARI VE IZGARA */}
                        <div className={`relative transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                            {timeSlots.map((time) => (
                                <div key={time} className={`grid grid-cols-[80px_repeat(5,1fr)] border-b transition-colors ${isDarkMode ? 'border-slate-800' : 'border-slate-100'
                                    } min-h-[80px]`}>

                                    {/* Saat Etiketi */}
                                    <div className={`p-3 text-right text-[10px] font-bold flex items-start justify-end transition-colors ${isDarkMode ? 'text-slate-500' : 'text-slate-400'
                                        }`}>
                                        {time}
                                    </div>

                                    {/* Gün Hücreleri */}
                                    {days.map((_, dayIdx) => {
                                        const currentCourse = courses.find(c =>
                                            c.day_of_week === (dayIdx + 1) &&
                                            c.start_time.startsWith(time)
                                        );

                                        return (
                                            <div key={dayIdx} className={`border-l transition-colors ${isDarkMode ? 'border-slate-800' : 'border-slate-100'
                                                } p-1 relative hover:bg-blue-500/5 transition-colors`}>
                                                {currentCourse && (
                                                    <div
                                                        className="absolute inset-x-1 top-1 rounded-lg p-3 shadow-md border-l-4 transition-all hover:scale-[1.02] cursor-pointer"
                                                        style={{
                                                            backgroundColor: isDarkMode ? `${currentCourse.color_code}35` : `${currentCourse.color_code}15`,
                                                            borderColor: currentCourse.color_code,
                                                            color: isDarkMode ? '#f1f5f9' : currentCourse.color_code,
                                                            height: 'calc(100% - 8px)',
                                                            zIndex: 10
                                                        }}
                                                    >
                                                        <div className="font-bold text-[11px] leading-tight mb-1 truncate uppercase">
                                                            {currentCourse.course_name}
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-90 text-[9px] font-semibold">
                                                            <span>{currentCourse.course_code}</span>
                                                            <span className="opacity-50">•</span>
                                                            <span>{currentCourse.location}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeeklySchedule;