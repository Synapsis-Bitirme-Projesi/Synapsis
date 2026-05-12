"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Settings,
  Clock,
  Database,
  Layout,
  MapPin,
  Bell
} from "lucide-react";

export default function Home() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 1. GİRİŞ KONTROLÜ
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // 2. VERİTABANINDAN GERÇEK AYARLARI ÇEK
  useEffect(() => {
    const fetchSettings = async () => {
      const token = (session as any)?.user?.accessToken || (session as any)?.accessToken;
      if (!token) {
        setActiveWidgets(['classes', 'exams', 'tasks']);
        setIsDataLoaded(true);
        return;
      }

      try {
        const response = await fetch("http://127.0.0.1:5000/api/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.user?.settings?.widgets) {
          setActiveWidgets(data.user.settings.widgets);
        } else {
          setActiveWidgets(['classes', 'exams', 'tasks']);
        }
        setIsDataLoaded(true);
      } catch (error) {
        console.error("Ayarlar çekilemedi:", error);
        setActiveWidgets(['classes', 'exams', 'tasks']);
        setIsDataLoaded(true);
      }
    };

    if (status === "authenticated") {
      fetchSettings();
    }
  }, [status, session]);

  if (status === "loading" || (!isDataLoaded && status === "authenticated")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 3. AYARLARI GÜNCELLEME
  const toggleWidget = async (widgetId: string) => {
    const newWidgets = activeWidgets.includes(widgetId)
      ? activeWidgets.filter(id => id !== widgetId)
      : [...activeWidgets, widgetId];

    setActiveWidgets(newWidgets);

    const token = (session as any)?.user?.accessToken || (session as any)?.accessToken;

    try {
      const response = await fetch("http://127.0.0.1:5000/api/auth/update-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          settings: { widgets: newWidgets }
        }),
      });

      if (response.ok) {
        await update();
        console.log("Azure ve Session senkronize edildi.");
      }
    } catch (error) {
      console.error("Kayıt hatası:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 selection:bg-blue-100">

      <div className="container mx-auto px-6 py-12">

        {/* Üst Karşılama Alanı */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight leading-none">
              Merhaba, <span className="text-blue-600">{session?.user?.name?.split(' ')[0] || "Öğrenci"}</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium flex items-center gap-2">
              <Calendar size={18} className="text-blue-500" />
              6 Mayıs 2026, Çarşamba • Bugün 2 dersin var.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="p-3 bg-white shadow-sm border border-slate-200 rounded-2xl text-slate-600">
              <Bell size={20} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Today's Classes */}
          {activeWidgets.includes('classes') && (
            <div className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
              <div className="flex items-center justify-between mb-8">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <BookOpen size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Ders Programı</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-6">Bugünkü Dersler</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-100 hover:bg-blue-50/50 transition-all">
                  <p className="font-bold text-slate-700">Software Architecture</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-blue-500 bg-white px-2 py-1 rounded-lg border border-blue-50">
                      <Clock size={12} /> 10:30
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-100">
                      <MapPin size={12} /> Oda 302
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-100 hover:bg-blue-50/50 transition-all">
                  <p className="font-bold text-slate-700">Database Systems</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-blue-500 bg-white px-2 py-1 rounded-lg border border-blue-50">
                      <Clock size={12} /> 14:00
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">
                      <Database size={12} /> Online
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Exams */}
          {activeWidgets.includes('exams') && (
            <div className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-500">
              <div className="flex items-center justify-between mb-8">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <Layout size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Son Tarihler</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-6">Yaklaşan Sınavlar</h3>
              <div className="flex items-center gap-4 p-5 bg-purple-50/50 rounded-3xl border border-purple-100/50">
                <div className="text-center bg-white min-w-[55px] py-2 rounded-2xl shadow-sm border border-purple-100">
                  <p className="text-[10px] font-black text-purple-600 leading-none">MAY</p>
                  <p className="text-xl font-black text-slate-800 leading-none mt-1">14</p>
                </div>
                <div>
                  <p className="font-bold text-slate-800">Final Project Due</p>
                  <p className="text-xs text-purple-500 font-bold tracking-tight">Synapsis Phase 2</p>
                </div>
              </div>
            </div>
          )}

          {/* Urgent Tasks */}
          {activeWidgets.includes('tasks') && (
            <div className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 hover:shadow-xl hover:shadow-pink-500/5 transition-all duration-500">
              <div className="flex items-center justify-between mb-8">
                <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-pink-400">Öncelik</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-6">Acil Görevler</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 p-1">
                  <div className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                  <span className="text-slate-700 font-bold text-sm">Azure DB ayarlarını tamamla</span>
                </li>
                <li className="flex items-center gap-3 p-1 opacity-50">
                  <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
                  <span className="text-slate-500 font-medium text-sm line-through tracking-tight">Layout düzenlemesi yapıldı</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Customize Button */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed bottom-8 right-8 p-5 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-110 hover:bg-blue-600 active:scale-95 transition-all duration-300 z-50 group"
      >
        <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
      </button>

      {/* Settings Modal */}
      {isSettingsOpen ? (
        <div key="settings-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[3rem] shadow-3xl border border-white max-w-sm w-full animate-in zoom-in duration-300">
            <h3 className="text-3xl font-black text-slate-800 mb-2">Görünüm</h3>
            <p className="text-slate-500 font-medium mb-8">Dashboard&apos;unu kişiselleştir.</p>

            <div className="space-y-4">
              {['classes', 'exams', 'tasks'].map((widget) => (
                <label key={widget} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100">
                  <span className="capitalize font-bold text-slate-700">{widget === 'classes' ? 'Dersler' : widget === 'exams' ? 'Sınavlar' : 'Görevler'}</span>
                  <input
                    type="checkbox"
                    checked={activeWidgets.includes(widget)}
                    onChange={() => toggleWidget(widget)}
                    className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                </label>
              ))}
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 active:scale-95 transition-all"
            >
              Uygula ve Kapat
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}