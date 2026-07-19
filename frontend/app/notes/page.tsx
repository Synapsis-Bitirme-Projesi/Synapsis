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
import {
  Plus,
  Trash2,
  FileText,
  GraduationCap,
  AlertCircle,
  X,
  LayoutGrid,
  Type,
  Loader2,
  Menu,
} from 'lucide-react';
import WhiteboardCanvas from '../components/WhiteboardCanvas';
import {
  WhiteboardData,
  createEmptyWhiteboard,
  parseWhiteboardData,
  whiteboardToPlainText,
} from '../lib/whiteboard';
import {
  ActiveLecture,
  ScheduleCourse,
  findActiveLecture,
} from '../lib/activeLecture';
import { API_BASE_URL } from '../lib/api';

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
        document.body.appendChild(component);

        component.querySelector('div')!.addEventListener('click', (e: any) => {
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

type NoteType = 'text' | 'whiteboard';

interface Note {
  id: number;
  title: string;
  content: string;
  course: string | null;
  note_type: NoteType;
  whiteboard_data: WhiteboardData;
}

function normalizeNote(raw: any): Note {
  return {
    id: raw.id,
    title: raw.title || 'Untitled',
    content: raw.content || '',
    course: raw.course || raw.course_name || null,
    note_type: raw.note_type === 'whiteboard' ? 'whiteboard' : 'text',
    whiteboard_data: parseWhiteboardData(raw.whiteboard_data),
  };
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [scheduleCourses, setScheduleCourses] = useState<ScheduleCourse[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [pendingCourse, setPendingCourse] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [notesLoadError, setNotesLoadError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Live-lecture suggestion after first successful save during class time
  const [showLiveLinkModal, setShowLiveLinkModal] = useState(false);
  const [liveLectureSuggestion, setLiveLectureSuggestion] = useState<ActiveLecture | null>(null);
  const [liveLinkNoteId, setLiveLinkNoteId] = useState<number | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeNoteIdRef = useRef<number | null>(null);
  const currentTitleRef = useRef<string>('');
  const currentCourseRef = useRef<string | null>(null);
  const currentNoteTypeRef = useRef<NoteType>('text');
  const currentWhiteboardRef = useRef<WhiteboardData>(createEmptyWhiteboard());
  const notesRef = useRef<Note[]>([]);
  const scheduleCoursesRef = useRef<ScheduleCourse[]>([]);
  // noteIds already prompted (or dismissed) this session — avoid spam on every autosave
  const livePromptedNoteIdsRef = useRef<Set<number>>(new Set());

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    scheduleCoursesRef.current = scheduleCourses;
  }, [scheduleCourses]);

  const maybeOfferLiveLectureLink = useCallback((noteId: number, linkedCourse: string | null | undefined) => {
    // Only for unlinked notes, once per note per session
    if (linkedCourse) return;
    if (livePromptedNoteIdsRef.current.has(noteId)) return;
    if (showLiveLinkModal || showLinkModal) return;

    const lecture = findActiveLecture(scheduleCoursesRef.current, new Date());
    if (!lecture) return;

    livePromptedNoteIdsRef.current.add(noteId);
    setLiveLectureSuggestion(lecture);
    setLiveLinkNoteId(noteId);
    setShowLiveLinkModal(true);
  }, [showLiveLinkModal, showLinkModal]);

  const autoSave = useCallback(async (payload: {
    noteId: number;
    title: string;
    content?: string;
    course?: string | null;
    noteType?: NoteType;
    whiteboardData?: WhiteboardData;
    skipLivePrompt?: boolean;
  }) => {
    try {
      const token = getToken();
      if (!token) return;

      const finalCourse = payload.course !== undefined ? payload.course : currentCourseRef.current;
      const noteType = payload.noteType || currentNoteTypeRef.current;
      const whiteboardData = payload.whiteboardData || currentWhiteboardRef.current;
      const content = noteType === 'whiteboard'
        ? whiteboardToPlainText(whiteboardData, payload.title)
        : (payload.content ?? '');

      setSaveState('saving');

      await axios.put(`${API_BASE_URL}/api/notes/${payload.noteId}`, {
        title: payload.title,
        content,
        course: finalCourse,
        courseName: finalCourse,
        note_type: noteType,
        whiteboard_data: whiteboardData,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setNotes(prev => prev.map(n => n.id === payload.noteId ? {
        ...n,
        content,
        title: payload.title,
        course: finalCourse ?? null,
        note_type: noteType,
        whiteboard_data: whiteboardData,
      } : n));
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1200);

      if (!payload.skipLivePrompt) {
        maybeOfferLiveLectureLink(payload.noteId, finalCourse);
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveState('error');
    }
  }, [maybeOfferLiveLectureLink]);

  const scheduleSave = useCallback((overrides?: {
    content?: string;
    title?: string;
    course?: string | null;
    noteType?: NoteType;
    whiteboardData?: WhiteboardData;
  }) => {
    const noteId = activeNoteIdRef.current;
    if (!noteId) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      autoSave({
        noteId,
        title: overrides?.title ?? currentTitleRef.current,
        content: overrides?.content,
        course: overrides?.course,
        noteType: overrides?.noteType,
        whiteboardData: overrides?.whiteboardData,
      });
    }, 900);
  }, [autoSave]);

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
    onUpdate: ({ editor: ed }) => {
      if (!ed.isFocused) return;
      if (currentNoteTypeRef.current !== 'text') return;
      if (!activeNoteIdRef.current) return;
      scheduleSave({ content: ed.getHTML() });
    },
  });

  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoadingNotes(true);
      setNotesLoadError(null);
      try {
        const token = getToken();
        if (!token) return;

        const [notesRes, coursesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/notes`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_BASE_URL}/api/courses`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
        ]);

        const fetched: Note[] = (notesRes.data as any[]).map(normalizeNote);
        setNotes(fetched);

        const schedule = (coursesRes.data as ScheduleCourse[]) || [];
        setScheduleCourses(schedule);
        scheduleCoursesRef.current = schedule;

        const courseNames = Array.from(
          new Set(
            schedule
              .map((c) => c.course_name || c.name || '')
              .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));
        setAvailableCourses(courseNames);

        if (fetched.length > 0) {
          const first = fetched[0];
          setActiveNoteId(first.id);
          activeNoteIdRef.current = first.id;
          setCurrentTitle(first.title);
          currentTitleRef.current = first.title;
          currentCourseRef.current = first.course;
          currentNoteTypeRef.current = first.note_type;
          currentWhiteboardRef.current = first.whiteboard_data;
        }
      } catch (err) {
        console.error('Notes could not be loaded:', err);
        setNotesLoadError('Notes could not be loaded. Check your connection and try again.');
      } finally {
        setIsLoadingNotes(false);
      }
    };
    fetchNotes();
  }, []);

  // Load selected note into editor / whiteboard refs
  useEffect(() => {
    if (activeNoteId === null) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    currentNoteTypeRef.current = note.note_type;
    currentWhiteboardRef.current = note.whiteboard_data;
    currentCourseRef.current = note.course;

    if (note.note_type === 'text' && editor) {
      editor.commands.setContent(note.content || '', { emitUpdate: false });
    }
  }, [activeNoteId, editor]);

  const flushActiveNote = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const noteId = activeNoteIdRef.current;
    if (!noteId) return;

    const noteType = currentNoteTypeRef.current;
    await autoSave({
      noteId,
      title: currentTitleRef.current,
      content: noteType === 'text' ? (editor?.getHTML() || '') : undefined,
      course: currentCourseRef.current,
      noteType,
      whiteboardData: currentWhiteboardRef.current,
    });
  };

  const selectNote = async (note: Note) => {
    if (note.id === activeNoteIdRef.current) return;
    await flushActiveNote();

    setActiveNoteId(note.id);
    activeNoteIdRef.current = note.id;
    setCurrentTitle(note.title);
    currentTitleRef.current = note.title;
    currentCourseRef.current = note.course;
    currentNoteTypeRef.current = note.note_type;
    currentWhiteboardRef.current = note.whiteboard_data;
    setIsSidebarOpen(false);
  };

  const createNewNote = async (noteType: NoteType = 'text') => {
    try {
      setShowCreateMenu(false);
      await flushActiveNote();

      const token = getToken();
      const whiteboard = createEmptyWhiteboard();
      const res = await axios.post(`${API_BASE_URL}/api/notes`, {
        title: noteType === 'whiteboard' ? 'New Whiteboard' : 'New Note',
        content: '',
        course: null,
        note_type: noteType,
        whiteboard_data: whiteboard,
      }, { headers: { Authorization: `Bearer ${token}` } });

      const newNote = normalizeNote(res.data);
      setNotes(prev => [newNote, ...prev]);
      setActiveNoteId(newNote.id);
      activeNoteIdRef.current = newNote.id;
      setCurrentTitle(newNote.title);
      currentTitleRef.current = newNote.title;
      currentCourseRef.current = null;
      currentNoteTypeRef.current = newNote.note_type;
      currentWhiteboardRef.current = newNote.whiteboard_data;

      if (newNote.note_type === 'text') {
        editor?.commands.setContent('', { emitUpdate: false });
      }
    } catch (err) {
      console.error('Note could not be created:', err);
    }
  };

  const deleteNote = async (noteId: number) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      const token = getToken();
      await axios.delete(`${API_BASE_URL}/api/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const remaining = notes.filter(n => n.id !== noteId);
      setNotes(remaining);
      if (activeNoteId === noteId) {
        if (remaining.length > 0) {
          const next = remaining[0];
          setActiveNoteId(next.id);
          activeNoteIdRef.current = next.id;
          setCurrentTitle(next.title);
          currentTitleRef.current = next.title;
          currentCourseRef.current = next.course;
          currentNoteTypeRef.current = next.note_type;
          currentWhiteboardRef.current = next.whiteboard_data;
        } else {
          setActiveNoteId(null);
          activeNoteIdRef.current = null;
          setCurrentTitle('');
          currentTitleRef.current = '';
          currentCourseRef.current = null;
          currentNoteTypeRef.current = 'text';
          currentWhiteboardRef.current = createEmptyWhiteboard();
          editor?.commands.setContent('', { emitUpdate: false });
        }
      }
    } catch (err) {
      console.error('Note could not be deleted:', err);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setCurrentTitle(newTitle);
    currentTitleRef.current = newTitle;
    scheduleSave({
      title: newTitle,
      content: currentNoteTypeRef.current === 'text' ? (editor?.getHTML() || '') : undefined,
      whiteboardData: currentWhiteboardRef.current,
    });
  };

  const handleWhiteboardChange = (board: WhiteboardData) => {
    currentWhiteboardRef.current = board;
    setNotes(prev => prev.map(n => n.id === activeNoteIdRef.current ? { ...n, whiteboard_data: board, note_type: 'whiteboard' } : n));
    scheduleSave({
      noteType: 'whiteboard',
      whiteboardData: board,
    });
  };

  const convertActiveNote = async (nextType: NoteType) => {
    const noteId = activeNoteIdRef.current;
    if (!noteId) return;
    if (currentNoteTypeRef.current === nextType) return;

    if (nextType === 'whiteboard') {
      // Seed whiteboard with a text node from existing HTML if empty
      let board = currentWhiteboardRef.current;
      if (!board.nodes.length) {
        const plain = (editor?.getText() || '').trim();
        if (plain) {
          board = {
            ...createEmptyWhiteboard(),
            nodes: [{
              id: `seed_${Date.now()}`,
              type: 'text',
              x: 80,
              y: 80,
              w: 280,
              h: 160,
              text: plain,
              color: '#3B82F6',
            }],
          };
        }
      }
      currentNoteTypeRef.current = 'whiteboard';
      currentWhiteboardRef.current = board;
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, note_type: 'whiteboard', whiteboard_data: board } : n));
      await autoSave({
        noteId,
        title: currentTitleRef.current,
        noteType: 'whiteboard',
        whiteboardData: board,
        course: currentCourseRef.current,
      });
      return;
    }

    // Convert whiteboard -> text: put plain export into editor
    const plain = whiteboardToPlainText(currentWhiteboardRef.current, '');
    const html = plain
      ? plain.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('')
      : '<p></p>';
    currentNoteTypeRef.current = 'text';
    editor?.commands.setContent(html, { emitUpdate: false });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, note_type: 'text', content: html } : n));
    await autoSave({
      noteId,
      title: currentTitleRef.current,
      content: html,
      noteType: 'text',
      course: currentCourseRef.current,
      whiteboardData: currentWhiteboardRef.current,
      skipLivePrompt: true,
    });
  };

  const handleCourseSelectIntent = (courseValue: string) => {
    if (courseValue === 'unlink') {
      setPendingCourse(null);
    } else {
      setPendingCourse(courseValue);
    }
    setShowLinkModal(true);
  };

  const confirmCourseLinking = async () => {
    if (!activeNoteId) return;
    setShowLinkModal(false);

    currentCourseRef.current = pendingCourse;
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, course: pendingCourse } : n));

    await autoSave({
      noteId: activeNoteId,
      title: currentTitleRef.current,
      content: currentNoteTypeRef.current === 'text' ? (editor?.getHTML() || '') : undefined,
      course: pendingCourse,
      noteType: currentNoteTypeRef.current,
      whiteboardData: currentWhiteboardRef.current,
      skipLivePrompt: true,
    });
  };

  const dismissLiveLectureLink = () => {
    setShowLiveLinkModal(false);
    setLiveLectureSuggestion(null);
    setLiveLinkNoteId(null);
  };

  const confirmLiveLectureLink = async () => {
    if (!liveLinkNoteId || !liveLectureSuggestion) {
      dismissLiveLectureLink();
      return;
    }

    const courseName = liveLectureSuggestion.courseName;
    const noteId = liveLinkNoteId;

    // Keep editor refs in sync if user is still on this note
    if (activeNoteIdRef.current === noteId) {
      currentCourseRef.current = courseName;
    }

    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, course: courseName } : n));
    dismissLiveLectureLink();

    await autoSave({
      noteId,
      title: activeNoteIdRef.current === noteId
        ? currentTitleRef.current
        : (notesRef.current.find(n => n.id === noteId)?.title || 'Untitled'),
      content: activeNoteIdRef.current === noteId && currentNoteTypeRef.current === 'text'
        ? (editor?.getHTML() || '')
        : undefined,
      course: courseName,
      noteType: activeNoteIdRef.current === noteId
        ? currentNoteTypeRef.current
        : (notesRef.current.find(n => n.id === noteId)?.note_type || 'text'),
      whiteboardData: activeNoteIdRef.current === noteId
        ? currentWhiteboardRef.current
        : (notesRef.current.find(n => n.id === noteId)?.whiteboard_data || createEmptyWhiteboard()),
      skipLivePrompt: true,
    });
  };

  const activeNote = notes.find(n => n.id === activeNoteId);
  const isWhiteboard = activeNote?.note_type === 'whiteboard';

  if (!editor) return <div className="flex items-center justify-center h-screen">Loading editor...</div>;

  return (
    <div className="min-h-screen bg-transparent flex relative">
      {/* Mobile sidebar toggle */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <Menu size={16} />
        Notes
      </button>

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT PANEL */}
      <aside
        className={`w-72 md:w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#111113] fixed md:static inset-y-0 left-0 z-40 transform transition-transform duration-200 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 relative">
          <button
            onClick={() => setShowCreateMenu(v => !v)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            <Plus size={16} />
            New Note
          </button>
          {showCreateMenu && (
            <div className="absolute left-4 right-4 top-[4.25rem] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <button
                onClick={() => createNewNote('text')}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Type size={15} className="text-blue-500" />
                Text note
              </button>
              <button
                onClick={() => createNewNote('whiteboard')}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LayoutGrid size={15} className="text-violet-500" />
                Whiteboard
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoadingNotes ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              Loading notes...
            </div>
          ) : notesLoadError ? (
            <div className="p-4">
              <p className="text-center text-rose-500 text-sm mb-2">{notesLoadError}</p>
              <button
                onClick={() => window.location.reload()}
                className="w-full text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Retry
              </button>
            </div>
          ) : notes.length === 0 ? (
            <p className="text-center text-slate-400 text-sm p-6">No notes yet.</p>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className={`group flex flex-col gap-1 px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${activeNoteId === note.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {note.note_type === 'whiteboard' ? (
                    <LayoutGrid size={14} className="text-violet-500 shrink-0" />
                  ) : (
                    <FileText size={14} className="text-slate-400 shrink-0" />
                  )}
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

                <div className="flex flex-wrap items-center gap-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${note.note_type === 'whiteboard' ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {note.note_type === 'whiteboard' ? 'Board' : 'Text'}
                  </span>
                  {note.course && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                      <GraduationCap size={12} />
                      <span>{note.course}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0d0d0f] pt-14 md:pt-0">
        {activeNoteId ? (
          <>
            <div className="px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={currentTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full text-2xl font-bold bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
                  placeholder="Note title..."
                />
                <div className="mt-1 text-[11px] font-semibold text-slate-400">
                  {saveState === 'saving' && 'Saving...'}
                  {saveState === 'saved' && 'Saved'}
                  {saveState === 'error' && 'Save failed'}
                  {saveState === 'idle' && (isWhiteboard ? 'Whiteboard autosave on' : 'Text autosave on')}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => convertActiveNote('text')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${!isWhiteboard ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    <Type size={13} />
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => convertActiveNote('whiteboard')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${isWhiteboard ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    <LayoutGrid size={13} />
                    Board
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <GraduationCap size={18} className={activeNote?.course ? 'text-blue-500' : 'text-slate-400'} />
                  <select
                    value={activeNote?.course || ''}
                    onChange={(e) => handleCourseSelectIntent(e.target.value)}
                    className="text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <option value="" disabled>
                      {availableCourses.length > 0 ? 'Link course...' : 'No courses yet'}
                    </option>
                    {availableCourses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    {activeNote?.course && !availableCourses.includes(activeNote.course) && (
                      <option value={activeNote.course}>{activeNote.course}</option>
                    )}
                    {activeNote?.course && (
                      <option value="unlink" className="text-rose-500 font-bold">Unlink course</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className={`flex-1 ${isWhiteboard ? 'overflow-hidden p-3 sm:p-4' : 'overflow-y-auto'}`}>
              {isWhiteboard ? (
                <WhiteboardCanvas
                  key={`wb-${activeNoteId}`}
                  value={activeNote?.whiteboard_data}
                  onChange={handleWhiteboardChange}
                  className="h-[calc(100vh-11rem)] min-h-[28rem]"
                />
              ) : (
                <div className="editor-container relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-1 m-4">
                  <EditorContent editor={editor} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-bold">Select a note or create a new one</p>
              <p className="mt-2 text-sm">Text notes and whiteboards are both supported.</p>
            </div>
          </div>
        )}

      {showLiveLinkModal && liveLectureSuggestion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 transition-all animate-fade-in">
          <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={dismissLiveLectureLink}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl shrink-0 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <GraduationCap size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Link note to current lecture?
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  You appear to be in{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {liveLectureSuggestion.courseName}
                  </span>
                  {liveLectureSuggestion.courseCode ? (
                    <> ({liveLectureSuggestion.courseCode})</>
                  ) : null}
                  {' '}right now ({liveLectureSuggestion.startTime}–{liveLectureSuggestion.endTime}).
                  Do you want to save this note to that course?
                </p>
                {liveLectureSuggestion.location && (
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    Location: {liveLectureSuggestion.location}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <button
                onClick={dismissLiveLectureLink}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-all active:scale-95"
              >
                Not now
              </button>
              <button
                onClick={confirmLiveLectureLink}
                className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-700"
              >
                Yes, link to {liveLectureSuggestion.courseName}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

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
                  {pendingCourse ? 'Confirm course link' : 'Unlink course'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {pendingCourse ? (
                    <>Link this note to <span className="font-bold text-slate-800 dark:text-slate-200">"{pendingCourse}"</span>? The AI assistant will use this note when generating study material for that course.</>
                  ) : (
                    <>Unlink this note from its course? The note content stays, but the assistant will no longer treat it as course-specific source material.</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmCourseLinking}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all active:scale-95 ${pendingCourse ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {pendingCourse ? 'Yes, link' : 'Yes, unlink'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
