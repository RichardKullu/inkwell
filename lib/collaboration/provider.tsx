"use client";

import { createContext, useContext, useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PresenceUser {
  name: string;
  color: string;
  cursorPos?: number;
}

interface CollaborationContextValue {
  broadcast: (event: string, payload: Record<string, unknown>) => void;
  onBroadcast: (event: string, callback: (payload: Record<string, unknown>) => void) => () => void;
  presenceUsers: PresenceUser[];
  updateCursorPosition: (pos: number) => void;
  currentUserName: string;
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
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

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

    // Track presence changes
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const users: PresenceUser[] = [];
      for (const [key, presences] of Object.entries(state)) {
        if (key === userName) continue; // Skip self
        const p = (presences as Record<string, unknown>[])[0];
        if (p) {
          users.push({
            name: p.name as string,
            color: p.color as string,
            cursorPos: p.cursorPos as number | undefined,
          });
        }
      }
      setPresenceUsers(users);
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

  const updateCursorPosition = useCallback((pos: number) => {
    channelRef.current?.track({ name: userName, color: userColor, cursorPos: pos });
    // Also broadcast for faster delivery (presence sync is slow)
    channelRef.current?.send({
      type: "broadcast",
      event: "cursor-move",
      payload: { senderName: userName, senderColor: userColor, pos },
    });
  }, [userName, userColor]);

  const value: CollaborationContextValue = {
    broadcast,
    onBroadcast,
    presenceUsers,
    updateCursorPosition,
    currentUserName: userName,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}
