"use client";

import { useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import type { Editor } from "@tiptap/react";
import { aiAutocompletePluginKey } from "@/extensions/ai-autocomplete";

interface AIAutocompleteProps {
  editor: Editor;
}

function isEditorReady(editor: Editor): boolean {
  try {
    return !!editor.view?.dom;
  } catch {
    return false;
  }
}

function subscribeToEditorReady(editor: Editor, callback: () => void) {
  if (isEditorReady(editor)) return () => {};
  const check = setInterval(() => {
    if (isEditorReady(editor)) {
      clearInterval(check);
      callback();
    }
  }, 100);
  return () => clearInterval(check);
}

export default function AIAutocomplete({ editor }: AIAutocompleteProps) {
  const abortRef = useRef<AbortController | null>(null);
  const mounted = useSyncExternalStore(
    (cb) => subscribeToEditorReady(editor, cb),
    () => isEditorReady(editor),
    () => false
  );

  const triggerAutocomplete = useCallback(async () => {
    if (!isEditorReady(editor)) return;

    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 500), from, "\n");
    if (textBefore.trim().length < 10) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    editor.view.dispatch(
      editor.state.tr.setMeta(aiAutocompletePluginKey, { suggestion: null, loading: true, position: from })
    );

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "autocomplete",
          text: textBefore.slice(-200),
          context: textBefore.slice(0, -200),
        }),
        signal: abortRef.current.signal,
      });
      const text = await response.text();
      if (text) {
        const currentFrom = editor.state.selection.from;
        editor.view.dispatch(
          editor.state.tr.setMeta(aiAutocompletePluginKey, { suggestion: text, loading: false, position: currentFrom })
        );
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        try {
          editor.view.dispatch(
            editor.state.tr.setMeta(aiAutocompletePluginKey, { suggestion: null, loading: false, position: null })
          );
        } catch { /* editor may not be ready */ }
      }
    }
  }, [editor]);

  useEffect(() => {
    if (!mounted) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Tab" && !e.shiftKey) {
        try {
          const pluginState = aiAutocompletePluginKey.getState(editor.state);
          if (!pluginState?.suggestion && !pluginState?.loading) {
            e.preventDefault();
            triggerAutocomplete();
          }
        } catch { /* editor not ready */ }
      }
    }
    const editorDom = editor.view.dom;
    editorDom.addEventListener("keydown", handleKeyDown);
    return () => editorDom.removeEventListener("keydown", handleKeyDown);
  }, [editor, mounted, triggerAutocomplete]);

  return null;
}
