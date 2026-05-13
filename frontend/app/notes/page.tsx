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
import { Plus, Trash2, FileText } from 'lucide-react';

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
  {
    title: 'Course Link',
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range)
        .insertContent({
          type: 'paragraph',
          content: [{ type: 'text', text: 'Course: ', marks: [{ type: 'bold' }] }, { type: 'link', attrs: { href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', target: '_blank' }, content: [{ type: 'text', text: 'Example Course' }] }],
        })
        .run();
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
            <div class="fixed bg-white border border-gray-200 shadow-lg rounded-lg p-2 z-50 min-w-[200px] max-h-60 overflow-auto" style="font-family: inherit;">
              ${slashCommands
                .map(
                  (item, index) => `
                    <div class="px-3 py-2 cursor-pointer hover:bg-gray-100 rounded" data-index="${index}">
                      ${item.title}
                    </div>
                  `,
                )
                .join('')}
            </div>
          `;
          popup = component.querySelector('div')!;
          document.body.appendChild(component);

          // Click handler
          popup.addEventListener('click', (e: any) => {
            const index = (e.target as HTMLElement).dataset.index;
            if (index !== undefined) {
              slashCommands[parseInt(index!)].command(props);
            }
          });
        },
        onUpdate: (props: any) => {
          component.querySelector('div')!.innerHTML = `
            <div class="fixed bg-white border border-gray-200 shadow-lg rounded-lg p-2 z-50 min-w-[200px] max-h-60 overflow-auto" style="font-family: inherit;">
              ${slashCommands
                .filter((item) => item.title.toLowerCase().includes(props.query.toLowerCase()))
                .map(
                  (item, index) => `
                    <div class="px-3 py-2 cursor-pointer hover:bg-gray-100 rounded" data-index="${index}">
                      ${item.title}
                    </div>
                  `,
                )
                .join('')}
            </div>
          `;
        },
        onKeyDown: (props: any) => {
          // Arrow keys, enter, esc handling
          const { event, query } = props;
          const items = slashCommands.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
          const index = items.findIndex((item) => item.title.toLowerCase() === query.toLowerCase());
          if (event.key === 'ArrowUp') {
            // up
            return true;
          }
          if (event.key === 'ArrowDown') {
            // down
            return true;
          }
          if (event.key === 'Enter') {
            items[0]?.command(props);
            return true;
          }
          if (event.key === 'Escape') {
            // esc
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
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeNoteIdRef = useRef<number | null>(null);
  const currentTitleRef = useRef<string>('');

  const getToken = () => localStorage.getItem('token');

  const autoSave = useCallback(async (html: string, noteId: number, title: string) => {
    try {
      const token = getToken();
      await axios.put(`http://localhost:5000/api/notes/${noteId}`, {
        title,
        content: html,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: html, title } : n));
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline',
        },
      }),
      Underline,
      Strike,
      Dropcursor,
      Placeholder.configure({
        placeholder: 'Start typing, or use /slash commands like Notion...',
      }),
      Focus.configure({
        className: 'border-l-4 border-blue-500',
      }),
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
      const noteId = activeNoteIdRef.current;
      const title = currentTitleRef.current;
      if (!noteId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        autoSave(editor.getHTML(), noteId, title);
      }, 800);
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
        }));
        setNotes(fetched);
        if (fetched.length > 0) {
          setActiveNoteId(fetched[0].id);
          activeNoteIdRef.current = fetched[0].id;
          setCurrentTitle(fetched[0].title);
          currentTitleRef.current = fetched[0].title;
        }
      } catch (err) {
        console.error('Notlar yüklenemedi:', err);
      }
    };
    fetchNotes();
  }, []);

  // Load selected note into editor when activeNoteId changes
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
      autoSave(editor.getHTML(), activeNoteIdRef.current, currentTitleRef.current);
    }
    setActiveNoteId(note.id);
    activeNoteIdRef.current = note.id;
    setCurrentTitle(note.title);
    currentTitleRef.current = note.title;
  };

  const createNewNote = async () => {
    try {
      const token = getToken();
      const res = await axios.post('http://localhost:5000/api/notes', {
        title: 'New Note',
        content: '',
      }, { headers: { Authorization: `Bearer ${token}` } });
      const newNote: Note = { id: res.data.id, title: res.data.title, content: res.data.content || '' };
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
        autoSave(editor.getHTML(), activeNoteIdRef.current!, currentTitleRef.current);
      }, 800);
    }
  };

  if (!editor) return <div className="flex items-center justify-center h-screen">Loading editor...</div>;

  return (
    <div className="min-h-screen bg-transparent flex">

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
                className={`group flex items-center gap-2 px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${activeNoteId === note.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500' : ''}`}
              >
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
            ))
          )}
        </div>
      </aside>

      {/* RIGHT PANEL - Editor */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0d0d0f]">
        {activeNoteId ? (
          <>
            <div className="px-8 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <input
                type="text"
                value={currentTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-2xl font-bold bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
                placeholder="Note title..."
              />
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
    </div>
  );
}
