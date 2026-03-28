"use client";

import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";

interface EditorToolbarProps {
  editor: Editor;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  // Subscribe to editor state changes so toolbar re-renders on selection/format changes
  const editorState = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
    }),
  });

  const buttons = [
    { label: "B", action: () => editor.chain().focus().toggleBold().run(), active: editorState.bold },
    { label: "I", action: () => editor.chain().focus().toggleItalic().run(), active: editorState.italic },
    { label: "U", action: () => editor.chain().focus().toggleUnderline().run(), active: editorState.underline },
    { label: "S", action: () => editor.chain().focus().toggleStrike().run(), active: editorState.strike },
    { label: "H1", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editorState.h1 },
    { label: "H2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editorState.h2 },
    { label: "H3", action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editorState.h3 },
    { label: "\u2022", action: () => editor.chain().focus().toggleBulletList().run(), active: editorState.bulletList },
    { label: "1.", action: () => editor.chain().focus().toggleOrderedList().run(), active: editorState.orderedList },
    { label: "\u275D", action: () => editor.chain().focus().toggleBlockquote().run(), active: editorState.blockquote },
    { label: "<>", action: () => editor.chain().focus().toggleCodeBlock().run(), active: editorState.codeBlock },
  ];

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onMouseDown={(e) => {
            e.preventDefault();
            btn.action();
          }}
          className={`px-2.5 py-1 text-sm rounded-md transition ${
            btn.active
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
