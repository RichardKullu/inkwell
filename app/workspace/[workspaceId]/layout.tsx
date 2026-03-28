import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/workspace/Sidebar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (!workspace) redirect("/workspace");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position");

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        workspace={workspace}
        folders={folders ?? []}
        documents={documents ?? []}
        userName={profile?.display_name ?? user.email?.split("@")[0] ?? "User"}
        userEmail={profile?.email ?? user.email ?? ""}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
