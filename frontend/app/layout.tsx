"use client";
import { useSession, signOut } from "next-auth/react";
import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  LogOut,
  BookOpen,
  Calendar as CalendarIcon,
  Settings,
  GraduationCap
} from "lucide-react";
import AuthProvider from "./components/SessionProvider";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 font-sans transition-colors duration-300">
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}

function LayoutContent({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Yükleme ekranı - Daha şık bir spinner
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0c]">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <span className="absolute text-[10px] font-black text-blue-600 italic">S</span>
        </div>
      </div>
    );
  }

  // Sidebar sadece giriş yapılmışsa ve auth sayfalarında değilsek görünsün
  // "authenticated" kontrolü barın durduk yere kaybolmasını engeller
  const showSidebar = status === "authenticated" && pathname !== "/login" && pathname !== "/register";

  return (
    <div className="min-h-screen flex w-full overflow-hidden bg-slate-50 dark:bg-[#0a0a0c]">
      {showSidebar && (
        <aside className="w-72 bg-white dark:bg-[#0d0d0f] border-r border-slate-100 dark:border-slate-800 flex flex-col sticky top-0 h-screen z-50 shrink-0 transition-all duration-300">

          {/* Logo Alanı - Yeni Tasarım */}
          <div className="p-8 mb-4">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:rotate-12 transition-all duration-300">
                <GraduationCap size={24} />
              </div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter italic transition-colors">
                Synapsis
              </h1>
            </Link>
          </div>

          {/* Menü Navigasyonu */}
          <nav className="flex-1 px-4 space-y-1.5">
            <SidebarLink
              href="/dashboard"
              icon={<LayoutDashboard size={20} />}
              label="Dashboard"
              active={pathname === "/dashboard"}
            />
            <SidebarLink
              href="/tasks"
              icon={<CheckSquare size={20} />}
              label="Tasks"
              active={pathname === "/tasks"}
            />
            <SidebarLink
              href="/courses"
              icon={<BookOpen size={20} />}
              label="Derslerim"
              active={pathname === "/dashboard/courses"}
            />
            <SidebarLink
              href="/exams"
              icon={<CalendarIcon size={20} />}
              label="Sınav Takvimi"
              active={pathname === "/exams"}
            />
          </nav>

          {/* Alt Bölüm: Profil ve Çıkış */}
          <div className="p-4 border-t border-slate-50 dark:border-slate-800 space-y-3 bg-white/50 dark:bg-transparent">
            <Link href="/profile" className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all group">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-black shadow-md shrink-0 group-hover:scale-105 transition-transform">
                {session?.user?.name?.[0]?.toUpperCase() || "T"}
              </div>
              <div className="flex flex-col overflow-hidden">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                  {session?.user?.name || "Tolga"}
                </p>
                <p className="text-[10px] font-bold text-blue-500 tracking-tighter">Profil Ayarları</p>
              </div>
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold transition-all group"
            >
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm">Güvenli Çıkış</span>
            </button>
          </div>
        </aside>
      )}

      {/* Ana İçerik Alanı */}
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-[#0a0a0c] relative transition-colors duration-300">
        {children}
      </main>
    </div>
  );
}

// Sidebar Linkleri için geliştirilmiş bileşen
function SidebarLink({ href, icon, label, active }: { href: string, icon: any, label: string, active: boolean }) {
  return (
    <Link href={href} className="block group">
      <div className={`
        flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold
        ${active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 translate-x-2'
          : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800'}
      `}>
        <span className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>
          {icon}
        </span>
        <span className="text-[14px] tracking-tight">{label}</span>
        {active && (
          <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
        )}
      </div>
    </Link>
  );
}