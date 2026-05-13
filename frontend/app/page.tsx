"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, BookOpen, Calendar, CheckSquare, FileText } from "lucide-react";

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0c]">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <span className="absolute text-[10px] font-black text-blue-600 italic">S</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-[#0d0d0f]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <GraduationCap size={20} />
          </div>
          <span className="text-xl font-black text-slate-800 dark:text-white tracking-tighter italic">Synapsis</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl mb-6 shadow-sm">
          <GraduationCap size={40} className="text-blue-600 dark:text-blue-400" />
        </div>

        <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-tight mb-6 text-slate-900 dark:text-white">
          Manage your academic<br />
          <span className="text-blue-600">life in one place.</span>
        </h2>

        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-xl mb-10">
          Track your courses, exams, tasks, and notes with Synapsis — all in one place.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 transition-all shadow-lg shadow-blue-500/30"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 bg-white dark:bg-[#111113] text-slate-800 dark:text-white font-black rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-0.5 active:scale-95 transition-all shadow-sm"
          >
            Sign In
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-2xl w-full">
          {[
            { icon: <BookOpen size={22} />, label: "Courses" },
            { icon: <Calendar size={22} />, label: "Calendar" },
            { icon: <CheckSquare size={22} />, label: "Tasks" },
            { icon: <FileText size={22} />, label: "Notes" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-[#111113] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"
            >
              <span className="text-blue-600 dark:text-blue-400">{icon}</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
