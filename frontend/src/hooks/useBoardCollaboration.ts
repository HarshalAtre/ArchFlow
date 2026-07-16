import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type {
  CollaborationClientEvents,
  CollaborationCursor,
  CollaborationGraph,
  CollaborationMode,
  CollaborationParticipant,
  CollaborationServerEvents,
  CollaborationStatus,
} from "../types/collaboration";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const updateDelayMs = 120;

type CollaborationSocket = Socket<
  CollaborationServerEvents,
  CollaborationClientEvents
>;

type UseBoardCollaborationOptions<T extends CollaborationGraph> = {
  boardId: string | null;
  enabled: boolean;
  graph: T;
  mode: CollaborationMode;
  onRemoteGraph: (graph: T) => void;
};

export function useBoardCollaboration<T extends CollaborationGraph>({
  boardId,
  enabled,
  graph,
  mode,
  onRemoteGraph,
}: UseBoardCollaborationOptions<T>) {
  const [participants, setParticipants] = useState<
    CollaborationParticipant[]
  >([]);
  const [status, setStatus] = useState<CollaborationStatus>("offline");
  const [remoteCursors, setRemoteCursors] = useState<CollaborationCursor[]>([]);
  const [error, setError] = useState("");
  const socketRef = useRef<CollaborationSocket | null>(null);
  const joinedRef = useRef(false);
  const lastRemoteGraphRef = useRef("");
  const lastSentGraphRef = useRef("");
  const onRemoteGraphRef = useRef(onRemoteGraph);

  onRemoteGraphRef.current = onRemoteGraph;

  useEffect(() => {
    if (!enabled || !boardId) {
      joinedRef.current = false;
      setParticipants([]);
      setRemoteCursors([]);
      setStatus("offline");
      setError("");
      return;
    }

    const socket: CollaborationSocket = io(API_URL, {
      autoConnect: false,
      withCredentials: true,
    });
    const room = { boardId, mode };

    socketRef.current = socket;
    setStatus("connecting");
    setError("");

    socket.on("connect", () => {
      socket.emit("collaboration:join", room, (result) => {
        if (!result.ok) {
          setStatus("error");
          setError(result.message);
          return;
        }

        joinedRef.current = true;
        setStatus("live");
      });
    });
    socket.on("collaboration:snapshot", (snapshot) => {
      if (snapshot.boardId !== boardId || snapshot.mode !== mode) {
        return;
      }

      const serializedGraph = JSON.stringify(snapshot.graph);
      lastRemoteGraphRef.current = serializedGraph;
      lastSentGraphRef.current = serializedGraph;
      onRemoteGraphRef.current(snapshot.graph as T);
    });
    socket.on("collaboration:presence", (nextParticipants) => {
      setParticipants(nextParticipants);
      const participantIds = new Set(nextParticipants.map(({ id }) => id));
      setRemoteCursors((current) =>
        current.filter(({ userId }) => participantIds.has(userId)),
      );
    });
    socket.on("collaboration:cursor", (cursor) => {
      setRemoteCursors((current) => [
        ...current.filter(({ userId }) => userId !== cursor.userId),
        cursor,
      ]);
    });
    socket.on("collaboration:error", (message) => {
      setStatus("error");
      setError(message);
    });
    socket.on("connect_error", (connectionError) => {
      setStatus("error");
      setError(connectionError.message || "Could not connect to live sync.");
    });
    socket.on("disconnect", () => {
      joinedRef.current = false;
      setParticipants([]);
      setRemoteCursors([]);
      setStatus("offline");
    });

    socket.connect();

    return () => {
      joinedRef.current = false;
      socket.emit("collaboration:leave");
      socket.disconnect();
      socketRef.current = null;
      setParticipants([]);
      setRemoteCursors([]);
      setStatus("offline");
    };
  }, [boardId, enabled, mode]);

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket || !joinedRef.current || !boardId) {
      return;
    }

    const serializedGraph = JSON.stringify(graph);

    if (serializedGraph === lastRemoteGraphRef.current) {
      lastRemoteGraphRef.current = "";
      return;
    }

    if (serializedGraph === lastSentGraphRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      lastSentGraphRef.current = serializedGraph;
      socket.emit(
        "collaboration:update",
        { boardId, graph, mode },
        (result) => {
          if (!result.ok) {
            setStatus("error");
            setError(result.message);
          }
        },
      );
    }, updateDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [boardId, graph, mode]);

  const sendCursor = useCallback(
    (x: number, y: number) => {
      const socket = socketRef.current;

      if (!socket || !joinedRef.current || !boardId) {
        return;
      }

      socket.emit("collaboration:cursor", { boardId, mode, x, y });
    },
    [boardId, mode],
  );

  return {
    error,
    participants,
    remoteCursors,
    sendCursor,
    status,
  };
}
