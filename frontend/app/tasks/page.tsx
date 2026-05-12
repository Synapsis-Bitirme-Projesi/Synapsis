"use client";

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Trash2,
  Circle,
  PlusCircle,
  Loader2,
} from "lucide-react";

interface Task {
  _id?: string;
  id?: string;
  title: string;
  course: string;
  priority: string;
  description?: string;
  due_date?: string;
}

const API_URL = "http://localhost:5000/api/auth/tasks";

export default function TasksPage() {
  const [taskName, setTaskName] = useState("");
  const [course, setCourse] = useState("Select Course");
  const [priority, setPriority] = useState("Priority");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TOKEN
  const getToken = (): string | null => localStorage.getItem("token");

  // FETCH TASKS
  const fetchTasks = useCallback(async () => {
    try {
      const token = getToken();

      if (!token) {
        setTasks([]);
        return;
      }

      const res = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTasks(Array.isArray(res.data) ? (res.data as Task[]) : []);
    } catch (err) {
      console.error("Yükleme hatası:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ADD TASK
  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    // 1. Sayfanın yenilenmesini durdur (Kritik!)
    if (e) e.preventDefault();

    // 2. Boş değer kontrolü
    if (!taskName.trim()) {
      alert("Görev adını girmedin!");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      // 3. API'ye gönderim
      const res = await axios.post(API_URL, {
        title: taskName,
        description: description || '',
        course: course !== 'Select Course' ? course : 'Genel',
        priority: priority !== 'Priority' ? priority : 'Medium',
        ...(dueDate && { due_date: dueDate }),
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 4. State güncelleme (Listeye ekle)
      setTasks((prev) => [res.data, ...prev]);

      // 5. Formu temizle
      setTaskName('');
      setCourse('Select Course');
      setPriority('Priority');
      setDescription('');
      setDueDate('');

    } catch (err) {
      console.error("Ekleme başarısız:", (err as any).response?.data || (err as Error).message);
      alert("Görev eklenirken bir sorun oluştu. Backend terminalini kontrol et!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE TASK
  const handleDeleteTask = async (id: string) => {
    if (!id) return;

    const confirmed = window.confirm(
      "Silmek istediğine emin misin?"
    );

    if (!confirmed) return;

    try {
      const token = getToken();

      await axios.delete(`${API_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTasks((prev) =>
        prev.filter((item) => (item._id || item.id) !== id)
      );
    } catch (err) {
      console.error("Silme hatası:", err);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6 md:p-12 text-slate-900 dark:text-white">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* FORM */}
        <form
          onSubmit={handleAddTask}
          className="bg-white dark:bg-[#111113] p-8 rounded-[35px] border border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          <h2 className="text-2xl font-black text-center mb-8 uppercase tracking-tight">
            Add New Task
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

            {/* TASK INPUT */}
            <input
              type="text"
              placeholder="Task name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* COURSE */}
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none"
            >
              <option value="Select Course">
                Select Course
              </option>
              <option value="Math 101">Math 101</option>
              <option value="Physics">Physics</option>
              <option value="Software Eng.">
                Software Eng.
              </option>
            </select>

            {/* PRIORITY */}
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

            {/* DUE DATE */}
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* DESCRIPTION */}
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 resize-vertical col-span-full"
          />

          {/* BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={22} />
            ) : (
              <PlusCircle size={22} />
            )}

            {isSubmitting ? "Adding..." : "Add Task"}
          </button>
        </form>

        {/* TASK LIST */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold ml-4 tracking-wide">
            My Tasks
          </h3>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2
                className="animate-spin text-blue-600"
                size={40}
              />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 bg-white/40 dark:bg-white/5 border border-dashed border-slate-300 dark:border-slate-800 rounded-[30px]">
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Henüz bir görev eklenmemiş.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">

              {tasks.map((item) => {
                const taskId: string = item._id || item.id || '';

                return (
                  <div
                    key={taskId}
                    className="flex items-center justify-between p-6 bg-white dark:bg-[#111113] border border-slate-100 dark:border-slate-800 rounded-3xl group hover:shadow-xl hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <Circle
                        className="text-slate-300 dark:text-slate-600"
                        size={24}
                      />

                      <div className="space-y-1">
                        <p className="font-bold">
                          {item.title || "Untitled Task"}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                          {item.description || "No description"}
                        </p>

                        <div className="flex gap-2">

                          <span className="text-[10px] px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-black uppercase tracking-wider">
                            {item.course || "General"}
                          </span>

                          <span
                            className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ${item.priority === "High"
                              ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                              }`}
                          >
                            {item.priority || "Medium"}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-lg font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                            {item.due_date ? new Date(item.due_date).toLocaleDateString('tr-TR') : 'No date'}
                          </span>

                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(taskId)}
                      className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                );
              })}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
