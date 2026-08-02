import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, Plus, ArrowLeft, Menu, Brain, Zap, Code2, LogOut, Trash2,
  Rocket, Lock, X, Paperclip, Image as ImageIcon, User as UserIcon, Camera, Gamepad2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Blobs } from "@/components/Blobs";
import { useServerFn } from "@tanstack/react-start";
import {
  listThreads, createThread, deleteThread, loadMessages, saveMessage,
  consumeQuota, getPlanStatus, getProfile, updateAvatar, awardGameCredits,
} from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


type Mode = "default" | "genz" | "codey";

const MODES: { id: Mode; label: string; sub: string; icon: any; emoji: string }[] = [
  { id: "default", label: "Default", sub: "for the nerds", icon: Brain, emoji: "🧠" },
  { id: "genz", label: "Gen-Z", sub: "for humans", icon: Zap, emoji: "✨" },
  { id: "codey", label: "Codey", sub: "for Elon & Bezos", icon: Code2, emoji: "🚀" },
];

export type OrbitModel = "rapid" | "lite" | "proman";
const ORBIT_MODELS: { id: OrbitModel; label: string; hint: string }[] = [
  { id: "rapid", label: "Orbit Rapid", hint: "balanced & fast" },
  { id: "lite", label: "Orbit Lite Rapid", hint: "lightning light" },
  { id: "proman", label: "Orbit Pro Man", hint: "deepest thinking" },
];

export type Effort = "low" | "medium" | "high";
const EFFORTS: { id: Effort; label: string }[] = [
  { id: "low", label: "Quick" },
  { id: "medium", label: "Balanced" },
  { id: "high", label: "Deep" },
];



export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat · OrbitIntelligenceAI" },
      { name: "description", content: "Chat with OrbitIntelligenceAI — created by Srikar." },
    ],
  }),
  component: ChatPage,
});

type Msg = {
  id: string;
  role: "user" | "ai";
  text: string;
  image?: string;          // data URL for generated / attached image
  imageLoading?: boolean;  // apply blur while streaming partials
};

const WELCOME: Record<Mode, string> = {
  default: "Hi. I'm OrbitIntelligenceAI in Default mode — precise, structured, nerd-approved. What can I analyze for you?",
  genz: "hey 💜 orbit here in Gen-Z mode — casual but actually useful. what are we figuring out?",
  codey: "OrbitIntelligence online. Codey mode — your lightweight coding buddy. Snippets, fixes, quick explains. Need a full app? Head to Build Mode 🚀",
  
};

type Thread = { id: string; title: string; mode: string; updated_at: string };

const MAX_FILE_BYTES = 200_000; // 200KB per attached code/text file
const TEXT_EXT = /\.(txt|md|json|ya?ml|toml|xml|csv|tsv|log|env|gitignore|html?|css|scss|sass|less|js|jsx|ts|tsx|mjs|cjs|py|rb|go|rs|java|kt|swift|c|h|cc|cpp|hpp|cs|php|sh|bash|zsh|fish|sql|prisma|graphql|gql|vue|svelte|astro|lua|dart|ex|exs|erl|elm|hs|ml|nim|r|scala|clj|cljs|edn|proto|dockerfile|makefile|ini|conf)$/i;

