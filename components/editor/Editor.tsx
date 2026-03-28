"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Collaboration from "@tiptap/extension-collaboration";
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
  const { ydoc, provider } = useCollaboration();
  const supabase = createClient();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hasLoadedRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        undoRedo: false,
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
      Collaboration.configure({
        fragment: ydoc.getXmlFragment("default"),
      }),
      SlashCommandExtension,
      AIAutocompleteExtension,
    ],
    editable,
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-[60vh]",
      },
    },
  }, [provider]);

  // Load initial content from Supabase if editor is empty after mount
  useEffect(() => {
    if (!editor || hasLoadedRef.current) return;

    const timeout = setTimeout(() => {
      if (editor.isEmpty && initialContent) {
        editor.commands.setContent(initialContent);
        hasLoadedRef.current = true;
      } else {
        hasLoadedRef.current = true;
      }
    }, 1500); // Wait for Yjs sync to potentially load content first

    return () => clearTimeout(timeout);
  }, [editor, initialContent]);

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

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(saveContent, 3000);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      // Save on unmount
      saveContent();
    };
  }, [editor, saveContent]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto px-16 py-10">
        <EditorContent editor={editor} />
        <SlashCommand editor={editor} />
        <AIAutocomplete editor={editor} />
        <AIFloatingToolbar editor={editor} />
      </div>
    </div>
  );
}
