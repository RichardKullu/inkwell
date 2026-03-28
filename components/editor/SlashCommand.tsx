"use client";

import { useEffect, useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
  slashCommandPluginKey,
  SLASH_COMMANDS,
  type SlashCommandItem,
} from "@/extensions/slash-command";

interface SlashCommandProps {
  editor: Editor;
}

export default function SlashCommand({ editor }: SlashCommandProps) {
  const [active, setActive] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const filtered = SLASH_COMMANDS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );

  const updateState = useCallback(() => {
    const state = slashCommandPluginKey.getState(editor.state);
    if (!state) return;

    setActive(state.active);
    setQuery(state.query);

    if (state.active) {
      const coords = editor.view.coordsAtPos(editor.state.selection.from);
      setPosition({ top: coords.bottom + 8, left: coords.left });
      setSelectedIndex(0);
    }
  }, [editor]);

  useEffect(() => {
    editor.on("transaction", updateState);
    return () => {
      editor.off("transaction", updateState);
    };
  }, [editor, updateState]);

  const selectItem = useCallback((item: SlashCommandItem) => {
    const state = slashCommandPluginKey.getState(editor.state);
    if (state?.range) {
      item.command({ editor, range: state.range });
    }
    editor.view.dispatch(
      editor.state.tr.setMeta(slashCommandPluginKey, {
        active: false,
        query: "",
        range: null,
      })
    );
  }, [editor]);

  useEffect(() => {
    if (!active) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        selectItem(filtered[selectedIndex]);
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [active, filtered, selectedIndex, selectItem]);

  if (!active || filtered.length === 0) return null;

  return (
    <div
      className="fixed z-50 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((item, i) => (
        <button
          key={item.title}
          onClick={() => selectItem(item)}
          className={`w-full text-left px-3 py-2 flex items-center gap-3 text-sm transition ${
            i === selectedIndex
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded text-xs font-medium">
            {item.icon}
          </span>
          <div>
            <div className="font-medium">{item.title}</div>
            <div className="text-xs text-gray-400">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
