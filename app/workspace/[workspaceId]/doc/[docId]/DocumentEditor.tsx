"use client";

import { CollaborationProvider } from "@/lib/collaboration/provider";
import Editor from "@/components/editor/Editor";
import TopBar from "@/components/layout/TopBar";
import ShareDialog from "@/components/workspace/ShareDialog";
import { useState } from "react";

const USER_COLORS = ["#6c63ff", "#ff6b6b", "#51cf66", "#fcc419", "#339af0", "#f06595"];

function getColorForUser(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

interface DocumentEditorProps {
  docId: string;
  docTitle: string;
  workspaceId: string;
  userName: string;
  canEdit: boolean;
}

export default function DocumentEditor({ docId, docTitle, workspaceId, userName, canEdit }: DocumentEditorProps) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <CollaborationProvider
      docId={docId}
      userName={userName}
      userColor={getColorForUser(userName)}
    >
      <TopBar
        docId={docId}
        title={docTitle}
        onShareClick={() => setShareOpen(true)}
      />
      <Editor editable={canEdit} />
      <ShareDialog
        workspaceId={workspaceId}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </CollaborationProvider>
  );
}
