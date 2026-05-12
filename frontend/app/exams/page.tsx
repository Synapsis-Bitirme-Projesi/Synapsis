"use client";

import AcademicCalendar from "../components/AcademicCalendar";

export default function ExamsPage() {
  return (
    <div className="container mx-auto p-8 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Sınav Takvimi</h1>
      <AcademicCalendar isDarkMode={false} />
    </div>
  );
}