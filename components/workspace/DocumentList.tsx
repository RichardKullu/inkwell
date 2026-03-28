"use client";

import { useRouter } from "next/navigation";

interface DocumentWithAuthor {
  id: string;
  title: string;
  updated_at: string;
  users?: { display_name: string };
}

interface DocumentListProps {
  documents: DocumentWithAuthor[];
  workspaceId: string;
}

export default function DocumentList({ documents, workspaceId }: DocumentListProps) {
  const router = useRouter();

  if (documents.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No documents yet. Create one from the sidebar.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <button
          key={doc.id}
          onClick={() => router.push(`/workspace/${workspaceId}/doc/${doc.id}`)}
          className="text-left rounded-lg border border-gray-200 bg-white p-5 hover:border-indigo-300 hover:shadow-sm transition"
        >
          <div className="font-medium text-gray-900 truncate">{doc.title}</div>
          <div className="mt-2 text-xs text-gray-400">
            {doc.users?.display_name} &middot;{" "}
            {new Date(doc.updated_at).toISOString().split("T")[0]}
          </div>
        </button>
      ))}
    </div>
  );
}
