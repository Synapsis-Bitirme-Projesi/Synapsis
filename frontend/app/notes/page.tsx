'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Dropcursor from '@tiptap/extension-dropcursor';
import Placeholder from '@tiptap/extension-placeholder';
import Focus from '@tiptap/extension-focus';
import Suggestion from '@tiptap/suggestion';
import axios from 'axios';
import { Plus, Trash2, FileText, GraduationCap, AlertCircle, X } from 'lucide-react';

// Sabit ders listemiz (Dilersen veritabanından veya ortak bir state'ten de besleyebilirsin)
const AVAILABLE_COURSES = ['Physics', 'Calculus', 'Software Engineering', 'Robotics'];

// Custom slash commands
const slashCommands = [
  {
    title: 'Heading 1',
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Bullet list',
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered list',
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
];

// @ts-ignore Custom suggestion typing
const SlashCommand = Suggestion({
  char: '/',
  command: ({ editor, range, props }: any) => {
    props.command({ editor, range });
  },
  items: ({ query }: any) => {
    return slashCommands
      .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  },
  render: () => {
    let component: any;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = document.createElement('div');
        component.innerHTML = `
          <div class="fixed bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg rounded-lg p-2 z-50 min-w-[200px] max-h-60 overflow-auto" style="font-family: inherit;">
            ${slashCommands
            .map(
              (item, index) => `
                  <div class="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-sm rounded" data-index="${index}">
                    ${item.title}
                  </div>
                `,
            )
            .join('')}
          </div>
        `;
        popup = component.querySelector('div')!;
        document.body.appendChild(component);

        popup.addEventListener('click', (e: any) => {
          const index = (e.target as HTMLElement).dataset.index;
          if (index !== undefined) {
            slashCommands[parseInt(index!)].command(props);
          }
        });
      },
      onUpdate: (props: any) => {
        component.querySelector('div')!.innerHTML = `
          <div class="fixed bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg rounded-lg p-2 z-50 min-w-[200px] max-h-60 overflow-auto" style="font-family: inherit;">
            ${slashCommands
            .filter((item) => item.title.toLowerCase().includes(props.query.toLowerCase()))
            .map(
              (item, index) => `
                  <div class="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-sm rounded" data-index="${index}">
                    ${item.title}
                  </div>
                `,
            )
            .join('')}
          </div>
        `;
      },
      onKeyDown: (props: any) => {
        const { event, query } = props;
        const items = slashCommands.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
        if (event.key === 'Enter') {
          items[0]?.command(props);
          return true;
        }
        return false;
      },
      onExit: () => {
        if (component) document.body.removeChild(component);
      },
    };
  }
});

interface Note {
  id: number;
  title: string;
  content: string;
  course: string | null; // Phase 3: Ders ilişkisi alanı
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');

  // Phase 3 Modal ve Pop-up State'leri
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [pendingCourse, setPendingCourse] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeNoteIdRef = useRef<number | null>(null);
  const currentTitleRef = useRef<string>('');

  const getToken = () => localStorage.getItem('token');

  // AutoSave backend isteğini course ve tags ile besliyoruz
  const currentCourseRef = useRef<string | null>(null);