function ChatPage() {
  const navigate = useNavigate();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const remove = useServerFn(deleteThread);
  const load = useServerFn(loadMessages);
  const save = useServerFn(saveMessage);
  const consume = useServerFn(consumeQuota);
  const planStatus = useServerFn(getPlanStatus);
  const profileFn = useServerFn(getProfile);
  const avatarFn = useServerFn(updateAvatar);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("genz");
  const [messages, setMessages] = useState<Msg[]>([{ id: "w", role: "ai", text: WELCOME["genz"] }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [plan, setPlan] = useState<"free" | "plus">("free");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<{ kind: "limit" | "feature"; model?: string; quota?: number } | null>(null);
  const [profile, setProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [orbitModel, setOrbitModel] = useState<OrbitModel>("rapid");
  const [effort, setEffort] = useState<Effort>("medium");
  const [memory, setMemory] = useState<string>("");
  const memoryFn = useServerFn(getMemory);
  const awardFn = useServerFn(awardGameCredits);
  const scroller = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user)).catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    planStatus().then((s: any) => setPlan(s.plan)).catch(() => {});
    profileFn().then((p: any) => setProfile(p ?? null)).catch(() => {});
    memoryFn().then((m: any) => setMemory(typeof m === "string" ? m : "")).catch(() => {});
  }, [authed, planStatus, profileFn, memoryFn]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // Auto-resize the textarea (max 6 lines)
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [input]);

  const refreshThreads = useCallback(async () => {
    try {
      const rows = await list();
      setThreads(rows as Thread[]);
      return rows as Thread[];
    } catch {
      return [];
    }
  }, [list]);

  useEffect(() => { if (authed) refreshThreads(); }, [authed, refreshThreads]);


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

  // ---------- File attach (code/text files -> inline fenced block) ----------
  const onAttachClick = () => fileInputRef.current?.click();
  const onFilesChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const f of files) {
      if (!(TEXT_EXT.test(f.name) || f.type.startsWith("text/") || f.type === "application/json")) {
        toast.error(`${f.name}: only text/code files are supported.`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name}: file too large (max 200KB).`);
        continue;
      }
      try {
        const text = await f.text();
        const lang = (f.name.split(".").pop() ?? "").toLowerCase();
        const block = `\n\n\`\`\`${lang}\n// ${f.name}\n${text}\n\`\`\`\n`;
        setInput((prev) => prev + block);
        toast.success(`Attached ${f.name}`);
      } catch {
        toast.error(`Couldn't read ${f.name}`);
      }
    }
    textareaRef.current?.focus();
  };

  // ---------- Image generation ----------
  const generateImage = async (prompt: string) => {
    if (!prompt.trim() || typing) return;
    setTyping(true);
    const userMsg: Msg = { id: String(Date.now()), role: "user", text: `🖼️ ${prompt}` };
    const aiId = "img" + Date.now();
    setMessages((m) => [...m, userMsg, { id: aiId, role: "ai", text: "", imageLoading: true }]);
    setInput("");
    setImageMode(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) { navigate({ to: "/auth" }); return; }

      const resp = await fetch("/api/public/image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ prompt }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Image generation failed" }));
        setMessages((m) => m.map((x) => x.id === aiId
          ? { ...x, text: `⚠️ ${err.error || "Couldn't generate image."}`, imageLoading: false }
          : x));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawCompleted = false;
      let streamError: string | undefined;
      let currentEvent: string | undefined;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line === "") { currentEvent = undefined; continue; }
          if (line.startsWith(":")) continue;
          if (line.startsWith("event: ")) { currentEvent = line.slice(7).trim(); continue; }
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          let payload: any;
          try { payload = JSON.parse(data); } catch { continue; }
          const type = payload?.type ?? currentEvent;
          if (type === "error" || currentEvent === "error") {
            streamError = payload?.error?.message ?? "Image generation failed";
            continue;
          }
          if (type === "image_generation.partial_image" || type === "image_generation.completed") {
            if (payload.b64_json) {
              const isFinal = type === "image_generation.completed";
              const dataUrl = `data:image/png;base64,${payload.b64_json}`;
              setMessages((m) => m.map((x) => x.id === aiId
                ? { ...x, image: dataUrl, imageLoading: !isFinal }
                : x));
              if (isFinal) sawCompleted = true;
            }
          }
        }
      }

      if (streamError) {
        setMessages((m) => m.map((x) => x.id === aiId
          ? { ...x, text: `⚠️ ${streamError}`, imageLoading: false }
          : x));
      } else if (!sawCompleted) {
        setMessages((m) => m.map((x) => x.id === aiId
          ? { ...x, text: "⚠️ Image stream ended early.", imageLoading: false }
          : x));
      }
    } catch (e) {
      console.error(e);
      setMessages((m) => m.map((x) => x.id === aiId
        ? { ...x, text: "⚠️ Network error while generating image.", imageLoading: false }
        : x));
    } finally {
      setTyping(false);
    }
  };

  // ---------- Send (text) ----------
  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;

    if (imageMode) { await generateImage(text); return; }

    try {
      const q = await consume({ data: { model: mode } });
      if (!q.allowed) {
        setGameOpen(true);
        return;
      }
      setPlan(q.plan === "plus" ? "plus" : "free");
    } catch {
      toast.error("Couldn't check daily limit. Try again.");
      return;
    }

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

    save({ data: { threadId, role: "user", content: text } }).catch(() => {});

    try {
      const history = [...messages, userMsg]
        .filter((m) => !m.id.startsWith("w") && !m.id.startsWith("sys") && !m.id.startsWith("img"))
        .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Session expired. Please sign in again.");
        navigate({ to: "/auth" });
        return;
      }
      const resp = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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

  // ---------- Avatar upload ----------
  const onAvatarChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image."); return; }
    if (file.size > 2_000_000) { toast.error("Max 2MB."); return; }
    setUploadingAvatar(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
      const path = `${uid}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600", upsert: true, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      await avatarFn({ data: { avatar_url: url } });
      setProfile((p) => ({ username: p?.username ?? null, avatar_url: url }));
      toast.success("Avatar updated ✨");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await avatarFn({ data: { avatar_url: null } });
      setProfile((p) => ({ username: p?.username ?? null, avatar_url: null }));
      toast.success("Avatar removed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initial = (profile?.username ?? "U").slice(0, 1).toUpperCase();
  const UserAvatar = ({ size = 32 }: { size?: number }) =>
    profile?.avatar_url ? (
      <img src={profile.avatar_url} alt="" className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }} />
    ) : (
      <div className="rounded-full grid place-items-center text-white font-bold shrink-0"
        style={{ width: size, height: size, background: "var(--gradient-neon)", fontSize: size * 0.42 }}>
        {initial}
      </div>
    );

  return (
    <div className={`relative h-screen overflow-hidden flex flex-col mode-${mode} transition-colors duration-500`}>
      <Blobs variant={mode} />

      {/* Top bar */}
      <header className="sticky top-0 z-40 px-3 sm:px-4 pt-3">
        <div className="glass rounded-2xl px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
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
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <select value={mode} onChange={(e) => switchMode(e.target.value as Mode)}
                className="glass rounded-full px-3 py-1.5 text-xs font-semibold bg-transparent outline-none">
                {MODES.map((m) => (
                  <option key={m.id} value={m.id} className="bg-background">{m.emoji} {m.label}</option>
                ))}
              </select>
            </div>
            <button onClick={() => setGameOpen(true)}
              className="hidden sm:flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-xs font-semibold text-fuchsia-200 hover:text-white hover:neon-glow transition"
              title="Play a game to earn extra chat credits">
              <Gamepad2 className="h-3.5 w-3.5" /> Earn credits
            </button>
            <button onClick={() => setGameOpen(true)}
              className="sm:hidden h-9 w-9 grid place-items-center rounded-full glass text-fuchsia-200"
              title="Earn credits">
              <Gamepad2 className="h-4 w-4" />
            </button>
            <button onClick={() => setProfileOpen(true)}
              className="rounded-full ring-2 ring-white/10 hover:ring-white/30 transition"
              title="Profile">
              <UserAvatar size={34} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 grid md:grid-cols-[280px_1fr] gap-3 p-3 sm:p-4 min-h-0">
        {/* Sidebar */}
        <aside className={`glass rounded-2xl p-3 flex flex-col ${sidebar ? 'block' : 'hidden'} md:flex`}>
          <button onClick={() => newChat(mode)}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white flex items-center gap-2 justify-center neon-glow"
            style={{ background: 'var(--gradient-neon)' }}>
            <Plus className="h-4 w-4" /> New chat
          </button>
          <div className="mt-3 space-y-1 scrollbar-thin overflow-auto flex-1">
            {threads.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-3 text-center">No chats yet. Say hi 💜</div>
            )}
            {threads.map((t) => (
              <div key={t.id} className={`group flex items-center gap-1 rounded-lg ${t.id === activeId ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                <button onClick={() => openThread(t.id)} className="flex-1 text-left px-3 py-2 text-sm truncate">
                  {t.title}
                </button>
                <button onClick={() => removeThread(t.id)} className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-white">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Link to="/build" className="mt-3 w-full glass rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-white/10 border border-emerald-500/30 text-emerald-300">
            <Code2 className="h-3.5 w-3.5" /> Build Mode
          </Link>
          <button onClick={signOut} className="mt-2 w-full glass rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-white/10">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
          <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-muted-foreground text-center">
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
                    m.role === 'user' ? 'rounded-tr-sm text-white' : 'glass rounded-tl-sm'
                  }`} style={m.role === 'user' ? { background: 'var(--gradient-neon)' } : undefined}>
                    {m.image && (
                      <img
                        src={m.image}
                        alt="Generated"
                        className={`rounded-xl mb-2 max-w-full transition-[filter] duration-300 ${m.imageLoading ? 'blur-lg' : 'blur-0'}`}
                      />
                    )}
                    {m.role === 'ai' ? (
                      m.text ? (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-pre:my-2 prose-pre:bg-black/40 prose-code:text-white">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                        </div>
                      ) : m.image ? null : (
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="h-2 w-2 rounded-full bg-white/70 typing-dot" />
                          <span className="h-2 w-2 rounded-full bg-white/70 typing-dot" style={{ animationDelay: '0.15s' }} />
                          <span className="h-2 w-2 rounded-full bg-white/70 typing-dot" style={{ animationDelay: '0.3s' }} />
                        </div>
                      )
                    ) : (
                      <span className="whitespace-pre-wrap break-words">{m.text}</span>
                    )}
                  </div>
                  {m.role === 'user' && <UserAvatar size={32} />}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t border-white/10">
            {imageMode && (
              <div className="mb-2 text-xs flex items-center gap-2 text-fuchsia-300">
                <ImageIcon className="h-3.5 w-3.5" /> Image mode — Enter to generate. <button
                  onClick={() => setImageMode(false)} className="underline hover:text-white">cancel</button>
              </div>
            )}
            <div className="glass rounded-2xl flex items-end gap-2 p-2 gradient-border focus-within:neon-glow transition">
              <button
                onClick={onAttachClick}
                title="Attach code/text file"
                className="h-10 w-10 rounded-xl grid place-items-center text-muted-foreground hover:text-white hover:bg-white/10 shrink-0"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                onClick={() => setImageMode((v) => !v)}
                title="Generate an image"
                className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 transition ${
                  imageMode ? 'text-white neon-glow' : 'text-muted-foreground hover:text-white hover:bg-white/10'
                }`}
                style={imageMode ? { background: 'var(--gradient-neon)' } : undefined}
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.json,.yaml,.yml,.toml,.xml,.csv,.tsv,.log,.env,.html,.htm,.css,.scss,.sass,.less,.js,.jsx,.ts,.tsx,.mjs,.cjs,.py,.rb,.go,.rs,.java,.kt,.swift,.c,.h,.cc,.cpp,.hpp,.cs,.php,.sh,.bash,.zsh,.sql,.prisma,.graphql,.gql,.vue,.svelte,.astro,text/*,application/json"
                className="hidden"
                onChange={onFilesChosen}
              />
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={imageMode
                  ? "Describe the image… (Enter to generate · Shift+Enter for new line)"
                  : "Message OrbitIntelligence… (Enter to send · Shift+Enter new line · ⌘K new chat)"}
                rows={1}
                className="flex-1 bg-transparent px-2 py-2.5 outline-none text-sm placeholder:text-muted-foreground resize-none max-h-[180px] scrollbar-thin"
              />
              <button onClick={send} disabled={typing}
                className="h-10 w-10 rounded-xl grid place-items-center text-white hover:scale-105 transition neon-glow disabled:opacity-50 disabled:hover:scale-100 shrink-0"
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

      {/* Profile modal */}
      <AnimatePresence>
        {profileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setProfileOpen(false)}>
            <motion.div
              initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass gradient-border rounded-3xl p-6 sm:p-8 max-w-sm w-full relative"
            >
              <button onClick={() => setProfileOpen(false)}
                className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-xl font-bold gradient-text mb-4 flex items-center gap-2">
                <UserIcon className="h-5 w-5" /> Your profile
              </h2>

              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="relative">
                  <UserAvatar size={96} />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full grid place-items-center text-white neon-glow disabled:opacity-50"
                    style={{ background: "var(--gradient-neon)" }}
                    title="Change avatar"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarChosen}
                />
                <div className="text-sm font-semibold">{profile?.username ?? "You"}</div>
                <div className="text-xs text-muted-foreground">
                  Plan: <span className="gradient-text font-semibold">{plan === "plus" ? "Plus" : "Free"}</span>
                </div>
                {profile?.avatar_url && (
                  <button onClick={removeAvatar} disabled={uploadingAvatar}
                    className="text-[11px] text-muted-foreground hover:text-white underline">
                    Remove avatar
                  </button>
                )}
              </div>

              <div className="text-[11px] text-muted-foreground text-center">
                Max 2MB. PNG, JPG, WebP.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade / Out-of-credits modal */}
      <AnimatePresence>
        {upgradeOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setUpgradeOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass gradient-border rounded-3xl p-6 sm:p-8 max-w-md w-full relative"
            >
              <button onClick={() => setUpgradeOpen(false)} className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
              <div className="h-12 w-12 rounded-2xl grid place-items-center neon-glow mb-4" style={{ background: "var(--gradient-neon)" }}>
                {upgradeReason?.kind === "limit" ? <Lock className="h-6 w-6 text-white" /> : <Rocket className="h-6 w-6 text-white" />}
              </div>
              <h2 className="text-xl font-bold gradient-text mb-1">
                {upgradeReason?.kind === "limit" ? "You're out of chats today" : "Fast mode is a Plus feature"}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {upgradeReason?.kind === "limit"
                  ? `You've used all ${upgradeReason.quota} of your daily ${MODES.find((m) => m.id === upgradeReason.model)?.label} messages. Upgrade to Orbit Plus for 30/day on every model + faster thinking.`
                  : "Unlock ⚡ Fast — Plus-tier faster reasoning, plus 30 messages/day per model."}
              </p>
              <div className="glass rounded-2xl p-4 mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold gradient-text">$20</span>
                  <span className="text-xs text-muted-foreground">/ 6 months</span>
                </div>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>✨ 30 messages/day on every model</li>
                  <li>⚡ Fast mode — faster thinking</li>
                  <li>💜 Priority access to new modes</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  toast.message("Plus checkout coming soon — payments setup in progress.");
                  setUpgradeOpen(false);
                }}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white neon-glow"
                style={{ background: "var(--gradient-neon)" }}
              >
                Upgrade to Plus — $20 / 6 months
              </button>
              <button onClick={() => setUpgradeOpen(false)} className="w-full mt-2 text-xs text-muted-foreground hover:text-white py-2">
                Maybe later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <GameModal
        open={gameOpen}
        onClose={() => setGameOpen(false)}
        mode={mode}
        onReward={async (credits) => {
          try {
            const r = await awardFn({ data: { model: mode, credits } });
            toast.success(`+${credits} ${MODES.find((x) => x.id === mode)?.label} credits! (${r.remaining}/${r.quota} left today)`);
          } catch (e: any) {
            toast.error(e?.message ?? "Couldn't award credits.");
          }
        }}
      />
    </div>
  );
}

