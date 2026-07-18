"use client";

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Trash2,
  Circle,
  CheckCircle2,
  PlusCircle,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../lib/api";

interface Course {
  id: number;
  course_name: string;
}

interface Task {
  _id?: string;
  id?: string;
  title: string;
  course_id?: number;
  priority: string;
  description?: string;
  due_date?: string;
  status?: string;
  type?: string;
}

const TASK_API_URL = `${API_BASE_URL}/api/auth/tasks`;
const EXAM_API_URL = `${API_BASE_URL}/api/exams`;
const COURSES_API_URL = `${API_BASE_URL}/api/courses`;

const TYPE_OPTIONS = ["Task", "Exam", "Assignment", "Quiz", "Project", "Other"];

function typeBadgeClass(type?: string) {
  switch (type) {
    case "Exam": return "bg-rose-50 dark:bg-rose-900/30 text-rose-600";
    case "Assignment": return "bg-blue-50 dark:bg-blue-900/30 text-blue-600";
    case "Quiz": return "bg-purple-50 dark:bg-purple-900/30 text-purple-600";
    case "Project": return "bg-orange-50 dark:bg-orange-900/30 text-orange-600";
    case "Other": return "bg-slate-100 dark:bg-slate-800 text-slate-500";
    default: return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600";
  }
}

