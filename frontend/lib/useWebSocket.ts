"use client";
import { useEffect } from "react";

const BASE_WS = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/^http/, "ws");

export interface WsEvent {
  type:
    | "order.committed"
    | "order.revealed"
    | "order.matched"
    | "order.settled"
    | "iceberg.slice"
    | "iceberg.complete"
    | "arb.detected"
    | "news.signal";
  data: Record<string, unknown>;
  timestamp: number;
}

type WsHandler = (event: WsEvent) => void;

// Module-level singleton — shared across all hook instances
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const subscribers = new Set<WsHandler>();

function ensureConnected() {
  if (typeof window === "undefined") return;
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  try {
    ws = new WebSocket(`${BASE_WS}/ws`);

    ws.onmessage = (e) => {
      try {
        const event: WsEvent = JSON.parse(e.data as string);
        subscribers.forEach((h) => h(event));
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      ws = null;
      // Reconnect after 3s if there are active subscribers
      if (subscribers.size > 0) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(ensureConnected, 3000);
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  } catch {
    // WebSocket not available (SSR)
  }
}

export function useWebSocket(onEvent: WsHandler) {
  useEffect(() => {
    ensureConnected();
    subscribers.add(onEvent);
    return () => {
      subscribers.delete(onEvent);
    };
  }, [onEvent]);
}

// Expose live connection status for components that need it
export function isWsConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN;
}