const CRICKET_QUESTIONS: { q: string; options: string[]; answer: number }[] = [
  { q: "How many players are on a cricket team on the field?", options: ["9", "10", "11", "12"], answer: 2 },
  { q: "How many runs is a boundary that clears the rope on the full?", options: ["2", "4", "6", "8"], answer: 2 },
  { q: "What is the maximum number of overs per side in a T20 match?", options: ["10", "20", "50", "40"], answer: 1 },
  { q: "Who has the highest individual score in Test cricket?", options: ["Don Bradman", "Brian Lara", "Sachin Tendulkar", "Virat Kohli"], answer: 1 },
  { q: "Which country won the first ICC Cricket World Cup in 1975?", options: ["Australia", "England", "West Indies", "India"], answer: 2 },
  { q: "How many balls are bowled in a standard over?", options: ["4", "5", "6", "8"], answer: 2 },
  { q: "What does LBW stand for?", options: ["Long Ball Wide", "Leg Before Wicket", "Left Batting Wicket", "Late Bowl Warning"], answer: 1 },
  { q: "Who is known as 'The God of Cricket'?", options: ["MS Dhoni", "Virat Kohli", "Sachin Tendulkar", "Ricky Ponting"], answer: 2 },
  { q: "The Ashes is played between which two countries?", options: ["India & Pakistan", "England & Australia", "SA & NZ", "WI & England"], answer: 1 },
  { q: "How wide is a cricket pitch (approx)?", options: ["8 ft", "10 ft", "12 ft", "14 ft"], answer: 1 },
  { q: "Who was the first bowler to take 800 Test wickets?", options: ["Shane Warne", "Anil Kumble", "Muttiah Muralitharan", "James Anderson"], answer: 2 },
  { q: "In which year did India win its first ODI World Cup?", options: ["1975", "1983", "1992", "2011"], answer: 1 },
];

