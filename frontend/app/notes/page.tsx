'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Dropcursor from '@tiptap/extension-dropcursor';
import Placeholder from '@tiptap/extension-placeholder';
import Focus from '@tiptap/extension-focus';
import Suggestion from '@tiptap/suggestion';

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

export default function NotesPage() {
  interface Note {
    id: number;
    title: string;
    html: string;
  }

  const [notes, setNotes] = useState<Note[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');
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
    content: `
      <h2>
        Welcome to your Notion-like Note Editor! 
        <br><br>
        Try typing / to see slash commands.
      </h2>
      <p>
        Supports headings, bold, italic, underline, strike, lists, code blocks, links, and more.
        <br>
        </p>
      <p>
        Use <strong>Ctrl+B</strong> for bold, etc.
      </p>
    `,
    editorProps: {
      attributes: {
        class: `prose prose-neutral max-w-none p-12 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:my-4 prose-li:my-2 focus:outline-none min-h-[70vh] bg-white dark:bg-gray-900 dark:prose-invert prose-a:text-blue-500 hover:prose-a:text-blue-600`,
      },
    },
    onUpdate: ({ editor }) => {
      localStorage.setItem('synapsis-notes', editor.getHTML());
    },
  });

  useEffect(() => {
    const saved = localStorage.getItem('synapsis-notes');
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch {
        if (editor) {
          editor.commands.setContent(saved, { emitUpdate: false });
        }
      }
    }
  }, []);

  const saveNotes = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('synapsis-notes', JSON.stringify(updatedNotes));
  };

  const createNewNote = () => {
    const newId = Date.now();
    const newNote: Note = { id: newId, title: 'New Note', html: '' };
    const newNotes = [...notes, newNote];
    saveNotes(newNotes);
    setEditingId(newId);
    setCurrentTitle('New Note');
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setCurrentTitle(note.title);
    editor.commands.setContent(note.html, { emitUpdate: false });
  };

  const saveNote = () => {
    if (editingId === null || !editor) return;
    const html = editor.getHTML();
    const updatedNotes = notes.map((note) =>
      note.id === editingId ? { ...note, title: currentTitle, html } : note
    );
    saveNotes(updatedNotes);
    setEditingId(null);
  };

  if (!editor) return <div className="flex items-center justify-center h-screen">Loading editor...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 py-8">
        <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notes</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                editor.chain().focus().clearContent().setContent(`
                  <h2>
                    Welcome to your Notion-like Note Editor! 
                    <br><br>
                    Try typing / to see slash commands.
                  </h2>
                  <p>
                    Supports headings, bold, italic, underline, strike, lists, code blocks, links, and more.
                  </p>
                `).run();
                localStorage.removeItem('synapsis-notes');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            >
              New Note
            </button>
          </div>
        </div>
        <div className="editor-container relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-1">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

