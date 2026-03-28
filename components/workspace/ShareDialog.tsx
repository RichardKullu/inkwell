"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useCallback } from "react";
import type { UserRole, WorkspaceMember, User } from "@/types";

interface ShareDialogProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
}

export default function ShareDialog({ workspaceId, open, onClose }: ShareDialogProps) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("editor");
  const [members, setMembers] = useState<(WorkspaceMember & { user: User })[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from("workspace_members")
      .select("*, user:users(*)")
      .eq("workspace_id", workspaceId);
    if (data) setMembers(data as (WorkspaceMember & { user: User })[]);
  }, [supabase, workspaceId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    supabase
      .from("workspace_members")
      .select("*, user:users(*)")
      .eq("workspace_id", workspaceId)
      .then(({ data }) => {
        if (!cancelled && data) setMembers(data as (WorkspaceMember & { user: User })[]);
      });
    return () => { cancelled = true; };
  }, [open, supabase, workspaceId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { data: invitee } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (!invitee) {
      setError("User not found");
      return;
    }

    const { error: insertError } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: workspaceId, user_id: invitee.id, role });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setEmail("");
    loadMembers();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Share Workspace</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            Invite
          </button>
        </form>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium">{m.user.display_name}</div>
                <div className="text-xs text-gray-400">{m.user.email}</div>
              </div>
              <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded-full">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
