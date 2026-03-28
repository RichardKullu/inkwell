import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { createClient } from "@supabase/supabase-js";

const PORT = Number(process.env.PORT || process.env.YJS_WS_PORT || 1234);
const SAVE_INTERVAL = 5000; // Save every 5 seconds after last change

// Supabase client for persistence
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const messageSync = 0;
const messageAwareness = 1;

interface DocRoom {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
  saveTimer: ReturnType<typeof setTimeout> | null;
  loaded: boolean;
}

const rooms = new Map<string, DocRoom>();

// Use a separate text column instead of bytea to avoid encoding issues
// We store the Yjs state as a JSON array of numbers (lossless binary representation)

// Load doc state from Supabase
async function loadDoc(docId: string, doc: Y.Doc): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("yjs_state")
      .eq("id", docId)
      .single();

    if (error) {
      console.error(`[persistence] Load error for ${docId}:`, error.message);
      return;
    }

    if (data?.yjs_state) {
      try {
        const raw = data.yjs_state;
        let buffer: Uint8Array;

        if (typeof raw === "string") {
          // Try parsing as JSON array first (our new format)
          try {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              buffer = new Uint8Array(arr);
            } else {
              console.log(`[persistence] Unknown format for doc ${docId}, skipping`);
              return;
            }
          } catch {
            // Not JSON — try hex format (\\x prefix from bytea)
            if (raw.startsWith("\\x")) {
              buffer = new Uint8Array(Buffer.from(raw.slice(2), "hex"));
            } else {
              // Try base64
              buffer = new Uint8Array(Buffer.from(raw, "base64"));
            }
          }
        } else {
          buffer = new Uint8Array(raw);
        }

        if (buffer.length > 2) {
          Y.applyUpdate(doc, buffer);
          console.log(`[persistence] Loaded doc ${docId} (${buffer.length} bytes)`);
        } else {
          console.log(`[persistence] Doc ${docId} has empty state, skipping`);
        }
      } catch (parseErr) {
        console.error(`[persistence] Parse error for doc ${docId}:`, parseErr);
      }
    } else {
      console.log(`[persistence] No saved state for doc ${docId}`);
    }
  } catch (err) {
    console.error(`[persistence] Failed to load doc ${docId}:`, err);
  }
}

// Save doc state to Supabase
async function saveDoc(docId: string, doc: Y.Doc): Promise<void> {
  try {
    const state = Y.encodeStateAsUpdate(doc);

    if (state.length <= 2) {
      console.log(`[persistence] Doc ${docId} is empty, skipping save`);
      return;
    }

    // Store as JSON array of numbers — lossless, no encoding issues
    const jsonArray = JSON.stringify(Array.from(state));

    const { error } = await supabase
      .from("documents")
      .update({
        yjs_state: jsonArray,
        updated_at: new Date().toISOString(),
      })
      .eq("id", docId);

    if (error) {
      console.error(`[persistence] Failed to save doc ${docId}:`, error.message);
    } else {
      console.log(`[persistence] Saved doc ${docId} (${state.length} bytes)`);
    }
  } catch (err) {
    console.error(`[persistence] Save error for ${docId}:`, err);
  }
}

// Schedule a debounced save
function scheduleSave(docId: string, room: DocRoom) {
  if (room.saveTimer) clearTimeout(room.saveTimer);
  room.saveTimer = setTimeout(() => {
    saveDoc(docId, room.doc);
    room.saveTimer = null;
  }, SAVE_INTERVAL);
}

async function getRoom(name: string): Promise<DocRoom> {
  if (!rooms.has(name)) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    const room: DocRoom = { doc, awareness, conns: new Map(), saveTimer: null, loaded: false };

    // Load persisted state
    await loadDoc(name, doc);
    room.loaded = true;

    // Listen for doc updates to broadcast + persist
    doc.on("update", (update: Uint8Array, origin: WebSocket | null) => {
      // Broadcast update to all clients except the one that sent it
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      room.conns.forEach((_, c) => {
        if (c !== origin && c.readyState === WebSocket.OPEN) {
          c.send(message);
        }
      });

      scheduleSave(name, room);
    });

    awareness.on("update", ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
      const message = encoding.toUint8Array(encoder);

      room.conns.forEach((_, c) => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(message);
        }
      });
    });

    rooms.set(name, room);
  }
  return rooms.get(name)!;
}

