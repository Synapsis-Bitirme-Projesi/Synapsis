"use client";

import { useState, useEffect } from "react";
import AcademicCalendar from "../components/AcademicCalendar";
import { X, Trash2 } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../lib/api";

interface Exam {
  id: number;
  course_name: string;
  exam_date: string;
  exam_time: string;
  location: string;
  description: string;
  color_code: string;
}

const emptyForm = {
  course_name: "",
  exam_date: "",
  exam_time: "09:00",
  location: "",
  description: "",
  color_code: "#EF4444",
};

export default function ExamsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get(`${API_BASE_URL}/api/auth/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTasks((res.data as any[]).filter((t: any) => t.due_date));
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
      }
    };
    fetchTasks();
  }, [refreshKey]);

  const handleExamClick = (exam: Exam) => {
    setSelectedExam(exam);
    setEditForm({
      course_name: exam.course_name || "",
      exam_date: exam.exam_date?.slice(0, 10) || "",
      exam_time: exam.exam_time || "09:00",
      location: exam.location || "",
      description: exam.description || "",
      color_code: exam.color_code || "#EF4444",
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_BASE_URL}/api/exams/${selectedExam.id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedExam(null);
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("Sınav güncellenemedi:", err);
    }
  };

  const handleDelete = async () => {
    if (!selectedExam) return;
    if (!window.confirm("Are you sure you want to delete this exam?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/exams/${selectedExam.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedExam(null);
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("Sınav silinemedi:", err);
    }
  };

  const examFormFields = (form: typeof emptyForm, handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) => (
    <>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Course Name</label>
        <input
          name="course_name"
          value={form.course_name}
          onChange={handleChange}
          required
          placeholder="E.g., Database Systems"
          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
          <input
            type="date"
            name="exam_date"
            value={form.exam_date}
            onChange={handleChange}
            required
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Time</label>
          <input
            type="time"
            name="exam_time"
            value={form.exam_time}
            onChange={handleChange}
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="E.g., A-101"
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Color</label>
          <input
            type="color"
            name="color_code"
            value={form.color_code}
            onChange={handleChange}
            className="w-full h-[46px] p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description (optional)</label>
        <input
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Topics covered, etc."
          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
        />
      </div>
    </>
  );

  return (
    <div className="container mx-auto p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Calendar</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Exams and tasks with due dates. Add exams from the Tasks page.</p>
      </div>

      <AcademicCalendar key={refreshKey} isDarkMode={false} onExamClick={handleExamClick as any} tasks={tasks} />

      {/* Edit / Delete Exam Modal */}
      {selectedExam && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Edit Exam</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 rounded-xl transition-colors"
                  title="Delete Exam"
                >
                  <Trash2 size={18} />
                </button>
                <button onClick={() => setSelectedExam(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {examFormFields(editForm, handleEditChange)}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedExam(null)}
                  className="flex-1 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
