"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useCollaboration } from "@/lib/collaboration/provider";

interface RemoteCursorsProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface CursorData {
  name: string;
  color: string;
  top: number;
  left: number;
  height: number;
}

export default function RemoteCursors({ editor, containerRef }: RemoteCursorsProps) {
  const { onBroadcast, updateCursorPosition } = useCollaboration();
  const [cursors, setCursors] = useState<CursorData[]>([]);
  const remotePosRef = useRef<Map<string, { name: string; color: string; pos: number }>>(new Map());

  // Send own cursor position on selection change
  useEffect(() => {
    if (!editor) return;

    let isReady = false;
    try { isReady = !!editor.view?.dom; } catch { isReady = false; }
    if (!isReady) return;

    const handleSelectionUpdate = () => {
      const { from } = editor.state.selection;
      updateCursorPosition(from);
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    handleSelectionUpdate();

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, updateCursorPosition]);

  // Convert doc positions to screen coordinates
  const recalcPositions = useCallback(() => {
    let isReady = false;
    try { isReady = !!editor?.view?.dom; } catch { isReady = false; }
    if (!isReady || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newCursors: CursorData[] = [];

    remotePosRef.current.forEach((remote) => {
      try {
        const pos = Math.min(Math.max(remote.pos, 0), editor.state.doc.content.size - 1);
        const coords = editor.view.coordsAtPos(pos);
        const lineHeight = coords.bottom - coords.top;

        newCursors.push({
          name: remote.name,
          color: remote.color,
          top: coords.top - containerRect.top + container.scrollTop,
          left: coords.left - containerRect.left + container.scrollLeft,
          height: lineHeight || 20,
        });
      } catch {
        // Invalid position
      }
    });

    setCursors(newCursors);
  }, [editor, containerRef]);

  // Listen for cursor broadcasts
  useEffect(() => {
    if (!editor) return;

    const unsubscribe = onBroadcast("cursor-move", (payload) => {
      const senderName = payload.senderName as string;
      const senderColor = payload.senderColor as string;
      const pos = payload.pos as number;

      if (!senderName || pos === undefined) return;

      remotePosRef.current.set(senderName, { name: senderName, color: senderColor, pos });
      recalcPositions();
    });

    return unsubscribe;
  }, [editor, onBroadcast, recalcPositions]);

  // Recalc on scroll and editor content changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => recalcPositions();
    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [containerRef, recalcPositions]);

  // Recalc when editor content updates (formatting changes shift coordinates)
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      // Small delay to let the DOM settle after content/format changes
      requestAnimationFrame(() => recalcPositions());
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor, recalcPositions]);

  if (cursors.length === 0) return null;

  return (
    <>
      {cursors.map((cursor) => (
        <div
          key={cursor.name}
          className="absolute pointer-events-none z-10"
          style={{
            top: cursor.top,
            left: cursor.left,
            transition: "top 0.12s ease-out, left 0.12s ease-out",
          }}
        >
          <div
            className="w-0.5 rounded-full"
            style={{ height: cursor.height, backgroundColor: cursor.color }}
          />
          <div
            className="absolute left-0 px-1.5 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap"
            style={{ top: -18, backgroundColor: cursor.color }}
          >
            {cursor.name}
          </div>
        </div>
      ))}
    </>
  );
}
