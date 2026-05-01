import type { Metadata } from "next"
import "./globals.css"
import { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Synapsis - Academic Dashboard",
  description: "Manage courses, tasks, notes, and schedule.",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 font-sans">
        <div className="min-h-screen flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white shadow-lg border-r border-gray-200">
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-8">Synapsis</h1>
              <nav className="space-y-2">
                <a href="/" className="flex items-center p-3 rounded-lg text-gray-700 hover:bg-gray-100">
                  <span>Dashboard</span>
                </a>
                <a href="/tasks" className="flex items-center p-3 rounded-lg text-gray-700 hover:bg-gray-100">
                  <span>Tasks</span>
                </a>
                <a href="/notes" className="flex items-center p-3 rounded-lg text-gray-700 hover:bg-gray-100">
                  <span>Notes</span>
                </a>
                <a href="/calendar" className="flex items-center p-3 rounded-lg text-gray-700 hover:bg-gray-100">
                  <span>Calendar</span>
                </a>
              </nav>
            </div>
          </aside>
          {/* Main */}
          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}