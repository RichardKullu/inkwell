"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";

interface AIFloatingToolbarProps {
  editor: Editor;
}

type AIActionType = "rewrite" | "shorten" | "lengthen" | "grammar" | "tone";

const AI_ACTIONS: { type: AIActionType; label: string; tone?: "formal" | "casual" }[] = [
  { type: "rewrite", label: "Rewrite" },
  { type: "shorten", label: "Shorter" },
  { type: "lengthen", label: "Longer" },
  { type: "grammar", label: "Fix Grammar" },
  { type: "tone", label: "Formal", tone: "formal" },
  { type: "tone", label: "Casual", tone: "casual" },
];

export default function AIFloatingToolbar({ editor }: AIFloatingToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const updatePosition = useCallback(() => {
    const { from, empty } = editor.state.selection;
    if (empty) {
      setVisible(false);
      setResult(null);
      return;
    }
    const coords = editor.view.coordsAtPos(from);
    setPosition({ top: coords.top - 48, left: coords.left });
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    editor.on("selectionUpdate", updatePosition);
    return () => { editor.off("selectionUpdate", updatePosition); };
  }, [editor, updatePosition]);

  async function handleAction(action: AIActionType, tone?: "formal" | "casual") {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (!selectedText.trim()) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text: selectedText, tone }),
        signal: abortRef.current.signal,
      });
      const text = await response.text();
      setResult(text);
      setLoading(false);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") setLoading(false);
    }
  }

  function applyResult() {
    if (!result) return;
    const { from, to } = editor.state.selection;
    editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run();
    setResult(null);
    setVisible(false);
  }

  function dismissResult() {
    setResult(null);
  }

  if (!visible) return null;

  return (
    <div className="fixed z-50 flex flex-col gap-2" style={{ top: position.top, left: position.left }}>
      {!result && (
        <div className="flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1.5">
          <span className="text-xs text-indigo-500 font-medium px-1.5">AI</span>
          {AI_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleAction(action.type, action.tone)}
              disabled={loading}
              className="px-2.5 py-1 text-xs rounded-md text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition disabled:opacity-40"
            >
              {action.label}
            </button>
          ))}
          {loading && (
            <span className="text-xs text-gray-400 px-2 animate-pulse">Thinking...</span>
          )}
        </div>
      )}

      {result && (
        <div className="bg-white rounded-lg shadow-lg border border-indigo-200 p-3 max-w-lg">
          <div className="text-xs text-indigo-500 font-medium mb-1.5">AI Suggestion</div>
          <p className="text-sm text-gray-700 leading-relaxed">{result}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={applyResult}
              className="px-3 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Accept
            </button>
            <button
              onClick={dismissResult}
              className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
