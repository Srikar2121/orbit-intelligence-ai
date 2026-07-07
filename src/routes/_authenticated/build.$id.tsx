import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Rocket,
  Sparkles,
  File as FileIcon,
  Folder,
  FolderOpen,
  Save,
  Loader2,
  ExternalLink,
  CheckCircle2,
  MessageSquare,
  Play,
  Download,
  FilePlus,
  Send,
  X,
  ChevronRight,
  ChevronDown,
  Files,
  GitBranch,
  Circle,
  History,
  Package,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackConsole,
} from "@codesandbox/sandpack-react";
import {
  getBuildProject,
  updateBuildProject,
  generateCode,
  deployToVercel,
  getVercelStatus,
  chatBuild,
  generatePage,
} from "@/lib/build.functions";

export const Route = createFileRoute("/_authenticated/build/$id")({
  head: () => ({
    meta: [
      { title: "Editor · Orbit Build" },
      { name: "description", content: "AI-powered IDE for building and shipping apps." },
    ],
  }),
  component: Editor,
});

type FileMap = Record<string, string>;
type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  changed?: string[];
};
type Activity = "files" | "chat" | "changes" | "deploy";

/* ------------------------------------------------------------------ */
/* File tree                                                           */
/* ------------------------------------------------------------------ */

type TreeNode = {
  name: string;
  path: string;
  children?: TreeNode[];
};

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [] };
  for (const p of paths) {
    const parts = p.split("/");
    let cur = root;
    parts.forEach((part, i) => {
      cur.children ??= [];
      let next = cur.children.find((c) => c.name === part);
      if (!next) {
        next = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          children: i === parts.length - 1 ? undefined : [],
        };
        cur.children.push(next);
      }
      cur = next;
    });
  }
  const sort = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      const aDir = !!a.children;
      const bDir = !!b.children;
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) if (n.children) sort(n.children);
    return nodes;
  };
  return sort(root.children ?? []);
}

function extLang(path: string): string {
  const ext = path.split(".").pop() ?? "";
  return (
    {
      tsx: "tsx",
      ts: "ts",
      jsx: "jsx",
      js: "js",
      css: "css",
      html: "html",
      json: "json",
      md: "md",
    }[ext] ?? "txt"
  );
}

function extColor(path: string): string {
  const l = extLang(path);
  if (l === "tsx" || l === "jsx") return "text-sky-400";
  if (l === "ts" || l === "js") return "text-yellow-400";
  if (l === "css") return "text-pink-400";
  if (l === "html") return "text-orange-400";
  if (l === "json") return "text-emerald-400";
  return "text-zinc-400";
}

/* ------------------------------------------------------------------ */
/* Tree row                                                            */
/* ------------------------------------------------------------------ */

