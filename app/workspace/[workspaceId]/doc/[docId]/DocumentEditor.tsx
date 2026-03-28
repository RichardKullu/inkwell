"use client";

import { CollaborationProvider } from "@/lib/collaboration/provider";
import Editor from "@/components/editor/Editor";
import TopBar from "@/components/layout/TopBar";
import ShareDialog from "@/components/workspace/ShareDialog";
import { useState } from "react";

const USER_COLORS = [
  "#6c63ff", // indigo
  "#ff6b6b", // red
  "#51cf66", // green
  "#fcc419", // yellow
  "#339af0", // blue
  "#f06595", // pink
  "#20c997", // teal
  "#ff922b", // orange
  "#845ef7", // violet
  "#e64980", // magenta
  "#22b8cf", // cyan
  "#e8590c", // deep orange
];

function getColorForUser(name: string): string {
  // Better hash using djb2 algorithm
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) + hash + name.charCodeAt(i)) & 0xffffffff;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

interface DocumentEditorProps {
  docId: string;
  docTitle: string;
  workspaceId: string;
  userName: string;
  canEdit: boolean;
  initialContent?: string;
}

export default function DocumentEditor({ docId, docTitle, workspaceId, userName, canEdit, initialContent }: DocumentEditorProps) {
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
      <Editor editable={canEdit} docId={docId} initialContent={initialContent} />
      <ShareDialog
        workspaceId={workspaceId}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </CollaborationProvider>
  );
}
