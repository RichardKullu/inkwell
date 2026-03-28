"use client";

import type { Editor } from "@tiptap/react";

interface EditorToolbarProps {
  editor: Editor;
}

interface ToolbarButton {
  label: string;
  action: () => void;
  isActive: () => boolean;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  const buttons: ToolbarButton[] = [
    {
      label: "B",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive("bold"),
    },
    {
      label: "I",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive("italic"),
    },
    {
      label: "U",
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: () => editor.isActive("underline"),
    },
    {
      label: "S",
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive("strike"),
    },
    {
      label: "H1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive("heading", { level: 1 }),
    },
    {
      label: "H2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive("heading", { level: 2 }),
    },
    {
      label: "H3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive("heading", { level: 3 }),
    },
    {
      label: "\u2022",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive("bulletList"),
    },
    {
      label: "1.",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive("orderedList"),
    },
    {
      label: "\u275D",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive("blockquote"),
    },
    {
      label: "<>",
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive("codeBlock"),
    },
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
            btn.isActive()
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
