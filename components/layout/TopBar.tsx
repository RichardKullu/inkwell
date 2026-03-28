"use client";

import { createClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/store";
import PresenceAvatars from "./PresenceAvatars";
import { useState, useEffect, useRef } from "react";

interface TopBarProps {
  docId: string;
  title: string;
  onShareClick?: () => void;
}

export default function TopBar({ docId, title: initialTitle, onShareClick }: TopBarProps) {
  const supabase = createClient();
  const { updateDocument, toggleSidebar } = useWorkspaceStore();
  const [title, setTitle] = useState(initialTitle);
  const [saved, setSaved] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    setSaved(false);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await supabase
        .from("documents")
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq("id", docId);
      updateDocument(docId, { title: newTitle });
      setSaved(true);
    }, 500);
  }

  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          ☰
        </button>
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="font-semibold text-[15px] bg-transparent border-none outline-none focus:ring-0 w-64"
        />
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {saved ? "Saved" : "Saving..."}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <PresenceAvatars />
        <button
          onClick={onShareClick}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
        >
          Share
        </button>
      </div>
    </div>
  );
}
