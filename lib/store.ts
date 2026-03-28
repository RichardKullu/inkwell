import { create } from "zustand";
import type { Document, Folder, Workspace } from "@/types";

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  folders: Folder[];
  documents: Document[];
  activeDocId: string | null;
  sidebarOpen: boolean;
  searchQuery: string;

  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setFolders: (folders: Folder[]) => void;
  setDocuments: (documents: Document[]) => void;
  setActiveDocId: (id: string | null) => void;
  toggleSidebar: () => void;
  setSearchQuery: (query: string) => void;

  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  removeFolder: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  folders: [],
  documents: [],
  activeDocId: null,
  sidebarOpen: true,
  searchQuery: "",

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setFolders: (folders) => set({ folders }),
  setDocuments: (documents) => set({ documents }),
  setActiveDocId: (id) => set({ activeDocId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSearchQuery: (query) => set({ searchQuery: query }),

  addDocument: (doc) => set((s) => ({ documents: [...s.documents, doc] })),
  updateDocument: (id, updates) =>
    set((s) => ({
      documents: s.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
  removeDocument: (id) =>
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
  addFolder: (folder) => set((s) => ({ folders: [...s.folders, folder] })),
  updateFolder: (id, updates) =>
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),
  removeFolder: (id) =>
    set((s) => ({ folders: s.folders.filter((f) => f.id !== id) })),
}));
