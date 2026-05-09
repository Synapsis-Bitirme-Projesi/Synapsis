"use client";
import { useSession, signOut } from "next-auth/react";
import { ReactNode } from "react";
import Link from "next/link";
import { LayoutDashboard, CheckSquare, LogOut } from "lucide-react";
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

  // 1. ADIM: Yükleme kontrolünü sadece status "loading" ise ve session YOKSA yap
  if (status === "loading" && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  // Sidebar sadece giriş yapıldıysa görünsün
  const showSidebar = !!session;

  return (
    <div className="min-h-screen flex overflow-hidden w-full">
      {showSidebar && (
        <aside className="w-64 bg-white shadow-xl border-r border-gray-100 flex flex-col sticky top-0 h-screen z-50 shrink-0">
          <div className="p-8">
            <h1 className="text-3xl font-black text-blue-600 tracking-tighter italic">Synapsis</h1>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <Link href="/" className="flex items-center gap-3 p-3 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 font-bold transition-all">
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            <Link href="/tasks" className="flex items-center gap-3 p-3 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 font-bold transition-all">
              <CheckSquare size={20} />
              <span>Tasks</span>
            </Link>
          </nav>

          <div className="p-4 border-t border-gray-100 space-y-3">
            <Link href="/profile" className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black shadow-lg shrink-0">
                {session?.user?.name?.[0]?.toUpperCase() || "S"}
              </div>
              <div className="flex flex-col overflow-hidden">
                <p className="text-xs font-black text-slate-800 truncate">
                  {session?.user?.name || "Kullanıcı"}
                </p>
                <p className="text-[10px] font-bold text-blue-500">Profilimi Görüntüle</p>
              </div>
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-red-500 hover:bg-red-50 font-bold transition-all"
            >
              <LogOut size={18} />
              <span className="text-sm">Çıkış Yap</span>
            </button>
          </div>
        </aside>
      )}

      {/* 2. ADIM: Main alanını 'overflow-y-auto' ve 'w-full' yaparak içeriği serbest bırak */}
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50 relative">
        {children}
      </main>
    </div>
  );
}