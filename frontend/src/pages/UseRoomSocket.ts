import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import type { RoomInfo } from "./liveRoom.types";

interface UseRoomSocketOptions {
  roomInfo: RoomInfo | null;
  onMessage: (message: any) => void;
}

interface UseRoomSocketResult {
  connected: boolean;
  sendMessage: (message: Record<string, unknown>) => void;
}

/*
 * Owns the WebSocket connection lifecycle: connects once roomInfo
 * is known, sends create_room/join_room on open, and forwards every
 * incoming message to `onMessage`.
 *
 * The connection effect only runs once (it depends on `roomInfo`,
 * which is set a single time). Its `ws.onmessage` callback is
 * therefore wired to whatever `onMessage` existed on that one
 * render - a classic React stale-closure bug. Routing every message
 * through a ref that's refreshed on every render guarantees the
 * handler always calls the latest `onMessage` (and therefore always
 * sees the latest state in the component that owns it).
 */
export function useRoomSocket({
  roomInfo,
  onMessage,
}: UseRoomSocketOptions): UseRoomSocketResult {
  const socketRef = useRef<WebSocket | null>(null);
  const messageHandlerRef = useRef<(message: any) => void>(() => {});

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    messageHandlerRef.current = onMessage;
  });

  useEffect(() => {
    if (!roomInfo) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Authentication token missing");

      return;
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
    console.log("socket url = ", SOCKET_URL);
    const ws = new WebSocket(`${SOCKET_URL}/${token}`);

    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");

      setConnected(true);

      if (roomInfo.mode === "create") {
        ws.send(
          JSON.stringify({
            action: "create_room",
            roomId: roomInfo.roomId,
            videoId: roomInfo.videoId,
          }),
        );
      } else {
        ws.send(
          JSON.stringify({
            action: "join_room",
            roomId: roomInfo.roomId,
          }),
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        messageHandlerRef.current(message);
      } catch (error) {
        console.error("Invalid WebSocket message", error);
      }
    };

    ws.onerror = () => {
      console.error("WebSocket error");

      toast.error("WebSocket connection error");
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");

      setConnected(false);
    };

    return () => {
      ws.close();

      socketRef.current = null;
    };
  }, [roomInfo]);

  function sendMessage(message: Record<string, unknown>) {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(message));
  }

  return { connected, sendMessage };
}
