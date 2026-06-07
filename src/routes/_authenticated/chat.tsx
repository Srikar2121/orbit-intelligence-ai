import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Plus, ArrowLeft, Menu, Brain, Zap, Code2, LogOut, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Blobs } from "@/components/Blobs";
import { useServerFn } from "@tanstack/react-start";
import { listThreads, createThread, deleteThread, loadMessages, saveMessage } from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


type Mode = "default" | "genz" | "codey";

const MODES: { id: Mode; label: string; sub: string; icon: any; emoji: string }[] = [
  { id: "default", label: "Default", sub: "for the nerds", icon: Brain, emoji: "🧠" },
  { id: "genz", label: "Gen-Z", sub: "for humans", icon: Zap, emoji: "✨" },
  { id: "codey", label: "Codey", sub: "for Elon & Bezos", icon: Code2, emoji: "🚀" },
];

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat · OrbitIntelligenceAI" },
      { name: "description", content: "Chat with OrbitIntelligenceAI — created by Srikar." },
    ],
  }),
  component: ChatPage,
});

type Msg = { id: string; role: "user" | "ai"; text: string };

const WELCOME: Record<Mode, string> = {
  default: "Hi. I'm OrbitIntelligenceAI in Default mode — precise, structured, nerd-approved. What can I analyze for you?",
  genz: "hey 💜 orbit here in Gen-Z mode — casual but actually useful. what are we figuring out?",
  codey: "OrbitIntelligence online. Codey mode engaged. Think bigger. Ship faster. What are we building? 🚀",
};

type Thread = { id: string; title: string; mode: string; updated_at: string };

