import { createClient } from "@/lib/supabase/server";
import DocumentList from "@/components/workspace/DocumentList";

export default async function WorkspaceLandingPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("*, users!documents_created_by_fkey(display_name)")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <h2 className="text-xl font-semibold mb-6">Recent Documents</h2>
      <DocumentList documents={documents ?? []} workspaceId={workspaceId} />
    </div>
  );
}
