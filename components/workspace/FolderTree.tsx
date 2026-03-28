"use client";

import { createClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/store";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import type { Document, Folder } from "@/types";

interface FolderTreeProps {
  folders: Folder[];
  documents: Document[];
  workspaceId: string;
}

export default function FolderTree({ folders, documents, workspaceId }: FolderTreeProps) {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const { addFolder } = useWorkspaceStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  function toggleFolder(folderId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;

    const { data: folder } = await supabase
      .from("folders")
      .insert({
        workspace_id: workspaceId,
        name: newFolderName.trim(),
        position: folders.length,
      })
      .select()
      .single();

    if (folder) {
      addFolder(folder);
      setNewFolderName("");
      setCreatingFolder(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-gray-500">Folders</div>
        <button
          onClick={() => setCreatingFolder(true)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          +
        </button>
      </div>

      {creatingFolder && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }}
          className="mb-2"
        >
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => { if (!newFolderName.trim()) setCreatingFolder(false); }}
            placeholder="Folder name"
            className="w-full bg-gray-800 rounded px-2 py-1 text-sm text-gray-300 outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </form>
      )}

      {folders.map((folder) => {
        const folderDocs = documents.filter((d) => d.folder_id === folder.id);
        const isExpanded = expandedFolders.has(folder.id);

        return (
          <div key={folder.id}>
            <button
              onClick={() => toggleFolder(folder.id)}
              className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-gray-800/50 flex items-center gap-1.5 transition"
            >
              <span className="text-xs">{isExpanded ? "\u25BE" : "\u25B8"}</span>
              {folder.name}
              <span className="text-xs text-gray-600 ml-auto">{folderDocs.length}</span>
            </button>
            {isExpanded && (
              <div className="ml-4">
                {folderDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => router.push(`/workspace/${workspaceId}/doc/${doc.id}`)}
                    className={`w-full text-left px-2 py-1 text-sm rounded-md transition ${
                      params.docId === doc.id
                        ? "bg-gray-800 text-white"
                        : "hover:bg-gray-800/50 text-gray-400"
                    }`}
                  >
                    {doc.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
