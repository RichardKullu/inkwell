import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CreateWorkspaceForm from "@/components/workspace/CreateWorkspaceForm";
import type { Workspace } from "@/types";

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(*)")
    .eq("user_id", user.id);

  const workspaces = memberships?.map((m) => ({
    ...(m.workspaces as unknown as Workspace),
    role: m.role,
  })) ?? [];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-lg space-y-8 p-8">
        <h1 className="text-2xl font-bold">Your Workspaces</h1>

        {workspaces.length > 0 && (
          <div className="space-y-3">
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/workspace/${ws.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-indigo-300 transition"
              >
                <div className="font-medium">{ws.name}</div>
                <div className="text-sm text-gray-500 capitalize">{ws.role}</div>
              </Link>
            ))}
          </div>
        )}

        <CreateWorkspaceForm />
      </div>
    </div>
  );
}
