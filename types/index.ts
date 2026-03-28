export type UserRole = "owner" | "editor" | "viewer";

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: UserRole;
  user?: User;
}

export interface Folder {
  id: string;
  workspace_id: string;
  name: string;
  position: number;
}

export interface Document {
  id: string;
  folder_id: string | null;
  workspace_id: string;
  title: string;
  created_by: string;
  updated_at: string;
  created_at: string;
}

export interface AIAction {
  type: "autocomplete" | "rewrite" | "shorten" | "lengthen" | "grammar" | "tone";
  tone?: "formal" | "casual";
  text: string;
  context?: string;
}