function ChatPage() {
  const navigate = useNavigate();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const remove = useServerFn(deleteThread);
  const load = useServerFn(loadMessages);
  const save = useServerFn(saveMessage);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("genz");
  const [messages, setMessages] = useState<Msg[]>([{ id: "w", role: "ai", text: WELCOME["genz"] }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const refreshThreads = useCallback(async () => {
    try {
      const rows = await list();
      setThreads(rows as Thread[]);
      return rows as Thread[];
    } catch {
      return [];
    }
  }, [list]);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  const openThread = async (id: string) => {
    setActiveId(id);
    const t = threads.find((x) => x.id === id);
    if (t) setMode(t.mode as Mode);
    try {
      const rows = (await load({ data: { threadId: id } })) as { id: string; role: "user" | "assistant"; content: string }[];
      setMessages(
        rows.length
          ? rows.map((r) => ({ id: r.id, role: r.role === "assistant" ? "ai" : "user", text: r.content }))
          : [{ id: "w" + id, role: "ai", text: WELCOME[(t?.mode as Mode) ?? "genz"] }],
      );
    } catch {
      toast.error("Couldn't load this conversation.");
    }
  };

  const newChat = (m: Mode = mode) => {
    setActiveId(null);
    setMessages([{ id: "w" + Date.now(), role: "ai", text: WELCOME[m] }]);
  };

  const removeThread = async (id: string) => {
    try {
      await remove({ data: { id } });
      if (activeId === id) newChat(mode);
      setThreads((t) => t.filter((x) => x.id !== id));
    } catch {
      toast.error("Couldn't delete chat.");
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setMessages((prev) => [
      ...prev,
      { id: "sys" + Date.now(), role: "ai", text: `⚡ Switched to ${MODES.find((x) => x.id === m)?.label} mode — ${MODES.find((x) => x.id === m)?.sub}.` },
    ]);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        newChat(mode);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;

    let threadId = activeId;
    if (!threadId) {
      try {
        const t = (await create({ data: { title: text.slice(0, 60), mode } })) as Thread;
        threadId = t.id;
        setActiveId(t.id);
        setThreads((prev) => [t, ...prev]);
      } catch {
        toast.error("Couldn't start chat.");
        return;
      }
    }

    const userMsg: Msg = { id: String(Date.now()), role: "user", text };
    const aiId = "a" + Date.now();
    setMessages((m) => [...m, userMsg, { id: aiId, role: "ai", text: "" }]);
    setInput("");
    setTyping(true);

    // Persist user message
    save({ data: { threadId, role: "user", content: text } }).catch(() => {});

    try {
      const history = [...messages, userMsg]
        .filter((m) => !m.id.startsWith("w") && !m.id.startsWith("sys"))
        .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));

      const resp = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, mode }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        setMessages((m) => m.map((x) => (x.id === aiId ? { ...x, text: `⚠️ ${err.error || "Something went wrong."}` } : x)));
        setTyping(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { done = true; break; }
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) => m.map((x) => (x.id === aiId ? { ...x, text: acc } : x)));
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (acc && threadId) {
        save({ data: { threadId, role: "assistant", content: acc } }).catch(() => {});
        refreshThreads();
      }
    } catch (e) {
      console.error(e);
      setMessages((m) => m.map((x) => (x.id === aiId ? { ...x, text: "⚠️ Network error. Try again." } : x)));
    } finally {
      setTyping(false);
    }
  };


  return (
    <div className={`relative min-h-screen flex flex-col mode-${mode} transition-colors duration-500`}>
      <Blobs variant={mode} />

      {/* Top bar */}
      <header className="sticky top-0 z-40 px-3 sm:px-4 pt-3">
        <div className="glass rounded-2xl px-3 sm:px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="md:hidden h-9 w-9 grid place-items-center rounded-xl glass" onClick={() => setSidebar(!sidebar)}>
              <Menu className="h-4 w-4" />
            </button>
            <Link to="/" className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl glass hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl grid place-items-center neon-glow" style={{ background: 'var(--gradient-neon)' }}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold gradient-text">OrbitIntelligenceAI</div>
                <div className="text-[10px] text-muted-foreground">by Srikar · ⌘K new chat</div>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1 glass rounded-full p-1">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button key={m.id} onClick={() => switchMode(m.id)}
                  title={m.sub}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${active ? 'text-white neon-glow' : 'text-muted-foreground hover:text-white'}`}
                  style={active ? { background: 'var(--gradient-neon)' } : undefined}>
                  <Icon className="h-3.5 w-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>
          <div className="md:hidden">
            <select value={mode} onChange={(e) => switchMode(e.target.value as Mode)}
              className="glass rounded-full px-3 py-1.5 text-xs font-semibold bg-transparent outline-none">
              {MODES.map((m) => (
                <option key={m.id} value={m.id} className="bg-background">{m.emoji} {m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="flex-1 grid md:grid-cols-[280px_1fr] gap-3 p-3 sm:p-4 min-h-0">
        {/* Sidebar */}
        <aside className={`glass rounded-2xl p-3 ${sidebar ? 'block' : 'hidden'} md:block`}>
          <button onClick={() => resetChat(mode)}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white flex items-center gap-2 justify-center neon-glow"
            style={{ background: 'var(--gradient-neon)' }}>
            <Plus className="h-4 w-4" /> New chat
          </button>
          <div className="mt-3 space-y-1 scrollbar-thin overflow-auto">
            {history.map((t, i) => (
              <button key={t} onClick={() => setActive(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition ${i === active ? 'bg-white/10' : 'hover:bg-white/5 text-muted-foreground'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 text-[10px] text-muted-foreground text-center">
            Crafted with 💜 by <span className="gradient-text font-semibold">Srikar</span>
          </div>
        </aside>

        {/* Conversation */}
        <section className="glass rounded-2xl flex flex-col min-h-0 gradient-border">
          <div ref={scroller} className="flex-1 overflow-auto scrollbar-thin p-4 sm:p-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div key={m.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                  {m.role === 'ai' && (
                    <div className="h-8 w-8 rounded-xl grid place-items-center shrink-0 neon-glow" style={{ background: 'var(--gradient-neon)' }}>
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-tr-sm text-white'
                      : 'glass rounded-tl-sm'
                  }`} style={m.role === 'user' ? { background: 'var(--gradient-neon)' } : undefined}>
                    {m.role === 'ai' ? (
                      m.text ? (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-pre:my-2 prose-pre:bg-black/40 prose-code:text-white">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="h-2 w-2 rounded-full bg-white/70 typing-dot" />
                          <span className="h-2 w-2 rounded-full bg-white/70 typing-dot" style={{ animationDelay: '0.15s' }} />
                          <span className="h-2 w-2 rounded-full bg-white/70 typing-dot" style={{ animationDelay: '0.3s' }} />
                        </div>
                      )
                    ) : (
                      m.text
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t border-white/10">
            <div className="glass rounded-2xl flex items-center gap-2 p-2 gradient-border focus-within:neon-glow transition">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Message OrbitIntelligence… (Enter to send · ⌘K new)"
                className="flex-1 bg-transparent px-3 py-2.5 outline-none text-sm placeholder:text-muted-foreground"
              />
              <button onClick={send} className="h-10 w-10 rounded-xl grid place-items-center text-white hover:scale-105 transition neon-glow"
                style={{ background: 'var(--gradient-neon)' }}>
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center text-[10px] text-muted-foreground mt-2">
              OrbitIntelligence can make mistakes. Double check important info. Created by <span className="gradient-text font-semibold">Srikar</span>.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