export default function TasksPage() {
  const [taskName, setTaskName] = useState("");
  const [type, setType] = useState("Task");
  const [course, setCourse] = useState("");
  const [priority, setPriority] = useState("Priority");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [examTime, setExamTime] = useState("09:00");
  const [examLocation, setExamLocation] = useState("");
  const [examColor, setExamColor] = useState("#EF4444");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [editType, setEditType] = useState("Task");
  const [editCourse, setEditCourse] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const getToken = (): string | null => localStorage.getItem("token");

  const fetchTasks = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) { setTasks([]); return; }
      const res = await axios.get(TASK_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(Array.isArray(res.data) ? (res.data as Task[]) : []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const token = getToken();
    if (!token) return;
    axios.get(COURSES_API_URL, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCourses(Array.isArray(res.data) ? res.data : []))
      .catch(() => { });
  }, [fetchTasks]);

  const resetForm = () => {
    setTaskName("");
    setType("Task");
    setCourse("");
    setPriority("Priority");
    setDescription("");
    setDueDate("");
    setExamTime("09:00");
    setExamLocation("");
    setExamColor("#EF4444");
  };

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!taskName.trim()) { alert("Please enter a name!"); return; }
    if (type === "Exam" && !dueDate) { alert("Please enter the exam date!"); return; }

    setIsSubmitting(true);
    try {
      const token = getToken();

      if (type === "Exam") {
        await axios.post(EXAM_API_URL, {
          course_name: taskName,
          exam_date: dueDate,
          exam_time: examTime,
          location: examLocation,
          description: description || "",
          color_code: examColor,
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        const res = await axios.post(TASK_API_URL, {
          title: taskName,
          description: description || "",
          course: course || null,
          priority: priority !== "Priority" ? priority : "Medium",
          type,
          ...(dueDate && { due_date: dueDate }),
        }, { headers: { Authorization: `Bearer ${token}` } });
        setTasks((prev) => [res.data, ...prev]);
      }

      resetForm();
    } catch (err) {
      console.error("Failed to add:", (err as any).response?.data || (err as Error).message);
      alert("Failed to add. Check the backend terminal!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    try {
      const token = getToken();
      await axios.patch(`${TASK_API_URL}/${id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks((prev) =>
        prev.map((t) => (t._id || t.id) === id ? { ...t, status: newStatus } : t)
      );
    } catch (err) {
      console.error("Toggle complete error:", err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const token = getToken();
      await axios.delete(`${TASK_API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks((prev) => prev.filter((item) => (item._id || item.id) !== id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskName(task.title);
    setEditType(task.type && task.type !== "Exam" ? task.type : "Task");
    setEditCourse(task.course_id ? String(task.course_id) : "");
    setEditPriority(task.priority?.toLowerCase() || "medium");
    setEditDueDate(task.due_date ? task.due_date.slice(0, 10) : "");
    setEditDescription(task.description || "");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTaskName.trim()) return;
    setIsEditSubmitting(true);
    try {
      const token = getToken();
      const taskId = editingTask._id || editingTask.id;
      const res = await axios.patch(`${TASK_API_URL}/${taskId}`, {
        title: editTaskName,
        type: editType,
        course: editCourse || null,
        priority: editPriority,
        due_date: editDueDate || null,
        description: editDescription || null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(prev => prev.map(t => (t._id || t.id) === taskId ? res.data : t));
      setEditingTask(null);
    } catch (err) {
      console.error("Edit failed:", err);
      alert("Failed to update task.");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const isExam = type === "Exam";

  return (
    <div className="min-h-screen bg-transparent p-6 md:p-12 text-slate-900 dark:text-white">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* PAGE HEADER */}
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Tasks</h1>

        {/* FORM */}
        <form
          onSubmit={handleAddTask}
          className="bg-white dark:bg-[#111113] p-8 rounded-[35px] border border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          <h2 className="text-2xl font-black text-center mb-8 uppercase tracking-tight">
            Add New Item
          </h2>

          {/* Row 1: Name + Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input
              type="text"
              placeholder={isExam ? "Course name" : "Task name"}
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Row 2: Conditional fields */}
          {isExam ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-5">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="time"
                value={examTime}
                onChange={(e) => setExamTime(e.target.value)}
                className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Location (e.g. A-101)"
                value={examLocation}
                onChange={(e) => setExamLocation(e.target.value)}
                className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="color"
                value={examColor}
                onChange={(e) => setExamColor(e.target.value)}
                className="p-4 h-[58px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none"
              >
                <option value="">Select Course</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.course_name}</option>
                ))}
              </select>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none"
              >
                <option value="Priority">Priority</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-5 w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={22} />
            ) : (
              <PlusCircle size={22} />
            )}
            {isSubmitting ? "Adding..." : `Add ${type}`}
          </button>
        </form>

        {/* TASK LIST */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold ml-4 tracking-wide">My Tasks</h3>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 bg-white/40 dark:bg-white/5 border border-dashed border-slate-300 dark:border-slate-800 rounded-[30px]">
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                No tasks added yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tasks.map((item) => {
                const taskId: string = item._id || item.id || "";
                const courseName = courses.find(c => c.id === item.course_id)?.course_name;
                const today = new Date().toISOString().slice(0, 10);
                const isOverdue = item.due_date && item.due_date.slice(0, 10) < today && item.status !== "done";
                const isHigh = item.priority?.toLowerCase() === "high";
                return (
                  <div
                    key={taskId}
                    className={`flex items-center justify-between p-6 bg-white dark:bg-[#111113] border rounded-3xl group hover:shadow-xl transition-all ${item.status === "done"
                        ? "border-green-100 dark:border-green-900/30 opacity-60"
                        : "border-slate-100 dark:border-slate-800 hover:border-blue-500/30"
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleComplete(taskId, item.status || "todo")}
                        className="shrink-0 transition-transform hover:scale-110"
                        title={item.status === "done" ? "Completed — click to undo" : "Mark as complete"}
                      >
                        {item.status === "done" ? (
                          <CheckCircle2 className="text-green-500" size={24} />
                        ) : (
                          <Circle className="text-slate-300 dark:text-slate-600" size={24} />
                        )}
                      </button>

                      <div className="space-y-1">
                        <p className={`font-bold ${item.status === "done" ? "line-through text-slate-400" : ""}`}>
                          {item.title || "Untitled Task"}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                          {item.description || "No description"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {item.type && (
                            <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ${typeBadgeClass(item.type)}`}>
                              {item.type}
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                              Overdue
                            </span>
                          )}
                          {courseName && (
                            <span className="text-[10px] px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-black uppercase tracking-wider">
                              {courseName}
                            </span>
                          )}
                          <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ${isHigh
                              ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}>
                            {item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : "Medium"}
                          </span>
                          {item.due_date && (
                            <span className={`text-xs px-2 py-1 rounded-lg font-black uppercase tracking-wider ${isOverdue
                                ? "bg-red-50 dark:bg-red-900/20 text-red-500"
                                : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                              }`}>
                              {new Date(item.due_date.slice(0, 10) + "T00:00:00").toLocaleDateString("en-US")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 text-slate-300 dark:text-slate-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                        title="Edit task"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(taskId)}
                        className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                        title="Delete task"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Edit Task</h2>
              <button onClick={() => setEditingTask(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Name</label>
                  <input
                    value={editTaskName}
                    onChange={e => setEditTaskName(e.target.value)}
                    required
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
                  <select
                    value={editType}
                    onChange={e => setEditType(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                  >
                    {TYPE_OPTIONS.filter(t => t !== "Exam").map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Course</label>
                  <select
                    value={editCourse}
                    onChange={e => setEditCourse(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                  >
                    <option value="">No Course</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.course_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-vertical text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="flex-1 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isEditSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