const DAILY_PLAY_LIMIT = 3;
const playKey = () => `orbit-cricket-plays-${new Date().toISOString().slice(0, 10)}`;
function readPlays(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(playKey()) ?? 0);
}
function bumpPlays() {
  if (typeof window === "undefined") return;
  localStorage.setItem(playKey(), String(readPlays() + 1));
}

function GameModal({
  open, onClose, mode, onReward,
}: {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  onReward: (credits: number) => void | Promise<void>;
}) {
  const [phase, setPhase] = useState<"idle" | "playing" | "done" | "locked">("idle");
  const [order, setOrder] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [awarded, setAwarded] = useState(0);
  const [playsToday, setPlaysToday] = useState(0);

  const TOTAL = 5; // questions per quiz

  useEffect(() => {
    if (!open) return;
    const plays = readPlays();
    setPlaysToday(plays);
    setPhase(plays >= DAILY_PLAY_LIMIT ? "locked" : "idle");
    setStep(0);
    setScore(0);
    setSelected(null);
    setLocked(false);
    setAwarded(0);
  }, [open]);

  const start = () => {
    if (readPlays() >= DAILY_PLAY_LIMIT) { setPhase("locked"); return; }
    const shuffled = [...CRICKET_QUESTIONS.keys()].sort(() => Math.random() - 0.5).slice(0, TOTAL);
    setOrder(shuffled);
    setStep(0);
    setScore(0);
    setSelected(null);
    setLocked(false);
    setPhase("playing");
  };

  const currentQ = phase === "playing" ? CRICKET_QUESTIONS[order[step]] : null;

  const pick = (idx: number) => {
    if (locked || !currentQ) return;
    setSelected(idx);
    setLocked(true);
    const correct = idx === currentQ.answer;
    const nextScore = score + (correct ? 1 : 0);
    setScore(nextScore);
    setTimeout(() => {
      if (step + 1 >= TOTAL) {
        const credits = Math.min(5, Math.max(1, nextScore));
        bumpPlays();
        setPlaysToday((p) => p + 1);
        setAwarded(credits);
        setPhase("done");
        if (nextScore > 0) onReward(credits);
      } else {
        setStep((s) => s + 1);
        setSelected(null);
        setLocked(false);
      }
    }, 900);
  };

  if (!open) return null;

  const playsLeft = Math.max(0, DAILY_PLAY_LIMIT - playsToday);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass gradient-border rounded-3xl p-6 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="h-10 w-10 rounded-2xl grid place-items-center neon-glow text-xl" style={{ background: "var(--gradient-neon)" }}>
            🏏
          </div>
          <div>
            <h2 className="text-lg font-bold gradient-text">Orbit Cricket Quiz</h2>
            <p className="text-[11px] text-muted-foreground">
              {TOTAL} questions · 1 point per correct answer · earn up to 5 extra <span className="font-semibold">{MODES.find((x) => x.id === mode)?.label}</span> messages.
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px]">
          <div className="glass rounded-full px-3 py-1 font-semibold">Plays left today: {playsLeft}/{DAILY_PLAY_LIMIT}</div>
          {phase === "playing" && <div className="glass rounded-full px-3 py-1 font-semibold">Q {step + 1}/{TOTAL} · {score} pts</div>}
        </div>

        <div className="mt-4 min-h-[280px] rounded-2xl border border-white/10 p-4"
          style={{ background: "radial-gradient(120% 120% at 50% 0%, rgba(34,197,94,0.18), transparent 60%), linear-gradient(180deg, #052e16 0%, #0a0a0a 100%)" }}>

          {phase === "idle" && (
            <div className="h-full min-h-[260px] grid place-items-center text-center">
              <div>
                <div className="text-4xl mb-3">🎯</div>
                <div className="font-semibold mb-1">Ready to play?</div>
                <div className="text-xs text-muted-foreground mb-4">Answer {TOTAL} random cricket questions.<br />1 point per correct = 1 credit (max 5).</div>
                <button onClick={start} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white neon-glow" style={{ background: "var(--gradient-neon)" }}>
                  Start Quiz
                </button>
              </div>
            </div>
          )}

          {phase === "locked" && (
            <div className="h-full min-h-[260px] grid place-items-center text-center">
              <div>
                <div className="text-4xl mb-3">🔒</div>
                <div className="font-semibold mb-1">Daily limit reached</div>
                <div className="text-xs text-muted-foreground">You've played {DAILY_PLAY_LIMIT} times today.<br />Come back tomorrow for more credits!</div>
              </div>
            </div>
          )}

          {phase === "playing" && currentQ && (
            <div>
              <div className="font-semibold text-sm mb-4 leading-snug">{currentQ.q}</div>
              <div className="grid gap-2">
                {currentQ.options.map((opt, i) => {
                  const isPicked = selected === i;
                  const isCorrect = locked && i === currentQ.answer;
                  const isWrong = locked && isPicked && i !== currentQ.answer;
                  return (
                    <button
                      key={i}
                      disabled={locked}
                      onClick={() => pick(i)}
                      className={`text-left rounded-xl px-3 py-2.5 text-sm border transition ${
                        isCorrect ? "bg-emerald-500/25 border-emerald-400/60 text-emerald-100"
                          : isWrong ? "bg-red-500/25 border-red-400/60 text-red-100"
                          : "glass border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <span className="font-mono text-[10px] text-muted-foreground mr-2">{String.fromCharCode(65 + i)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="h-full min-h-[260px] grid place-items-center text-center">
              <div>
                <div className="text-4xl mb-2">🏆</div>
                <div className="text-lg font-bold gradient-text">{score}/{TOTAL} correct</div>
                <div className="text-xs text-muted-foreground mt-1">+{awarded} credits earned</div>
                {playsLeft > 0 ? (
                  <button onClick={start} className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold glass hover:bg-white/10">
                    Play again ({playsLeft} left)
                  </button>
                ) : (
                  <div className="mt-4 text-[11px] text-muted-foreground">Daily limit reached — see you tomorrow!</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="text-[10px] text-muted-foreground text-center mt-3">
          Max {DAILY_PLAY_LIMIT} plays per day · 1 point per correct answer
        </div>
      </motion.div>
    </div>
  );
}
