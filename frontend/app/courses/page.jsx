"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus } from 'lucide-react';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    course_name: '',
    course_code: '',
    day_of_week: 1,
    start_time: '08:00',
    end_time: '09:00',
    location: '',
    color_code: '#3B82F6'
  });
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  useEffect(() => {
    const token = localStorage.getItem('token');

    const fetchCourses = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/courses', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCourses(response.data);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to fetch courses. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleClose = () => setIsModalOpen(false);

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

  const dayNames = {
    1: 'PAZARTESİ',
    2: 'SALI',
    3: 'ÇARŞAMBA',
    4: 'PERŞEMBE',
    5: 'CUMA'
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Courses</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-xl active:scale-95 transition-all"
        >
          <Plus size={18} />
          <span>Yeni Ders</span>
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
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4"
                  style={{ backgroundColor: course.color_code || '#3B82F6' }}
                >
                  {course.course_code?.slice(0, 3).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{course.course_name}</h2>
                  <p className="text-slate-600 dark:text-slate-400">{course.course_code}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <p><span className="font-medium text-slate-800 dark:text-slate-200">Day:</span> {dayNames[course.day_of_week] || course.day_of_week}</p>
                <p><span className="font-medium">Time:</span> {course.start_time} - {course.end_time}</p>
                <p><span className="font-medium">Location:</span> {course.location}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoursesPage;