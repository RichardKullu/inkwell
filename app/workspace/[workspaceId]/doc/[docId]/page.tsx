import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DocumentEditor from "./DocumentEditor";

export default async function DocPage({
  params,
}: {
  params: Promise<{ workspaceId: string; docId: string }>;
}) {
  const { workspaceId, docId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, folder_id, workspace_id, title, content, created_by, updated_at, created_at")
    .eq("id", docId)
    .eq("workspace_id", workspaceId)
    .single();

  console.log("[DocPage] docId:", docId, "doc:", doc, "error:", docError);

  if (!doc || docError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Document not found. <a href={`/workspace/${workspaceId}`} className="text-indigo-600 underline">Go back</a></p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  const canEdit = membership?.role === "owner" || membership?.role === "editor";

  return (
    <DocumentEditor
      docId={doc.id}
      docTitle={doc.title}
      workspaceId={workspaceId}
      userName={profile?.display_name ?? "Anonymous"}
      canEdit={canEdit}
      initialContent={doc.content ?? ""}
    />
  );
}