  const autoSave = useCallback(async (html: string, noteId: number, title: string, courseVal?: string | null) => {
    try {
      const token = getToken();

      // Eğer courseVal undefined gelirse, state'deki mevcut değeri koru (ezmesini engelle!)
      const finalCourse = courseVal !== undefined ? courseVal : currentCourseRef.current;

      await axios.put(`http://localhost:5000/api/notes/${noteId}`, {
        title,
        content: html,
        course: finalCourse,
        courseName: finalCourse
      }, { headers: { Authorization: `Bearer ${token}` } });

      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: html, title, course: finalCourse } : n));
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-500 underline' },
      }),
      Underline,
      Strike,
      Dropcursor,
      Placeholder.configure({
        placeholder: 'Start typing, or use /slash commands like Notion...',
      }),
      Focus.configure({ className: 'border-l-4 border-blue-500' }),
      // @ts-ignore
      SlashCommand,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: `prose prose-neutral max-w-none p-12 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:my-4 prose-li:my-2 focus:outline-none min-h-[70vh] bg-white dark:bg-slate-900 dark:prose-invert prose-a:text-blue-500 hover:prose-a:text-blue-600`,
      },
    },
    onUpdate: ({ editor }) => {
      if (!editor.isFocused) return; // Kullanıcı aktif yazmıyorsa asla tetikleme!

      const noteId = activeNoteIdRef.current;
      const title = currentTitleRef.current;
      const course = currentCourseRef.current; // Güncel referansı zorla al
      if (!noteId) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        // 4. parametre olarak güncel dersi KESİNLİKLE gönderiyoruz
        autoSave(editor.getHTML(), noteId, title, course);
      }, 1000); // Süreyi 1 saniyeye çektik ki çakışma ihtimali azalsın
    },
  });

  // Load notes on mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await axios.get('http://localhost:5000/api/notes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const fetched: Note[] = (res.data as any[]).map((n: any) => ({
          id: n.id,
          title: n.title,
          content: n.content || '',
          course: n.course || null, // Veritabanından gelen tam 'course' alanı
        }));
        setNotes(fetched);
        if (fetched.length > 0) {
          setActiveNoteId(fetched[0].id);
          activeNoteIdRef.current = fetched[0].id;
          setCurrentTitle(fetched[0].title);
          currentTitleRef.current = fetched[0].title;
          currentCourseRef.current = fetched[0].course; // İlk notun ders referansını da yüklüyoruz!
        }
      } catch (err) {
        console.error('Notlar yüklenemedi:', err);
      }
    };
    fetchNotes();
  }, []);

  // Load selected note into editor
  useEffect(() => {
    if (!editor || activeNoteId === null) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
      editor.commands.setContent(note.content || '', { emitUpdate: false });
    }
  }, [activeNoteId, editor]);

  const selectNote = (note: Note) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (activeNoteIdRef.current && editor) {
      autoSave(editor.getHTML(), activeNoteIdRef.current, currentTitleRef.current, currentCourseRef.current);
    }
    setActiveNoteId(note.id);
    activeNoteIdRef.current = note.id;
    setCurrentTitle(note.title);
    currentTitleRef.current = note.title;
    currentCourseRef.current = note.course; // Bu satırı ekledik!
  };

  const createNewNote = async () => {
    try {
      const token = getToken();
      const res = await axios.post('http://localhost:5000/api/notes', {
        title: 'New Note',
        content: '',
        course: null,
        tags: []
      }, { headers: { Authorization: `Bearer ${token}` } });
      const newNote: Note = { id: res.data.id, title: res.data.title, content: res.data.content || '', course: null };
      setNotes(prev => [newNote, ...prev]);
      setActiveNoteId(newNote.id);
      activeNoteIdRef.current = newNote.id;
      setCurrentTitle(newNote.title);
      currentTitleRef.current = newNote.title;
      editor?.commands.setContent('', { emitUpdate: false });
    } catch (err) {
      console.error('Not oluşturulamadı:', err);
    }
  };

  const deleteNote = async (noteId: number) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      const token = getToken();
      await axios.delete(`http://localhost:5000/api/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const remaining = notes.filter(n => n.id !== noteId);
      setNotes(remaining);
      if (activeNoteId === noteId) {
        if (remaining.length > 0) {
          setActiveNoteId(remaining[0].id);
          activeNoteIdRef.current = remaining[0].id;
          setCurrentTitle(remaining[0].title);
          currentTitleRef.current = remaining[0].title;
        } else {
          setActiveNoteId(null);
          activeNoteIdRef.current = null;
          setCurrentTitle('');
          currentTitleRef.current = '';
          editor?.commands.setContent('', { emitUpdate: false });
        }
      }
    } catch (err) {
      console.error('Not silinemedi:', err);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setCurrentTitle(newTitle);
    currentTitleRef.current = newTitle;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    if (activeNoteIdRef.current && editor) {
      saveTimerRef.current = setTimeout(() => {
        // Dördüncü parametre olarak güncel ders referansını (currentCourseRef.current) ekledik!
        autoSave(editor.getHTML(), activeNoteIdRef.current!, newTitle, currentCourseRef.current);
      }, 800);
    }
  };

  // Phase 3: Kullanıcı bir ders seçtiğinde veya unlink etmek istediğinde modalı tetikler
  const handleCourseSelectIntent = (courseValue: string) => {
    if (courseValue === 'unlink') {
      setPendingCourse(null);
    } else {
      setPendingCourse(courseValue);
    }
    setShowLinkModal(true);
  };

  // Phase 3: Onay Pop-up'ında onay verildiğinde çalışacak fonksiyon
  // Phase 3: Onay Pop-up'ında onay verildiğinde hem state'i hem veritabanını güncelliyoruz
  const confirmCourseLinking = async () => {
    if (!activeNoteId || !editor) return;
    setShowLinkModal(false);

    // Referansı anında güncelle ki peşinden gelecek auto-save ezmesin!
    currentCourseRef.current = pendingCourse;
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, course: pendingCourse } : n));

    try {
      const token = getToken();
      // GARANTİ ADIM: Hem course hem courseName gönderiyoruz!
      await axios.put(`http://localhost:5000/api/notes/${activeNoteId}`, {
        title: currentTitle,
        content: editor.getHTML(),
        course: pendingCourse,
        courseName: pendingCourse
      }, { headers: { Authorization: `Bearer ${token}` } });

      console.log("Ders bağlantı isteği başarıyla gönderildi!");
    } catch (err) {
      console.error("Ders kaydedilirken hata:", err);
    }
  };

  const activeNote = notes.find(n => n.id === activeNoteId);

  if (!editor) return <div className="flex items-center justify-center h-screen">Loading editor...</div>;

  return (
    <div className="min-h-screen bg-transparent flex relative">

      {/* LEFT PANEL - Notes List */}
      <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#111113]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={createNewNote}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            <Plus size={16} />
            New Note
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-center text-slate-400 text-sm p-6">No notes yet.</p>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className={`group flex flex-col gap-1 px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${activeNoteId === note.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-slate-400 shrink-0" />
                  <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                    {note.title || 'Untitled'}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-all rounded-lg"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Phase 3: Sol Listedeki Not Kartında Bağlı Dersi Gösterme */}
                {note.course && (
                  <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md self-start">
                    <GraduationCap size={12} />
                    <span>{note.course}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* RIGHT PANEL - Editor */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0d0d0f]">
        {activeNoteId ? (
          <>
            {/* EDITOR HEADER */}
            <div className="px-8 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={currentTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full text-2xl font-bold bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
                  placeholder="Note title..."
                />
              </div>

              {/* Phase 3: Ders İlişkilendirme Dropdown ve Editör Header Bağlantısı */}
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className={activeNote?.course ? "text-blue-500" : "text-slate-400"} />
                <select
                  value={activeNote?.course || ''}
                  onChange={(e) => handleCourseSelectIntent(e.target.value)}
                  className="text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <option value="" disabled>Course Bağla...</option>
                  {AVAILABLE_COURSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {activeNote?.course && (
                    <option value="unlink" className="text-rose-500 font-bold">⚠️ Bağlantıyı Kaldır</option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="editor-container relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-1 m-4">
                <EditorContent editor={editor} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-bold">Select a note or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Phase 3: CONFIRMATION POP-UP (MODAL) */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all animate-fade-in">
          <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setShowLinkModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl shrink-0 ${pendingCourse ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'}`}>
                <AlertCircle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {pendingCourse ? 'Ders Bağlantısını Onayla' : 'Ders Bağlantısını Kaldır'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {pendingCourse ? (
                    <>Bu notu resmi olarak <span className="font-bold text-slate-800 dark:text-slate-200">"{pendingCourse}"</span> dersine bağlamak istiyor musunuz? Yapay zeka asistanı bu dersle ilgili üretim yaparken bu notun içeriğini referans alacaktır.</>
                  ) : (
                    <>Bu notun mevcut ders bağlantısını kaldırmak istediğinize emin misiniz? Not içeriğiniz silinmeyecek, ancak yapay zeka asistanı bu ders için döküman üretirken artık bu notu taramayacaktır.</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-all active:scale-95"
              >
                Vazgeç
              </button>
              <button
                onClick={confirmCourseLinking}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all active:scale-95 ${pendingCourse ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {pendingCourse ? 'Evet, Bağla' : 'Evet, Bağlantıyı Kopar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}