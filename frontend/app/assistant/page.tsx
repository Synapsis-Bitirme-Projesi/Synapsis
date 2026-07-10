"use client";

import AssistantPanel from "../components/AssistantPanel";
import { Sparkles } from "lucide-react";

export default function AssistantPage() {
  return (
    <div className="min-h-screen p-8 md:p-12 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Study Buddy
          </h1>
        </div>
        <p className="mt-3 text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
          Upload study files, import notes, and ask source-grounded questions with citations like a NotebookLM-style workspace.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-[0.22em]">
          <Sparkles size={14} />
          Local-first notebook workspace
        </div>
      </div>

      <AssistantPanel />
    </div>
  );
}
