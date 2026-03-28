"use client";

import { createClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/lib/store";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import FolderTree from "./FolderTree";
import type { Document, Folder, Workspace } from "@/types";

interface SidebarProps {
  workspace: Workspace;
  folders: Folder[];
  documents: Document[];
}

export default function Sidebar({ workspace, folders: initialFolders, documents: initialDocs }: SidebarProps) {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const {
    sidebarOpen,
    searchQuery,
    setSearchQuery,
    setCurrentWorkspace,
    setFolders,
    setDocuments,
    folders,
    documents,
    addDocument,
  } = useWorkspaceStore();

  useEffect(() => {
    setCurrentWorkspace(workspace);
    setFolders(initialFolders);
    setDocuments(initialDocs);
  }, [workspace, initialFolders, initialDocs, setCurrentWorkspace, setFolders, setDocuments]);

  async function handleNewDoc() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: doc } = await supabase
      .from("documents")
      .insert({
        workspace_id: workspace.id,
        title: "Untitled",
        created_by: user.id,
      })
      .select()
      .single();

    if (doc) {
      addDocument(doc);
      router.push(`/workspace/${workspace.id}/doc/${doc.id}`);
    }
  }

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentDocs = filteredDocs.slice(0, 8);

  if (!sidebarOpen) return null;

  return (
    <aside className="w-60 bg-gray-900 text-gray-300 flex flex-col h-full flex-shrink-0">
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="text-white font-bold text-lg">{workspace.name}</div>

        <input
          type="text"
          placeholder="Search docs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md bg-gray-800 border-none px-3 py-2 text-sm text-gray-300 placeholder-gray-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />

        <button
          onClick={handleNewDoc}
          className="w-full text-left px-2 py-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition"
        >
          + New Document
        </button>

        <FolderTree
          folders={folders}
          documents={filteredDocs}
          workspaceId={workspace.id}
        />

        <div>
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
            Recent
          </div>
          {recentDocs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => router.push(`/workspace/${workspace.id}/doc/${doc.id}`)}
              className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition ${
                params.docId === doc.id
                  ? "bg-gray-800 text-white"
                  : "hover:bg-gray-800/50"
              }`}
            >
              {doc.title}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