function TreeRow({
  node,
  depth,
  active,
  changed,
  expanded,
  onToggle,
  onOpen,
}: {
  node: TreeNode;
  depth: number;
  active: string;
  changed: Set<string>;
  expanded: Set<string>;
  onToggle: (p: string) => void;
  onOpen: (p: string) => void;
}) {
  const isFolder = !!node.children;
  const isOpen = expanded.has(node.path);
  const isActive = active === node.path;
  const isChanged = changed.has(node.path);

  return (
    <>
      <button
        onClick={() => (isFolder ? onToggle(node.path) : onOpen(node.path))}
        className={`group flex w-full items-center gap-1 py-[3px] pr-2 text-left text-[13px] transition ${
          isActive
            ? "bg-sky-500/15 text-sky-200"
            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        {isFolder ? (
          <>
            {isOpen ? (
              <ChevronDown className="h-3 w-3 shrink-0 text-zinc-500" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0 text-zinc-500" />
            )}
            {isOpen ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-sky-400/80" />
            ) : (
              <Folder className="h-3.5 w-3.5 shrink-0 text-sky-400/80" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            <FileIcon className={`h-3.5 w-3.5 shrink-0 ${extColor(node.path)}`} />
          </>
        )}
        <span className="truncate">{node.name}</span>
        {isChanged && !isFolder && (
          <span className="ml-auto text-[10px] font-bold text-amber-400">M</span>
        )}
      </button>
      {isFolder && isOpen && (
        <>
          {node.children!.map((c) => (
            <TreeRow
              key={c.path}
              node={c}
              depth={depth + 1}
              active={active}
              changed={changed}
              expanded={expanded}
              onToggle={onToggle}
              onOpen={onOpen}
            />
          ))}
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Code editor with line-number gutter                                 */
/* ------------------------------------------------------------------ */

function CodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const lines = useMemo(() => value.split("\n").length, [value]);
  const gutterRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="relative flex flex-1 overflow-hidden bg-[#0b0d10]">
      <div
        ref={gutterRef}
        className="select-none overflow-hidden border-r border-white/5 py-4 pl-3 pr-3 text-right font-mono text-[12px] leading-[1.55] text-zinc-600"
      >
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (gutterRef.current) {
            gutterRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop;
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const ta = e.currentTarget;
            const s = ta.selectionStart;
            const en = ta.selectionEnd;
            const next = value.slice(0, s) + "  " + value.slice(en);
            onChange(next);
            requestAnimationFrame(() => {
              ta.selectionStart = ta.selectionEnd = s + 2;
            });
          }
        }}
        spellCheck={false}
        className="flex-1 resize-none bg-[#0b0d10] px-4 py-4 font-mono text-[13px] leading-[1.55] text-zinc-100 outline-none"
        style={{ tabSize: 2 }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main editor                                                         */
/* ------------------------------------------------------------------ */

function Editor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getBuildProject);
  const updateFn = useServerFn(updateBuildProject);
  const deployFn = useServerFn(deployToVercel);
  const vercelFn = useServerFn(getVercelStatus);
  const chatFn = useServerFn(chatBuild);
  const pageFn = useServerFn(generatePage);

  const [name, setName] = useState("");
  const [files, setFiles] = useState<FileMap>({});
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["src", "src/components"]));

  const [deploying, setDeploying] = useState(false);
  const [lastDeployUrl, setLastDeployUrl] = useState<string | null>(null);
  const [vercelConnected, setVercelConnected] = useState(false);

  const [activity, setActivity] = useState<Activity>("chat");
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Ready. Describe what you want to build or change and I'll edit files across the project.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const [lastChanged, setLastChanged] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(true);

  const [showPageModal, setShowPageModal] = useState(false);
  const [pageName, setPageName] = useState("");
  const [pageDesc, setPageDesc] = useState("");
  const [pageBusy, setPageBusy] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  /* ---------------- load ---------------- */
  useEffect(() => {
    (async () => {
      try {
        const [proj, v] = await Promise.all([getFn({ data: { id } }), vercelFn()]);
        setName(proj.name);
        const f = (proj.files ?? {}) as FileMap;
        setFiles(f);
        setLastDeployUrl(proj.last_deploy_url ?? null);
        setVercelConnected(v.connected);
        const first =
          Object.keys(f).find((p) => p === "src/App.jsx" || p === "src/App.tsx") ??
          Object.keys(f).find((p) => p.endsWith(".jsx") || p.endsWith(".tsx")) ??
          Object.keys(f)[0] ??
          "";
        if (first) {
          setActivePath(first);
          setOpenTabs([first]);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
        navigate({ to: "/build" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMsgs, chatBusy]);

  useEffect(() => {
    chatInputRef.current?.focus();
  }, [activity]);

  /* ---------------- derived ---------------- */
  const tree = useMemo(() => buildTree(Object.keys(files)), [files]);

  const sandpackFiles = useMemo(() => {
    const out: Record<string, { code: string }> = {};
    for (const [p, c] of Object.entries(files)) {
      if (p === "package.json" || p === "vite.config.js" || p.startsWith("public/")) continue;
      out["/" + p] = { code: c };
    }
    return out;
  }, [files]);

  const sandpackDeps = useMemo(() => {
    try {
      const pkg = JSON.parse(files["package.json"] ?? "{}") as {
        dependencies?: Record<string, string>;
      };
      return pkg.dependencies ?? { react: "^18.3.1", "react-dom": "^18.3.1" };
    } catch {
      return { react: "^18.3.1", "react-dom": "^18.3.1" };
    }
  }, [files]);

  /* ---------------- actions ---------------- */
  const openFile = (p: string) => {
    setActivePath(p);
    setOpenTabs((t) => (t.includes(p) ? t : [...t, p]));
  };

  const closeTab = (p: string) => {
    setOpenTabs((t) => {
      const nt = t.filter((x) => x !== p);
      if (activePath === p) setActivePath(nt[nt.length - 1] ?? "");
      return nt;
    });
  };

  const toggleFolder = (p: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });

  const editFile = (v: string) => {
    if (!activePath) return;
    setFiles((f) => ({ ...f, [activePath]: v }));
    setDirty((d) => new Set(d).add(activePath));
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateFn({ data: { id, files } });
      setDirty(new Set());
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    const nextMsgs: ChatMsg[] = [...chatMsgs, { role: "user", content: text }];
    setChatMsgs(nextMsgs);
    setChatInput("");
    setChatBusy(true);
    try {
      if (dirty.size > 0) {
        await updateFn({ data: { id, files } });
        setDirty(new Set());
      }
      const result = await chatFn({ data: { projectId: id, messages: nextMsgs } });
      setFiles(result.files as FileMap);
      setLastChanged(new Set(result.changedFiles));
      setChatMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: result.reply,
          changed: result.changedFiles,
        },
      ]);
      if (result.changedFiles[0]) {
        openFile(result.changedFiles[0]);
        if (result.changedFiles.length > 1) setActivity("changes");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chat failed";
      setChatMsgs((m) => [...m, { role: "assistant", content: "⚠ " + msg }]);
    } finally {
      setChatBusy(false);
      requestAnimationFrame(() => chatInputRef.current?.focus());
    }
  };

  const createPage = async () => {
    if (!pageName.trim() || !pageDesc.trim()) return;
    setPageBusy(true);
    try {
      const result = await pageFn({
        data: { projectId: id, pageName: pageName.trim(), description: pageDesc.trim() },
      });
      setFiles(result.files as FileMap);
      setLastChanged(new Set(result.changedFiles));
      if (result.changedFiles[0]) openFile(result.changedFiles[0]);
      toast.success(`Created ${result.componentName}`);
      setShowPageModal(false);
      setPageName("");
      setPageDesc("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPageBusy(false);
    }
  };

  const deploy = async () => {
    if (!vercelConnected) {
      toast.error("Connect Vercel first (back to projects page)");
      return;
    }
    setDeploying(true);
    try {
      if (dirty.size > 0) {
        await updateFn({ data: { id, files } });
        setDirty(new Set());
      }
      const result = await deployFn({ data: { projectId: id } });
      if (result.url) {
        setLastDeployUrl(result.url);
        toast.success("Deployed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const slug =
    name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "") || "app";

  const downloadSource = async () => {
    const zip = new JSZip();
    for (const [p, c] of Object.entries(files)) zip.file(p, c);
    zip.file(
      "README.md",
      `# ${name}\n\nRun locally:\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n`,
    );
    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(blob, `${slug}-source.zip`);
    setShowDownload(false);
  };

  const downloadStandalone = () => {
    const appJsx =
      files["src/App.jsx"] ?? `export default function App(){return <h1>Hello</h1>}`;
    const cssFiles = Object.entries(files)
      .filter(([p]) => p.endsWith(".css"))
      .map(([, c]) => c)
      .join("\n");
    const otherJsx = Object.entries(files)
      .filter(
        ([p]) =>
          p.startsWith("src/") &&
          (p.endsWith(".jsx") || p.endsWith(".js")) &&
          p !== "src/App.jsx" &&
          p !== "src/main.jsx",
      )
      .map(([p, c]) => `// ${p}\n${c}`)
      .join("\n\n");
    const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${name}</title><style>${cssFiles}</style><script type="importmap">{"imports":{"react":"https://esm.sh/react@18.3.1","react-dom/client":"https://esm.sh/react-dom@18.3.1/client","react-dom":"https://esm.sh/react-dom@18.3.1"}}</script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script></head><body><div id="root"></div><script type="text/babel" data-type="module" data-presets="env,react">
${otherJsx}
${appJsx.replace(/export\s+default\s+function\s+App/, "function App")}
import {createRoot} from 'react-dom/client';
createRoot(document.getElementById('root')).render(<App/>);
</script></body></html>`;
    triggerDownload(new Blob([html], { type: "text/html" }), `${slug}-standalone.html`);
    setShowDownload(false);
  };

  /* ---------------- loading ---------------- */
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0d10] text-sm text-zinc-500 font-mono">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-sky-400" />
        booting workspace…
      </div>
    );
  }

  /* ---------------- render ---------------- */
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b0d10] text-zinc-100">
      {/* Title bar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/5 bg-[#111418] px-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link
            to="/build"
            className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <span className="ml-2 font-mono text-[11px] text-zinc-500">orbit ide</span>
            <span className="text-zinc-700">·</span>
            <span className="font-medium text-zinc-200">{name}</span>
            {dirty.size > 0 && (
              <span className="ml-1 text-[10px] text-amber-400">
                ● {dirty.size} unsaved
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPageModal(true)}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
          >
            <FilePlus className="h-3 w-3" /> new page
          </button>
          <div className="relative">
            <button
              onClick={() => setShowDownload((v) => !v)}
              className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            >
              <Download className="h-3 w-3" /> export
            </button>
            {showDownload && (
              <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-md border border-white/10 bg-[#1a1d22] p-1 text-xs shadow-2xl">
                <button
                  onClick={downloadSource}
                  className="block w-full rounded px-3 py-2 text-left hover:bg-white/5"
                >
                  <Package className="mr-2 inline h-3 w-3" />
                  Source ZIP
                </button>
                <button
                  onClick={downloadStandalone}
                  className="block w-full rounded px-3 py-2 text-left hover:bg-white/5"
                >
                  <FileIcon className="mr-2 inline h-3 w-3" />
                  Standalone HTML
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] ${
              showPreview
                ? "bg-white/5 text-zinc-100"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            }`}
          >
            <Play className="h-3 w-3" /> preview
          </button>
          <div className="mx-1 h-4 w-px bg-white/10" />
          <button
            onClick={save}
            disabled={dirty.size === 0 || saving}
            className="flex items-center gap-1.5 rounded border border-white/10 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/5 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            save
          </button>
          {lastDeployUrl && (
            <a
              href={lastDeployUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20"
            >
              <ExternalLink className="h-3 w-3" /> live
            </a>
          )}
          <button
            onClick={deploy}
            disabled={deploying}
            className="flex items-center gap-1.5 rounded bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1 text-[11px] font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
          >
            {deploying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Rocket className="h-3 w-3" />
            )}
            {deploying ? "shipping…" : "deploy"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Activity bar */}
        <nav className="flex w-11 shrink-0 flex-col items-center border-r border-white/5 bg-[#0e1114] py-2">
          <ActivityBtn
            icon={<Files className="h-4.5 w-4.5" />}
            label="Files"
            active={activity === "files"}
            onClick={() => setActivity("files")}
          />
          <ActivityBtn
            icon={<Sparkles className="h-4.5 w-4.5" />}
            label="AI Chat"
            active={activity === "chat"}
            onClick={() => setActivity("chat")}
          />
          <ActivityBtn
            icon={<History className="h-4.5 w-4.5" />}
            label="Changes"
            active={activity === "changes"}
            onClick={() => setActivity("changes")}
            badge={lastChanged.size > 0 ? lastChanged.size : undefined}
          />
          <ActivityBtn
            icon={<Rocket className="h-4.5 w-4.5" />}
            label="Deploy"
            active={activity === "deploy"}
            onClick={() => setActivity("deploy")}
          />
        </nav>

        {/* Side panel */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-white/5 bg-[#0e1114]">
          <div className="flex h-8 shrink-0 items-center justify-between border-b border-white/5 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span>{activity}</span>
            {activity === "files" && (
              <button
                onClick={() => setShowPageModal(true)}
                className="text-zinc-500 hover:text-zinc-200"
                title="New page"
              >
                <FilePlus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activity === "files" && (
              <div className="py-1">
                {tree.map((n) => (
                  <TreeRow
                    key={n.path}
                    node={n}
                    depth={0}
                    active={activePath}
                    changed={lastChanged}
                    expanded={expanded}
                    onToggle={toggleFolder}
                    onOpen={openFile}
                  />
                ))}
              </div>
            )}

            {activity === "chat" && (
              <div className="flex h-full flex-col">
                <div
                  ref={chatScrollRef}
                  className="flex-1 space-y-3 overflow-y-auto p-3"
                >
                  {chatMsgs.map((m, i) => (
                    <div key={i}>
                      <div
                        className={`text-[10px] uppercase tracking-wider ${
                          m.role === "user" ? "text-sky-400" : "text-emerald-400"
                        }`}
                      >
                        {m.role === "user" ? "you" : "orbit"}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-zinc-200">
                        {m.content}
                      </div>
                      {m.changed && m.changed.length > 0 && (
                        <div className="mt-2 rounded-md border border-white/10 bg-black/30 p-2">
                          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                            {m.changed.length} file{m.changed.length > 1 ? "s" : ""} changed
                          </div>
                          {m.changed.map((p) => (
                            <button
                              key={p}
                              onClick={() => openFile(p)}
                              className="flex w-full items-center gap-1.5 rounded py-0.5 text-left font-mono text-[11px] text-zinc-300 hover:text-sky-300"
                            >
                              <FileIcon className={`h-3 w-3 ${extColor(p)}`} />
                              <span className="truncate">{p}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatBusy && (
                    <div className="flex items-center gap-2 text-[12px] text-zinc-500">
                      <Loader2 className="h-3 w-3 animate-spin text-sky-400" />
                      writing code…
                    </div>
                  )}
                </div>

                <div className="shrink-0 border-t border-white/5 p-2">
                  <div className="rounded-md border border-white/10 bg-[#0b0d10] focus-within:border-sky-500/50">
                    <textarea
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendChat();
                        }
                      }}
                      placeholder="describe a change… (⇧⏎ newline)"
                      rows={3}
                      className="w-full resize-none bg-transparent px-3 py-2 text-[12.5px] text-zinc-100 placeholder:text-zinc-600 outline-none"
                    />
                    <div className="flex items-center justify-between border-t border-white/5 px-2 py-1.5">
                      <span className="text-[10px] text-zinc-600">
                        edits multiple files
                      </span>
                      <button
                        onClick={sendChat}
                        disabled={chatBusy || !chatInput.trim()}
                        className="flex items-center gap-1 rounded bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-400 disabled:opacity-40"
                      >
                        <Send className="h-3 w-3" /> send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activity === "changes" && (
              <div className="p-3">
                {lastChanged.size === 0 ? (
                  <div className="text-[12px] text-zinc-500">
                    No recent AI changes. Ask Orbit to modify code and changed files
                    will appear here.
                  </div>
                ) : (
                  <>
                    <div className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">
                      last AI edit · {lastChanged.size} file
                      {lastChanged.size > 1 ? "s" : ""}
                    </div>
                    <div className="space-y-1">
                      {[...lastChanged].map((p) => (
                        <button
                          key={p}
                          onClick={() => openFile(p)}
                          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition ${
                            activePath === p
                              ? "bg-sky-500/15 text-sky-200"
                              : "text-zinc-300 hover:bg-white/5"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-amber-400">M</span>
                          <FileIcon className={`h-3.5 w-3.5 ${extColor(p)}`} />
                          <span className="truncate font-mono">{p}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setLastChanged(new Set())}
                      className="mt-3 flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300"
                    >
                      <Trash2 className="h-3 w-3" /> clear list
                    </button>
                  </>
                )}
              </div>
            )}

            {activity === "deploy" && (
              <div className="space-y-3 p-3 text-[12.5px]">
                <div className="rounded-md border border-white/10 bg-black/30 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-zinc-300">
                    <Circle
                      className={`h-2 w-2 ${
                        vercelConnected
                          ? "fill-emerald-400 text-emerald-400"
                          : "fill-zinc-600 text-zinc-600"
                      }`}
                    />
                    Vercel
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {vercelConnected
                      ? "Connected — ready to deploy."
                      : "Not connected. Open the projects page to add a token."}
                  </div>
                </div>
                {lastDeployUrl && (
                  <div className="rounded-md border border-white/10 bg-black/30 p-3">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                      last deploy
                    </div>
                    <a
                      href={lastDeployUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 break-all text-[12px] text-sky-400 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {lastDeployUrl}
                    </a>
                  </div>
                )}
                <button
                  onClick={deploy}
                  disabled={deploying || !vercelConnected}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-2 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {deploying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Rocket className="h-3.5 w-3.5" />
                  )}
                  {deploying ? "shipping…" : "deploy now"}
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Editor + Preview */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            {/* Editor column */}
            <section className="flex min-w-0 flex-1 flex-col">
              {/* Tabs */}
              <div className="flex h-9 shrink-0 items-center overflow-x-auto border-b border-white/5 bg-[#111418]">
                {openTabs.length === 0 && (
                  <div className="px-3 text-[11px] text-zinc-600">no file open</div>
                )}
                {openTabs.map((p) => (
                  <div
                    key={p}
                    className={`group flex h-full shrink-0 cursor-pointer items-center gap-1.5 border-r border-white/5 px-3 text-[12px] transition ${
                      activePath === p
                        ? "bg-[#0b0d10] text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-200"
                    }`}
                    onClick={() => setActivePath(p)}
                  >
                    <FileIcon className={`h-3.5 w-3.5 ${extColor(p)}`} />
                    <span className="font-mono">{p.split("/").pop()}</span>
                    {dirty.has(p) && <span className="text-amber-400">●</span>}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(p);
                      }}
                      className="ml-1 rounded p-0.5 opacity-0 hover:bg-white/10 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {activePath ? (
                <CodeEditor value={files[activePath] ?? ""} onChange={editFile} />
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
                  Select a file from the sidebar
                </div>
              )}
            </section>

            {/* Preview */}
            {showPreview && (
              <section className="flex w-[42%] min-w-[360px] shrink-0 flex-col border-l border-white/5 bg-white">
                <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/5 bg-[#111418] px-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Play className="h-3 w-3 text-emerald-400" /> live preview
                  </div>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <SandpackProvider
                    key={JSON.stringify(Object.keys(sandpackFiles))}
                    template="vite-react"
                    files={sandpackFiles}
                    customSetup={{ dependencies: sandpackDeps }}
                    options={{ recompileMode: "delayed", recompileDelay: 600 }}
                    theme="dark"
                  >
                    <SandpackLayout
                      style={{ height: "100%", border: "none", borderRadius: 0 }}
                    >
                      <SandpackPreview
                        style={{ height: "70%" }}
                        showOpenInCodeSandbox={false}
                        showRefreshButton
                      />
                      <SandpackConsole style={{ height: "30%" }} />
                    </SandpackLayout>
                  </SandpackProvider>
                </div>
              </section>
            )}
          </div>

          {/* Status bar */}
          <div className="flex h-6 shrink-0 items-center justify-between border-t border-white/5 bg-gradient-to-r from-sky-600 to-indigo-600 px-3 text-[10.5px] text-white/90">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" /> main
              </span>
              <span className="flex items-center gap-1">
                <Circle
                  className={`h-2 w-2 ${
                    vercelConnected
                      ? "fill-emerald-300 text-emerald-300"
                      : "fill-zinc-300 text-zinc-300"
                  }`}
                />
                vercel {vercelConnected ? "connected" : "off"}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span>{extLang(activePath).toUpperCase()}</span>
              <span>{Object.keys(files).length} files</span>
              <span>utf-8</span>
            </div>
          </div>
        </main>
      </div>

      {/* Vercel notice */}
      <AnimatePresence>
        {!vercelConnected && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 right-4 z-30 max-w-xs rounded-md border border-amber-500/40 bg-amber-950/70 p-3 text-xs text-amber-200 backdrop-blur"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Connect Vercel on the projects page to enable deploys.</span>
            </div>
          </motion.div>
        )}

        {showPageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowPageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-lg border border-white/10 bg-[#111418] p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <FilePlus className="h-5 w-5 text-sky-400" />
                <h2 className="text-lg font-semibold">Generate a new page</h2>
              </div>
              <label className="text-xs text-zinc-500">page name</label>
              <input
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                placeholder="About"
                className="mt-1 mb-3 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
              <label className="text-xs text-zinc-500">describe the page</label>
              <textarea
                value={pageDesc}
                onChange={(e) => setPageDesc(e.target.value)}
                placeholder="Hero with company story, team grid, contact CTA"
                rows={4}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowPageModal(false)}
                  className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  cancel
                </button>
                <button
                  onClick={createPage}
                  disabled={pageBusy || !pageName.trim() || !pageDesc.trim()}
                  className="flex items-center gap-2 rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {pageBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                  generate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activity button                                                     */
/* ------------------------------------------------------------------ */

function ActivityBtn({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative my-0.5 flex h-10 w-10 items-center justify-center rounded-md transition ${
        active
          ? "bg-white/5 text-sky-400"
          : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
      }`}
    >
      {icon}
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-sky-400" />
      )}
      {badge !== undefined && (
        <span className="absolute right-0.5 top-0.5 min-w-[16px] rounded-full bg-amber-500 px-1 text-[9px] font-bold text-black">
          {badge}
        </span>
      )}
    </button>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
