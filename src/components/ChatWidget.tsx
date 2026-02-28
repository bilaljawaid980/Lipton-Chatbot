import { FormEvent, useMemo, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; url: string }>;
  actions?: Array<{ type: "open_url" | "mailto"; label: string; url: string }>;
};

const apiBase = import.meta.env.VITE_RAG_API_BASE ?? "";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me anything about Lipton products, teas, and recipes. I’ll answer using scraped Lipton website content.",
    },
  ]);

  const canSend = input.trim().length > 0 && !isLoading;

  const endpoint = useMemo(() => {
    if (!apiBase) {
      return "/api/rag/answer";
    }
    return `${apiBase.replace(/\/$/, "")}/api/rag/answer`;
  }, []);

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || isLoading) {
      return;
    }

    setMessages((previous) => [...previous, { role: "user", content: question }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ question, topK: 4 }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as {
        answer: string;
        matches: Array<{ title: string; url: string }>;
        actions?: Array<{ type: "open_url" | "mailto"; label: string; url: string }>;
      };

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: payload.answer,
          sources: payload.matches?.slice(0, 3).map((match) => ({
            title: match.title,
            url: match.url,
          })),
          actions: payload.actions ?? [],
        },
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "I couldn’t connect to the RAG server. Start it with npm run rag:server and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.25 }}
            className="mb-4 w-80 h-96 bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="bg-primary px-4 py-3 flex items-center justify-between">
              <span className="text-primary-foreground font-semibold text-sm">Chat with AI</span>
              <button onClick={() => setIsOpen(false)} className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {message.content}
                    {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                      <div className="mt-2 border-t border-border pt-2 space-y-1">
                        {message.sources.map((source) => (
                          <a
                            key={`${source.url}-${source.title}`}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs underline underline-offset-2"
                          >
                            {source.title}
                          </a>
                        ))}
                      </div>
                    )}
                    {message.role === "assistant" && message.actions && message.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.actions.map((action) => (
                          <a
                            key={`${action.type}-${action.url}`}
                            href={action.url}
                            target={action.type === "open_url" ? "_blank" : undefined}
                            rel={action.type === "open_url" ? "noreferrer" : undefined}
                            className="text-xs px-2 py-1 rounded-md bg-background border border-border hover:bg-accent"
                          >
                            {action.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted text-foreground rounded-xl px-3 py-2 text-sm inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="border-t border-border p-3 flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!canSend}
                className="w-9 h-9 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 flex items-center justify-center"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        aria-label="Open chat"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default ChatWidget;
