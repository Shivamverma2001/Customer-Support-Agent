import type { AppType } from "api/rpc";
import { hc } from "hono/client";

/**
 * Type-safe API client (Hono RPC).
 * In dev, Vite proxies /api to the backend.
 */
const baseUrl = typeof window !== "undefined" ? "" : "http://localhost:3000";

export interface ApiClientShape {
  api: {
    health: { $get: () => Promise<Response> };
    chat: {
      conversations: {
        $get: () => Promise<Response>;
        ":id": {
          $get: (opts: { param: { id: string } }) => Promise<Response>;
          $delete: (opts: { param: { id: string } }) => Promise<Response>;
        };
      };
    };
  };
}

export const apiClient = hc<AppType>(baseUrl) as unknown as ApiClientShape;

// ——— Types for chat (match API responses)
export interface ConversationSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface MessageRecord {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: MessageRecord[];
}

export type StreamEvent =
  | { type: "typing" }
  | { type: "chunk"; text: string }
  | { type: "done"; conversationId: string; messageId: string; reply: string }
  | { type: "error"; code?: number; message: string };

/**
 * POST /api/chat/messages/stream — consume NDJSON stream and call onEvent for each event.
 */
export async function postMessageStream(
  body: { content: string; conversationId?: string | null },
  options: {
    onEvent: (event: StreamEvent) => void;
    signal?: AbortSignal;
  }
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/chat/messages/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: body.content,
      conversationId: body.conversationId ?? null,
    }),
    signal: options.signal,
  });
  if (!res.ok) {
    options.onEvent({ type: "error", code: res.status, message: res.statusText });
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    options.onEvent({ type: "error", code: 500, message: "No response body" });
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed) as StreamEvent;
          options.onEvent(event);
        } catch {
          // skip malformed line
        }
      }
    }
    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer.trim()) as StreamEvent;
        options.onEvent(event);
      } catch {
        // skip
      }
    }
  } finally {
    reader.releaseLock();
  }
}
