import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Plus, ArrowLeft, Menu, Brain, Zap, Code2 } from "lucide-react";
import { Blobs } from "@/components/Blobs";

type Mode = "default" | "genz" | "codey";

const MODES: { id: Mode; label: string; sub: string; icon: any; emoji: string }[] = [
  { id: "default", label: "Default", sub: "for the nerds", icon: Brain, emoji: "🧠" },
  { id: "genz", label: "Gen-Z", sub: "for humans", icon: Zap, emoji: "✨" },
  { id: "codey", label: "Codey", sub: "for Elon & Bezos", icon: Code2, emoji: "🚀" },
];

const REPLIES: Record<Mode, string[]> = {
  default: [
    "Interesting question. Let me break this down into a few key components for clarity.",
    "Based on the available context, here's a structured approach: first, define the problem; second, explore constraints; third, evaluate trade-offs.",
    "A reasonable framework here would be to consider both the technical and human factors before deciding.",
    "Good prompt. The optimal answer depends on your priorities — do you want speed, accuracy, or coverage?",
  ],
  genz: [
    "ok so here's the play ✨ break it into 3 steps, start with the easiest win, build momentum from there.",
    "lowkey solid question — short answer: yes, but only if you nail the timing. long answer: depends on your audience + budget.",
    "got u 💜 try this: pick one core idea, test it for a week, then double down on whatever sticks.",
    "real talk — the move is to keep it simple. one goal, one metric, one deadline. everything else is noise.",
  ],
  codey: [
    "Scaling thesis: compress the loop, 10x the throughput. Ship today, iterate at the edge. 🚀",
    "First principles: strip it to atoms, rebuild leaner. Mars-tier ambition, Day-1 customer obsession.",
    "Optimize for velocity. Burn the org chart. Move fast, write the press release first, reverse-engineer the product.",
    "Bandwidth allocated. Treat this like a rocket — every gram matters. Cut, simplify, then accelerate.",
  ],
};

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat · BrightCore-AI" },
      { name: "description", content: "Chat with BrightCore-AI — created by Srikar." },
    ],
  }),
  component: ChatPage,
});

type Msg = { id: string; role: "user" | "ai"; text: string };

const WELCOME: Record<Mode, string> = {
  default: "Hi. I'm BrightCore-AI in Default mode — precise, structured, nerd-approved. What can I analyze for you?",
  genz: "hey 💜 brightcore here in Gen-Z mode — casual but actually useful. what are we figuring out?",
  codey: "BrightCore online. Codey mode engaged. Think bigger. Ship faster. What are we building? 🚀",
};

function ChatPage() {
  const [history] = useState([
    "Welcome chat", "Resume rewrite", "Tokyo trip", "Startup names", "Late night thoughts"
  ]);
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<Mode>("genz");
  const [messages, setMessages] = useState<Msg[]>([
    { id: "w", role: "ai", text: WELCOME["genz"] },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const resetChat = (m: Mode) => {
    setMessages([{ id: "w" + Date.now(), role: "ai", text: WELCOME[m] }]);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setMessages((prev) => [...prev, { id: "sys" + Date.now(), role: "ai", text: `⚡ Switched to ${MODES.find(x => x.id === m)?.label} mode — ${MODES.find(x => x.id === m)?.sub}.` }]);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        resetChat(mode);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Msg = { id: String(Date.now()), role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const pool = REPLIES[mode];
      const reply = pool[Math.floor(Math.random() * pool.length)];
      setMessages((m) => [...m, { id: "a" + Date.now(), role: "ai", text: reply }]);
      setTyping(false);
    }, 1100);
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
                <div className="text-sm font-bold gradient-text">BrightCore-AI</div>
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
                    {m.text}
                  </div>
                </motion.div>
              ))}
              {typing && (
                <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-3">
                  <div className="h-8 w-8 rounded-xl grid place-items-center shrink-0" style={{ background: 'var(--gradient-neon)' }}>
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-white/70 typing-dot" />
                    <span className="h-2 w-2 rounded-full bg-white/70 typing-dot" style={{ animationDelay: '0.15s' }} />
                    <span className="h-2 w-2 rounded-full bg-white/70 typing-dot" style={{ animationDelay: '0.3s' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t border-white/10">
            <div className="glass rounded-2xl flex items-center gap-2 p-2 gradient-border focus-within:neon-glow transition">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Message BrightCore… (Enter to send · ⌘K new)"
                className="flex-1 bg-transparent px-3 py-2.5 outline-none text-sm placeholder:text-muted-foreground"
              />
              <button onClick={send} className="h-10 w-10 rounded-xl grid place-items-center text-white hover:scale-105 transition neon-glow"
                style={{ background: 'var(--gradient-neon)' }}>
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center text-[10px] text-muted-foreground mt-2">
              BrightCore can make mistakes. Double check important info. Created by <span className="gradient-text font-semibold">Srikar</span>.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
