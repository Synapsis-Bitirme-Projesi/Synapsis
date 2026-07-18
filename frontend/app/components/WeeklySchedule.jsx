"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { buildScheduleGrid, formatTime, getCourseSpanHeight } from './scheduleGrid.mjs';
import { API_BASE_URL } from '../lib/api';

const WeeklySchedule = ({ isDarkMode }) => {
    const [courses, setCourses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    const scheduleGrid = buildScheduleGrid(courses);

    const [formData, setFormData] = useState({
      course_name: '',
      course_code: '',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '09:00',
      location: '',
      color_code: '#3B82F6'
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/courses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(res.data);
        } catch (err) {
            console.error(err);
            setLoadError('Schedule could not be loaded.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
      setIsModalOpen(false);
      setEditingCourse(null);
      setError('');
    };

    const openAddModal = () => {
      setEditingCourse(null);
      setFormData({
        course_name: '',
        course_code: '',
        day_of_week: 1,
        start_time: '08:00',
        end_time: '09:00',
        location: '',
        color_code: '#3B82F6'
      });
      setIsModalOpen(true);
    };

    const openEditModal = (course) => {
      setEditingCourse(course);
      setFormData({
        course_name: course.course_name || '',
        course_code: course.course_code || '',
        day_of_week: course.day_of_week || 1,
        start_time: formatTime(course.start_time) || '08:00',
        end_time: formatTime(course.end_time) || '09:00',
        location: course.location || '',
        color_code: course.color_code || '#3B82F6'
      });
      setIsModalOpen(true);
    };

    const handleChange = (e) => {
      setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const token = localStorage.getItem('token');
        if (editingCourse) {
          await axios.put(`${API_BASE_URL}/api/courses/${editingCourse.id}`, formData, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          await axios.post(`${API_BASE_URL}/api/courses`, formData, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        setIsModalOpen(false);
        setEditingCourse(null);
        setFormData({
          course_name: '',
          course_code: '',
          day_of_week: 1,
          start_time: '08:00',
          end_time: '09:00',
          location: '',
          color_code: '#3B82F6'
        });
        fetchCourses();
        } catch (err) {
          console.error('Error adding course:', err);
          setError(err.response?.data?.error || err.message || 'Failed to add course. Please try again.');
        }
    };

    const handleDelete = async (course) => {
      if (!window.confirm(`Delete ${course.course_name}?`)) return;

      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/api/courses/${course.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCourses(prev => prev.filter(item => item.id !== course.id));
      } catch (err) {
        console.error('Error deleting course:', err);
        setError(err.response?.data?.error || err.message || 'Failed to delete course. Please try again.');
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
                            Weekly Schedule
                        </h2>
                        <p className={`text-sm mt-1 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                            Manage your academic schedule.
                        </p>
                    </div>
                    <button
                      onClick={openAddModal}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <Plus size={18} />
                        <span>New Course</span>
                    </button>
                </div>

                {loadError && (
                    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                        <AlertCircle size={16} />
                        {loadError}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500">
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Loading schedule...
                    </div>
                ) : (
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
                                        const startingCourses = scheduleGrid[dayIdx + 1]?.[time] || [];
                                        const blockHeight = startingCourses.length > 0
                                            ? getCourseSpanHeight(time, startingCourses, timeSlots)
                                            : null;
                                        const isOverlap = startingCourses.length > 1;

                                        return (
                                            <div
                                                key={dayIdx}
                                                className={`border-l transition-colors ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} p-1 relative hover:bg-blue-500/5`}
                                                style={{ overflow: startingCourses.length > 0 ? 'visible' : undefined }}
                                            >
                                                {startingCourses.length > 0 && (
                                                    <div
                                                        className="absolute inset-x-1 top-1 bottom-auto z-10 flex flex-col gap-1"
                                                        style={{ height: `${blockHeight}px` }}
                                                    >
                                                        {isOverlap && (
                                                            <div className="self-start rounded-full bg-slate-950/80 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shrink-0">
                                                                {startingCourses.length} overlapping
                                                            </div>
                                                        )}

                                                        <div className={`min-h-0 flex-1 flex ${isOverlap ? 'flex-row gap-1' : 'flex-col'}`}>
                                                            {startingCourses.map((course, courseIdx) => (
                                                                <div
                                                                    key={`${course.id || course.course_code}-${course.start_time}-${courseIdx}`}
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onClick={() => openEditModal(course)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                            e.preventDefault();
                                                                            openEditModal(course);
                                                                        }
                                                                    }}
                                                                    className={`group min-w-0 min-h-0 h-full rounded-lg px-1.5 py-1 border-l-4 border shadow-md overflow-hidden cursor-pointer transition-all hover:brightness-[1.05] hover:z-20 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${isOverlap ? 'flex-1' : 'w-full'}`}
                                                                    style={{
                                                                        backgroundColor: isDarkMode ? `${course.color_code}40` : `${course.color_code}18`,
                                                                        borderColor: course.color_code,
                                                                        color: isDarkMode ? '#f8fafc' : course.color_code,
                                                                    }}
                                                                >
                                                                    <div className="flex h-full flex-col justify-between gap-0.5">
                                                                        <div className="min-w-0">
                                                                            <div className={`font-bold leading-tight truncate uppercase ${isOverlap ? 'text-[10px]' : 'text-[11px]'}`}>
                                                                                {course.course_name}
                                                                            </div>
                                                                            <div className={`mt-0.5 opacity-90 font-semibold leading-tight ${isOverlap ? 'text-[8px]' : 'text-[9px]'}`}>
                                                                                <div className="truncate">{course.course_code}</div>
                                                                                <div className="truncate">
                                                                                    {formatTime(course.start_time)}-{formatTime(course.end_time)}
                                                                                </div>
                                                                                {course.location && !isOverlap && (
                                                                                    <div className="truncate">{course.location}</div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 shrink-0">
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    openEditModal(course);
                                                                                }}
                                                                                className="rounded-full bg-white/80 p-0.5 text-slate-700 shadow-sm hover:bg-white"
                                                                                aria-label={`Edit ${course.course_name}`}
                                                                            >
                                                                                <Pencil size={9} />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDelete(course);
                                                                                }}
                                                                                className="rounded-full bg-white/80 p-0.5 text-rose-600 shadow-sm hover:bg-rose-50"
                                                                                aria-label={`Delete ${course.course_name}`}
                                                                            >
                                                                                <Trash2 size={9} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
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
                )}
            </div>

            {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 shadow-black/10'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">{editingCourse ? 'Edit Course' : 'Add New Course'}</h3>
                    <button
                      onClick={handleClose}
                      className={`p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all ${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className={`p-3 rounded-xl border text-sm ${isDarkMode ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-red-50 border-red-400 text-red-800'}`} role="alert">
                        {error}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold mb-2">Course Name</label>
                      <input
                        name="course_name"
                        value={formData.course_name}
                        onChange={handleChange}
                        required
                        className={`w-full px-4 py-3 rounded-xl border focus:border-blue-500 focus:outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-500'}`}
                        placeholder="E.g., Web Programming"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Course Code</label>
                      <input
                        name="course_code"
                        value={formData.course_code}
                        onChange={handleChange}
                        required
                        className={`w-full px-4 py-3 rounded-xl border focus:border-blue-500 focus:outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-500'}`}
                        placeholder="E.g., CSE101"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Day</label>
                        <select
                          name="day_of_week"
                          value={formData.day_of_week}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-xl border focus:border-blue-500 focus:outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        >
                          <option value={1}>MONDAY</option>
                          <option value={2}>TUESDAY</option>
                          <option value={3}>WEDNESDAY</option>
                          <option value={4}>THURSDAY</option>
                          <option value={5}>FRIDAY</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Start Time</label>
                        <select
                          name="start_time"
                          value={formData.start_time}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-xl border focus:border-blue-500 focus:outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold mb-2">End Time</label>
                        <select
                          name="end_time"
                          value={formData.end_time}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-xl border focus:border-blue-500 focus:outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Color</label>
                        <input
                          type="color"
                          name="color_code"
                          value={formData.color_code}
                          onChange={handleChange}
                          className="w-full h-12 p-1 rounded-xl border-2 border-slate-300 dark:border-slate-600 shadow-sm cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Location</label>
                      <input
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-xl border focus:border-blue-500 focus:outline-none transition-all shadow-sm ${isDarkMode ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-500'}`}
                        placeholder="E.g., A-101"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handleClose}
                        className={`flex-1 px-6 py-3 rounded-xl font-semibold border-2 transition-all ${isDarkMode ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-700 bg-slate-700/30 text-slate-200' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-100 bg-transparent text-slate-700'}`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                      >
                        {editingCourse ? 'Save' : 'Add'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
        </div>
    );
};

export default WeeklySchedule;