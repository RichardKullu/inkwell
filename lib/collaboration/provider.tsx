"use client";

import { createContext, useContext, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface CollaborationContextValue {
  broadcast: (event: string, payload: Record<string, unknown>) => void;
  onBroadcast: (event: string, callback: (payload: Record<string, unknown>) => void) => () => void;
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
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const listenersRef = useRef<Map<string, Set<(payload: Record<string, unknown>) => void>>>(new Map());

  useEffect(() => {
    const ch = supabase.channel(`doc:${docId}`, {
      config: { presence: { key: userName } },
    });

    ch.on("broadcast", { event: "*" }, ({ event, payload }) => {
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        listeners.forEach((cb) => cb(payload as Record<string, unknown>));
      }
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.track({ name: userName, color: userColor });
      }
    });

    channelRef.current = ch;

    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [docId, userName, userColor, supabase]);

  const broadcast = useCallback((event: string, payload: Record<string, unknown>) => {
    channelRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  const onBroadcast = useCallback((event: string, callback: (payload: Record<string, unknown>) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    return () => {
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  const value: CollaborationContextValue = {
    broadcast,
    onBroadcast,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}
