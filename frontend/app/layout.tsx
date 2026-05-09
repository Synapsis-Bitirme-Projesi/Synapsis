"use client";
import { useSession, signOut } from "next-auth/react";
import { ReactNode } from "react";
import Link from "next/link";
import { LayoutDashboard, CheckSquare, LogOut, User, Settings } from "lucide-react";
import AuthProvider from "./components/SessionProvider";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 font-sans">
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}

function LayoutContent({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  // SADECE giriş yapıldıysa Sidebar'ı göster
  const showSidebar = status === "authenticated";

  return (
    <div className="min-h-screen flex">
      {showSidebar && (
        <aside className="w-64 bg-white shadow-xl border-r border-gray-100 flex flex-col sticky top-0 h-screen transition-all">
          <div className="p-8">
            <h1 className="text-3xl font-black text-blue-600 tracking-tighter">Synapsis</h1>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <Link href="/" className="flex items-center gap-3 p-3 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 font-bold transition-all group">
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            <Link href="/tasks" className="flex items-center gap-3 p-3 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 font-bold transition-all group">
              <CheckSquare size={20} />
              <span>Tasks</span>
            </Link>
          </nav>

          {/* User Profile & Logout - Alt Bölüm (Tekil ve Düzgün) */}
          <div className="p-4 border-t border-gray-100 space-y-3">
            <Link href="/profile" className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all group">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black shadow-lg">
                {session?.user?.name?.[0].toUpperCase() || "T"}
              </div>
              <div className="flex flex-col overflow-hidden">
                <p className="text-xs font-black text-slate-800 truncate">{session?.user?.name || "Kullanıcı"}</p>
                <p className="text-[10px] font-bold text-blue-500">Profilimi Görüntüle</p>
              </div>
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-red-500 hover:bg-red-50 font-bold transition-all"
            >
              <LogOut size={18} />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </aside>
      )}

      {/* Ana içerik alanı */}
      <main className={`flex-1 ${showSidebar ? "bg-slate-50" : "bg-gradient-to-br from-slate-50 to-blue-50"}`}>
        {children}
      </main>
    </div>
  );
}