// HTTP server for health checks (required by Render/hosting)
import { createServer } from "http";

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", rooms: rooms.size }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Allowed origins for CORS
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"];

const wss = new WebSocketServer({
  server: httpServer,
  verifyClient: ({ origin }, callback) => {
    // Allow connections without origin (e.g., from server-side tools)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(true);
    } else {
      console.warn(`[auth] Rejected connection from origin: ${origin}`);
      callback(false, 403, "Forbidden origin");
    }
  },
});

// Authenticate WebSocket connections via Supabase JWT
async function authenticateWs(req: import("http").IncomingMessage): Promise<string | null> {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return user.id;
}

wss.on("connection", async (ws, req) => {
  // Authenticate the user
  const userId = await authenticateWs(req);
  if (!userId) {
    console.warn("[auth] Unauthenticated WebSocket connection rejected");
    ws.close(4001, "Authentication required");
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  // Extract just the doc ID — strip any query params from the path
  // y-websocket sends room name as the URL path, which may include ?token=...
  const rawPath = url.pathname.slice(1);
  const roomName = rawPath.split("?")[0] || "default";
  console.log(`[ws] Connection from user ${userId}, room: ${roomName}, raw path: ${rawPath}`);

  // Verify user has access to this document's workspace
  const { data: doc } = await supabase
    .from("documents")
    .select("workspace_id")
    .eq("id", roomName)
    .single();

  if (doc) {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", doc.workspace_id)
      .eq("user_id", userId)
      .single();

    if (!membership) {
      console.warn(`[auth] User ${userId} not authorized for doc ${roomName}`);
      ws.close(4003, "Not authorized for this document");
      return;
    }
  }

  const room = await getRoom(roomName);
  const controlledIds = new Set<number>();
  room.conns.set(ws, controlledIds);

  // Send sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, room.doc);
  ws.send(encoding.toUint8Array(encoder));

  // Send awareness states
  const awarenessStates = room.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(awarenessStates.keys()))
    );
    ws.send(encoding.toUint8Array(awarenessEncoder));
  }

  ws.on("message", (data: ArrayBuffer) => {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(data));
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case messageSync: {
          const syncEncoder = encoding.createEncoder();
          encoding.writeVarUint(syncEncoder, messageSync);
          syncProtocol.readSyncMessage(decoder, syncEncoder, room.doc, ws);
          const reply = encoding.toUint8Array(syncEncoder);
          if (encoding.length(syncEncoder) > 1) {
            ws.send(reply);
          }
          break;
        }
        case messageAwareness: {
          const update = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws);
          break;
        }
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  ws.on("close", async () => {
    const controlled = room.conns.get(ws);
    room.conns.delete(ws);

    if (controlled) {
      awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(controlled), null);
    }

    // Save and cleanup when last client disconnects
    if (room.conns.size === 0) {
      if (room.saveTimer) clearTimeout(room.saveTimer);
      await saveDoc(roomName, room.doc);
      room.doc.destroy();
      rooms.delete(roomName);
      console.log(`[room] Cleaned up room ${roomName}`);
    }
  });
});

// Keep-alive: ping all connected WebSocket clients every 30 seconds
// Prevents Render free tier from killing the process due to "inactivity"
const PING_INTERVAL = 30_000;
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, PING_INTERVAL);

// Self-ping: hit own health endpoint to keep Render from spinning down
const SELF_PING_INTERVAL = 5 * 60_000; // Every 5 minutes
setInterval(() => {
  const url = process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL}/health`
    : `http://localhost:${PORT}/health`;
  fetch(url).catch(() => {});
  console.log("[keepalive] Self-ping sent");
}, SELF_PING_INTERVAL);

// Save all docs on server shutdown (handle both SIGINT and SIGTERM)
async function gracefulShutdown(signal: string) {
  console.log(`[${signal}] Saving all docs before shutdown...`);
  const saves = Array.from(rooms.entries()).map(([id, room]) => saveDoc(id, room.doc));
  await Promise.all(saves);
  process.exit(0);
}
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught errors to prevent crashes
process.on("uncaughtException", (err) => {
  console.error("[error] Uncaught exception:", err.message);
});
process.on("unhandledRejection", (err) => {
  console.error("[error] Unhandled rejection:", err);
});

httpServer.listen(PORT, () => {
  console.log(`y-websocket server running on port ${PORT} (with Supabase persistence)`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
