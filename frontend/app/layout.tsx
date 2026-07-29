"use client";
import { useSession, signOut } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  LogOut,
  BookOpen,
  Calendar as CalendarIcon,
  FileText,
  GraduationCap,
  Sparkles,
  Users,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import AuthProvider from "./components/SessionProvider";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs synchronously before first paint: applies dark class from localStorage */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(localStorage.getItem('synapsis-theme')==='dark')document.documentElement.classList.add('dark');}catch(e){}})();` }} />
      </head>
      <body className="antialiased bg-slate-50 dark:bg-[#0a0a0c] font-sans transition-colors duration-300">
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
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isAuthPage = pathname === "/" || pathname === "/login" || pathname === "/register";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Sync the NextAuth JWT to localStorage so legacy pages can read it
  useEffect(() => {
    if (status === "authenticated" && (session as any)?.accessToken) {
      localStorage.setItem('token', (session as any).accessToken);
    }
  }, [status, session]);

  // Redirect to login when session is definitively gone on a protected page
  useEffect(() => {
    if (status === "unauthenticated" && !isAuthPage) {
      router.push("/login");
    }
  }, [status, isAuthPage, router]);

  const Spinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0c]">
      <div className="relative flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <span className="absolute text-[10px] font-black text-blue-600 italic">S</span>
      </div>
    </div>
  );

  if (status === "loading" && !session) {
    return <Spinner />;
  }

  if (status === "unauthenticated" && !isAuthPage) {
    return <Spinner />;
  }

  const showSidebar = status === "authenticated" && !isAuthPage;

  return (
    <div className="min-h-screen flex w-full overflow-hidden bg-slate-50 dark:bg-[#0a0a0c]">
      {showSidebar && (
        <>
          {/* Mobil açma düğmesi */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden fixed top-4 left-4 z-50 flex items-center justify-center h-11 w-11 rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/10 transition-all hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-[#0d0d0f] dark:text-slate-200"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <aside className={`
            fixed inset-y-0 left-0 z-50 max-w-full transform bg-white shadow-2xl border-r border-slate-200 dark:border-slate-800 dark:bg-[#0d0d0f]
            transition-all duration-300 ease-out flex flex-col
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:static md:translate-x-0 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'} md:h-screen md:sticky
            overflow-hidden md:overflow-visible
          `}>

            {/* Masaüstü Genişlet/Daralt Butonu (Dışarıya Sabitlendi) */}
            <button
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="hidden md:flex absolute -right-4 top-8 z-50 h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-[#111113] dark:text-slate-200"
              aria-label="Toggle sidebar"
            >
              {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            <div className={`flex items-center gap-2 p-5 border-b border-slate-100 dark:border-slate-800 md:py-6 bg-white dark:bg-[#0d0d0f] ${isSidebarCollapsed ? 'justify-center md:px-0' : 'justify-between md:px-8'}`}>
              <Link href="/dashboard" className="flex items-center gap-3 group overflow-hidden">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:rotate-12 transition-all duration-300 shrink-0">
                  <GraduationCap size={24} />
                </div>
                <h1 className={`text-xl font-black text-slate-800 dark:text-white tracking-tighter italic transition-all ${isSidebarCollapsed ? 'md:hidden opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                  Synapsis
                </h1>
              </Link>

              {/* Sadece Mobil Kapatma Butonu */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shrink-0"
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>

            <nav className={`flex-1 overflow-y-auto px-4 py-5 space-y-1.5 ${isSidebarCollapsed ? 'px-2' : 'px-4'} scroll-smooth`}>
              <SidebarLink
                href="/dashboard"
                icon={<LayoutDashboard size={20} />}
                label="Dashboard"
                active={pathname === "/dashboard"}
                collapsed={isSidebarCollapsed}
              />
              <SidebarLink
                href="/tasks"
                icon={<CheckSquare size={20} />}
                label="Tasks"
                active={pathname === "/tasks"}
                collapsed={isSidebarCollapsed}
              />
              <SidebarLink
                href="/courses"
                icon={<BookOpen size={20} />}
                label="Courses"
                active={pathname === "/courses"}
                collapsed={isSidebarCollapsed}
              />
              <SidebarLink
                href="/exams"
                icon={<CalendarIcon size={20} />}
                label="Calendar"
                active={pathname === "/exams"}
                collapsed={isSidebarCollapsed}
              />
              <SidebarLink
                href="/notes"
                icon={<FileText size={20} />}
                label="Notes"
                active={pathname === "/notes"}
                collapsed={isSidebarCollapsed}
              />
              <SidebarLink
                href="/assistant"
                icon={<Sparkles size={20} />}
                label="Study Buddy"
                active={pathname === "/assistant"}
                collapsed={isSidebarCollapsed}
              />
              <SidebarLink
                href="/community"
                icon={<Users size={20} />}
                label="Community"
                active={pathname === "/community"}
                collapsed={isSidebarCollapsed}
              />
              <SidebarLink
                href="/messages"
                icon={<Users size={20} />}
                label="Messages"
                active={pathname === "/messages"}
                collapsed={isSidebarCollapsed}
              />
            </nav>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-[#0d0d0f]/80">
              <Link href="/profile" className={`flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all group ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-black shadow-md shrink-0 group-hover:scale-105 transition-transform">
                  {session?.user?.name?.[0]?.toUpperCase() || "T"}
                </div>
                <div className={`flex flex-col overflow-hidden transition-all ${isSidebarCollapsed ? 'hidden opacity-0' : 'opacity-100'}`}>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-[10px] font-bold text-blue-500 tracking-tighter">Profile Settings</p>
                </div>
              </Link>

              <button
                onClick={() => setShowLogoutModal(true)}
                className={`w-full flex items-center gap-2 p-3 mt-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold transition-all group ${isSidebarCollapsed ? 'justify-center' : 'justify-center'}`}
              >
                <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className={`text-sm ${isSidebarCollapsed ? 'hidden' : 'block'}`}>Sign Out</span>
              </button>
            </div>
          </aside>

          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              aria-label="Close backdrop"
            />
          )}
        </>
      )}

      {/* Ana İçerik Alanı */}
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-[#0a0a0c] relative transition-colors duration-300">
        {children}
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                <LogOut size={24} className="text-red-500 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Sign Out</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Are you sure you want to sign out?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutModal(false); signOut({ redirect: false }).then(() => router.push("/login")); }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarLink({ href, icon, label, active, collapsed }: { href: string, icon: any, label: string, active: boolean, collapsed: boolean }) {
  return (
    <Link href={href} className="block group">
      <div className={`
        flex items-center gap-3 ${collapsed ? 'justify-center' : ''} px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold
        ${active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 translate-x-2'
          : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800'}
      `}>
        <span className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>
          {icon}
        </span>
        <span className={`text-[14px] tracking-tight ${collapsed ? 'sr-only' : ''}`}>{label}</span>
        {active && !collapsed && (
          <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
        )}
      </div>
    </Link>
  );
}