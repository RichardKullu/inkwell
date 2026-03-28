"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { createClient } from "@/lib/supabase/client";

interface CollaborationContextValue {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  isConnected: boolean;
}

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

export function useCollaboration() {
  const ctx = useContext(CollaborationContext);
  if (!ctx) throw new Error("useCollaboration must be used within CollaborationProvider");
  return ctx;
}

interface CollaborationProviderProps {
  docId: string;
  userName: string;
  userColor: string;
  children: React.ReactNode;
}

export function CollaborationProvider({ docId, userName, userColor, children }: CollaborationProviderProps) {
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [isConnected, setIsConnected] = useState(false);
  const [wsProvider, setWsProvider] = useState<WebsocketProvider | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_YJS_WS_URL;
    if (!wsUrl) {
      console.error("NEXT_PUBLIC_YJS_WS_URL environment variable is required");
      return;
    }

    // Get auth token and connect with it
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token || "";

      // y-websocket WebsocketProvider expects (serverUrl, roomName, ydoc)
      // We pass the auth token via the URL params
      const provider = new WebsocketProvider(wsUrl, `${docId}?token=${token}`, ydoc);

      provider.awareness.setLocalStateField("user", {
        name: userName,
        color: userColor,
      });

      provider.on("status", ({ status }: { status: string }) => {
        setIsConnected(status === "connected");
      });

      setWsProvider(provider);
    });

    return () => {
      // Cleanup on unmount
    };
  }, [docId, ydoc, userName, userColor]);

  // Cleanup provider on unmount or change
  useEffect(() => {
    return () => {
      if (wsProvider) {
        wsProvider.destroy();
      }
    };
  }, [wsProvider]);

  return (
    <CollaborationContext.Provider value={{ ydoc, provider: wsProvider, isConnected }}>
      {children}
    </CollaborationContext.Provider>
  );
}
