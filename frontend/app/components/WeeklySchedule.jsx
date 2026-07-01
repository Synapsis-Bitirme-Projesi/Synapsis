"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus } from 'lucide-react';

const WeeklySchedule = ({ isDarkMode }) => {
    const [courses, setCourses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    const formatTime = (time) => time?.slice(0, 5) || '';

    const getCourseSpanHeight = (slotTime, slotCourses) => {
      const startIdx = timeSlots.indexOf(slotTime);
      const furthestEndIdx = slotCourses.reduce((maxIdx, course) => {
        const endIdx = timeSlots.indexOf(formatTime(course.end_time));
        return endIdx > maxIdx ? endIdx : maxIdx;
      }, startIdx + 1);

      const span = furthestEndIdx > startIdx ? furthestEndIdx - startIdx : 1;
      return Math.max(span * 80 - 8, slotCourses.length * 56);
    };

    const buildScheduleGrid = (courseList) => {
      return courseList.reduce((grid, course) => {
        const dayKey = course.day_of_week;
        const timeKey = formatTime(course.start_time);

        if (!grid[dayKey]) {
          grid[dayKey] = {};
        }

        if (!grid[dayKey][timeKey]) {
          grid[dayKey][timeKey] = [];
        }

        grid[dayKey][timeKey].push(course);
        return grid;
      }, {});
    };

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

    const handleClose = () => {
      setIsModalOpen(false);
      setError('');
    };

    const handleChange = (e) => {
      setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const token = localStorage.getItem('token');
        await axios.post('http://localhost:5000/api/courses', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsModalOpen(false);
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
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <Plus size={18} />
                        <span>New Course</span>
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
                                        const startingCourses = scheduleGrid[dayIdx + 1]?.[time] || [];

                                        let blockHeight = null;
                                            if (startingCourses.length > 0) {
                                                blockHeight = getCourseSpanHeight(time, startingCourses);
                                        }

                                        return (
                                            <div key={dayIdx} className={`border-l transition-colors ${isDarkMode ? 'border-slate-800' : 'border-slate-100'
                                                    } p-1 relative hover:bg-blue-500/5 transition-colors`} style={{ overflow: startingCourses.length > 0 ? 'visible' : undefined }}>
                                                    {startingCourses.length > 0 && (
                                                    <div
                                                            className="absolute inset-x-1 top-1 rounded-lg p-2 shadow-md border-l-4 transition-all hover:scale-[1.02] cursor-pointer flex flex-col gap-2"
                                                        style={{
                                                                backgroundColor: isDarkMode ? `${startingCourses[0].color_code}35` : `${startingCourses[0].color_code}15`,
                                                                borderColor: startingCourses[0].color_code,
                                                                color: isDarkMode ? '#f1f5f9' : startingCourses[0].color_code,
                                                            height: `${blockHeight}px`,
                                                            zIndex: 10
                                                        }}
                                                    >
                                                            {startingCourses.length > 1 && (
                                                              <div className="self-start rounded-full bg-slate-950/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                                                                {startingCourses.length} overlapping
                                                              </div>
                                                            )}

                                                            <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
                                                              {startingCourses.map((course, courseIdx) => (
                                                                <div
                                                                  key={`${course.id || course.course_code}-${course.start_time}-${courseIdx}`}
                                                                  className="flex-1 min-h-0 rounded-md px-2 py-1.5 border overflow-hidden"
                                                                  style={{
                                                                    backgroundColor: isDarkMode ? `${course.color_code}1f` : `${course.color_code}12`,
                                                                    borderColor: `${course.color_code}55`,
                                                                    color: isDarkMode ? '#f8fafc' : course.color_code,
                                                                  }}
                                                                >
                                                                  <div className="font-bold text-[11px] leading-tight mb-1 truncate uppercase">
                                                                    {course.course_name}
                                                                  </div>
                                                                  <div className="flex items-center gap-1 opacity-90 text-[9px] font-semibold flex-wrap">
                                                                    <span>{course.course_code}</span>
                                                                    <span className="opacity-50">•</span>
                                                                    <span>{formatTime(course.start_time)}-{formatTime(course.end_time)}</span>
                                                                    {course.location && (
                                                                      <>
                                                                        <span className="opacity-50">•</span>
                                                                        <span>{course.location}</span>
                                                                      </>
                                                                    )}
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
            </div>

            {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 shadow-black/10'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">Add New Course</h3>
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
                        Add
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