"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, Trash2, Pencil } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null); // course obj when editing, null when adding

  const emptyForm = {
    course_name: '',
    course_code: '',
    day_of_week: 1,
    start_time: '08:00',
    end_time: '09:00',
    location: '',
    color_code: '#3B82F6'
  };
  const [formData, setFormData] = useState(emptyForm);

  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  const dayNames = { 1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY', 4: 'THURSDAY', 5: 'FRIDAY' };

  const fetchCourses = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(response.data);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to fetch courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openAddModal = () => {
    setEditingCourse(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setFormData({
      course_name: course.course_name || '',
      course_code: course.course_code || '',
      day_of_week: course.day_of_week || 1,
      start_time: course.start_time || '08:00',
      end_time: course.end_time || '09:00',
      location: course.location || '',
      color_code: course.color_code || '#3B82F6',
    });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      if (editingCourse) {
        await axios.put(`${API_BASE_URL}/api/courses/${editingCourse.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/courses`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      handleClose();
      fetchCourses();
    } catch (err) {
      console.error('Error saving course:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting course:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading courses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Courses</h1>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-xl active:scale-95 transition-all"
        >
          <Plus size={18} />
          <span>New Course</span>
        </button>
      </div>

      {courses.length === 0 ? (
        <p className="text-gray-500">No courses found. Add some courses to get started!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-md p-6 hover:shadow-xl dark:hover:shadow-slate-900/50 transition-all text-slate-900 dark:text-slate-200">
              <div className="flex items-center mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4 shrink-0"
                  style={{ backgroundColor: course.color_code || '#3B82F6' }}
                >
                  {course.course_code?.slice(0, 3).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white truncate">{course.course_name}</h2>
                  <p className="text-slate-600 dark:text-slate-400">{course.course_code}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <p><span className="font-medium text-slate-800 dark:text-slate-200">Day:</span> {dayNames[course.day_of_week] || course.day_of_week}</p>
                <p><span className="font-medium">Time:</span> {course.start_time} - {course.end_time}</p>
                <p><span className="font-medium">Location:</span> {course.location}</p>
              </div>
              <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => openEditModal(course)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-all"
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(course.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h2>
              <button onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Course Name</label>
                <input
                  name="course_name"
                  value={formData.course_name}
                  onChange={handleChange}
                  required
                  placeholder="E.g., Software Engineering"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Course Code</label>
                <input
                  name="course_code"
                  value={formData.course_code}
                  onChange={handleChange}
                  placeholder="E.g., SE301"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Day</label>
                  <select
                    name="day_of_week"
                    value={formData.day_of_week}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  >
                    {Object.entries(dayNames).map(([val, name]) => (
                      <option key={val} value={val}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Color</label>
                  <input
                    type="color"
                    name="color_code"
                    value={formData.color_code}
                    onChange={handleChange}
                    className="w-full h-[46px] p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Start Time</label>
                  <select
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  >
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">End Time</label>
                  <select
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  >
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
                <input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="E.g., B-204"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
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

export default CoursesPage;
