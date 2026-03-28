"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Collaboration from "@tiptap/extension-collaboration";
import { common, createLowlight } from "lowlight";
import { useCollaboration } from "@/lib/collaboration/provider";
import { SlashCommandExtension } from "@/extensions/slash-command";
import { AIAutocompleteExtension } from "@/extensions/ai-autocomplete";
import SlashCommand from "@/components/editor/SlashCommand";
import AIAutocomplete from "@/components/editor/AIAutocomplete";
import AIFloatingToolbar from "@/components/editor/AIFloatingToolbar";
import EditorToolbar from "./EditorToolbar";

const lowlight = createLowlight(common);

interface EditorProps {
  editable?: boolean;
}

export default function Editor({ editable = true }: EditorProps) {
  const { ydoc, provider } = useCollaboration();

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
