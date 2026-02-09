import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiClient,
  postMessageStream,
  type ConversationSummary,
  type MessageRecord,
  type StreamEvent,
} from "./api-client";

function App() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [loaderWord, setLoaderWord] = useState(0);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const LOADER_WORDS = ["Thinking...", "Searching...", "Reading your message...", "Checking context..."];

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiClient.api.chat.conversations.$get();
      const data = (await res.json()) as { conversations: ConversationSummary[] };
      setConversations(data.conversations);
    } catch {
      setError("Failed to load conversations");
    }
  }, []);

  const loadConversation = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.api.chat.conversations[":id"].$get({ param: { id } });
        const conv = (await res.json()) as { id: string; messages: MessageRecord[] };
        setMessages(conv.messages);
      } catch {
        setError("Failed to load conversation");
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    apiClient.api.health
      .$get()
      .then((r: Response) => r.json())
      .then(() => setHealthOk(true))
      .catch(() => setHealthOk(false));
  }, []);

  useEffect(() => {
    if (healthOk) loadConversations();
  }, [healthOk, loadConversations]);

  useEffect(() => {
    if (selectedId) {
      setMessages([]);
      loadConversation(selectedId);
    } else setMessages([]);
  }, [selectedId, loadConversation]);

  // Auto-scroll to bottom when messages or streaming content change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, streamingContent]);

  // Phase 6 bonus: rotate loader words while waiting for first chunk
  useEffect(() => {
    if (!streaming || streamingContent) return;
    const id = setInterval(() => {
      setLoaderWord((w) => (w + 1) % LOADER_WORDS.length);
    }, 1500);
    return () => clearInterval(id);
  }, [streaming, streamingContent]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || streaming) return;
    setInput("");
    setStreaming(true);
    setStreamingContent("");
    setLoaderWord(0);
    setError(null);
    // Optimistic user message so the user sees their message immediately
    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    postMessageStream(
      { content, conversationId: selectedId },
      {
        onEvent(ev: StreamEvent) {
          if (ev.type === "typing") {
            setStreamingContent("");
          } else if (ev.type === "chunk") {
            setStreamingContent((prev) => prev + ev.text);
          } else if (ev.type === "done") {
            setMessages((prev) => [
              ...prev,
              { id: ev.messageId, role: "assistant", content: ev.reply, createdAt: new Date().toISOString() },
            ]);
            setStreaming(false);
            setStreamingContent("");
            if (!selectedId) setSelectedId(ev.conversationId);
            loadConversations();
          } else if (ev.type === "error") {
            setError(ev.message || "Something went wrong");
            setStreaming(false);
            setStreamingContent("");
          }
        },
      }
    )
      .then(() => {
        setStreaming(false);
      })
      .catch(() => {
        setStreaming(false);
        setError("Failed to send message");
      });
  }, [input, selectedId, streaming, loadConversations]);

  const handleNewChat = useCallback(() => {
    setSelectedId(null);
    setMessages([]);
    setError(null);
  }, []);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiClient.api.chat.conversations[":id"].$delete({ param: { id } });
        if (selectedId === id) {
          setSelectedId(null);
          setMessages([]);
        }
        loadConversations();
      } catch {
        setError("Failed to delete conversation");
      }
    },
    [selectedId, loadConversations]
  );

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">AI Customer Support</h1>
        {healthOk === false && (
          <span className="rounded bg-amber-100 px-2 py-1 text-sm text-amber-800">API offline</span>
        )}
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-600">Conversations</span>
            <button
              type="button"
              onClick={handleNewChat}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              New chat
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 && !selectedId && (
              <li className="px-3 py-2 text-sm text-slate-500">No conversations yet. Send a message to start.</li>
            )}
            {conversations.map((c) => (
              <li key={c.id} className="group flex items-center gap-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`flex-1 truncate rounded-lg px-3 py-2 text-left text-sm ${
                    selectedId === c.id ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {c.messageCount} message{c.messageCount !== 1 ? "s" : ""}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteConversation(c.id)}
                  aria-label="Delete"
                  className="rounded p-1.5 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-red-600 group-hover:opacity-100"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex flex-1 flex-col min-h-0 bg-slate-50">
          {loading && (
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="text-slate-500">Loading conversation...</p>
            </div>
          )}
          {!loading && !selectedId && messages.length === 0 && (
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="text-slate-500">Start a new conversation by typing below.</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-800 shadow border border-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                </div>
              </div>
            ))}
            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl border border-slate-100 bg-white px-4 py-2.5 shadow">
                  {streamingContent ? (
                    <p className="whitespace-pre-wrap text-sm text-slate-800">{streamingContent}</p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-sm text-slate-500">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                      {LOADER_WORDS[loaderWord]}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          {error && (
            <div className="mx-4 mb-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                disabled={streaming}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export default App;
