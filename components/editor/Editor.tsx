"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useCollaboration } from "@/lib/collaboration/provider";
import { createClient } from "@/lib/supabase/client";
import { SlashCommandExtension } from "@/extensions/slash-command";
import { AIAutocompleteExtension } from "@/extensions/ai-autocomplete";
import SlashCommand from "@/components/editor/SlashCommand";
import AIAutocomplete from "@/components/editor/AIAutocomplete";
import AIFloatingToolbar from "@/components/editor/AIFloatingToolbar";
import EditorToolbar from "./EditorToolbar";
import { useEffect, useRef, useCallback } from "react";

const lowlight = createLowlight(common);

interface EditorProps {
  editable?: boolean;
  docId: string;
  initialContent?: string;
}

export default function Editor({ editable = true, docId, initialContent }: EditorProps) {
  const { broadcast, onBroadcast } = useCollaboration();
  const supabase = createClient();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isRemoteUpdate = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    content: initialContent || "",
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: {
          openOnClick: false,
          HTMLAttributes: { class: "text-indigo-600 underline cursor-pointer" },
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing, or press / for commands...",
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full mx-auto" },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      SlashCommandExtension,
      AIAutocompleteExtension,
    ],
    editable,
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-[60vh]",
      },
    },
  });

  // Auto-save HTML content to Supabase
  const saveContent = useCallback(async () => {
    if (!editor) return;
    const html = editor.getHTML();
    if (html === "<p></p>" || !html) return;

    await supabase
      .from("documents")
      .update({ content: html, updated_at: new Date().toISOString() })
      .eq("id", docId);
  }, [editor, docId, supabase]);

  // Broadcast changes to other users via Supabase Realtime
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      // Don't broadcast if this update came from a remote user
      if (isRemoteUpdate.current) return;

      const html = editor.getHTML();
      broadcast("content-update", { html });

      // Debounced save to DB
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(saveContent, 3000);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveContent();
    };
  }, [editor, broadcast, saveContent]);

  // Listen for remote content updates
  useEffect(() => {
    if (!editor) return;

    const unsubscribe = onBroadcast("content-update", (payload) => {
      const remoteHtml = payload.html as string;
      const localHtml = editor.getHTML();

      // Only apply if content is actually different
      if (remoteHtml && remoteHtml !== localHtml) {
        // Save cursor position
        const { from, to } = editor.state.selection;

        isRemoteUpdate.current = true;
        editor.commands.setContent(remoteHtml, { emitUpdate: false });
        isRemoteUpdate.current = false;

        // Restore cursor position (clamped to new content length)
        const maxPos = editor.state.doc.content.size - 1;
        const safeFrom = Math.min(from, maxPos);
        const safeTo = Math.min(to, maxPos);
        try {
          editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
        } catch {
          // Position might be invalid after content change
        }
      }
    });

    return unsubscribe;
  }, [editor, onBroadcast]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto px-16 py-10 relative">
        <EditorContent editor={editor} />
        <SlashCommand editor={editor} />
        <AIAutocomplete editor={editor} />
        <AIFloatingToolbar editor={editor} />
      </div>
    </div>
  );
}
