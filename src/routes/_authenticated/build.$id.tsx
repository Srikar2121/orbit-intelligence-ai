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
  Save,
  Loader2,
  ExternalLink,
  Terminal,
  CheckCircle2,
  MessageSquare,
  Code2,
  Play,
  Download,
  Smartphone,
  FilePlus,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { SandpackProvider, SandpackLayout, SandpackPreview, SandpackConsole } from "@codesandbox/sandpack-react";
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
    meta: [{ title: "Editor · Build Mode" }, { name: "description", content: "Chat, code, preview and deploy." }],
  }),
  component: Editor,
});

type FileMap = Record<string, string>;
type ChatMsg = { role: "user" | "assistant"; content: string };
type RightTab = "preview" | "chat";

function Editor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getBuildProject);
  const updateFn = useServerFn(updateBuildProject);
  const genFn = useServerFn(generateCode);
  const deployFn = useServerFn(deployToVercel);
  const vercelFn = useServerFn(getVercelStatus);
  const chatFn = useServerFn(chatBuild);
  const pageFn = useServerFn(generatePage);

  const [name, setName] = useState("");
  const [files, setFiles] = useState<FileMap>({});
  const [activePath, setActivePath] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const [deploying, setDeploying] = useState(false);
  const [lastDeployUrl, setLastDeployUrl] = useState<string | null>(null);
  const [vercelConnected, setVercelConnected] = useState(false);

  const [rightTab, setRightTab] = useState<RightTab>("chat");
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { role: "assistant", content: "Hey! Tell me what site or page you want to build and I'll write the code." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [showPageModal, setShowPageModal] = useState(false);
  const [pageName, setPageName] = useState("");
  const [pageDesc, setPageDesc] = useState("");
  const [pageBusy, setPageBusy] = useState(false);

  const [showDownload, setShowDownload] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [proj, v] = await Promise.all([getFn({ data: { id } }), vercelFn()]);
        setName(proj.name);
        const f = (proj.files ?? {}) as FileMap;
        setFiles(f);
        setLastDeployUrl(proj.last_deploy_url ?? null);
        setVercelConnected(v.connected);
        const first = Object.keys(f).find((p) => p.endsWith(".jsx") || p.endsWith(".tsx")) ?? Object.keys(f)[0] ?? "";
        setActivePath(first);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
        navigate({ to: "/build" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMsgs, chatBusy]);

  const sortedPaths = useMemo(() => Object.keys(files).sort(), [files]);

  // Sandpack files (only src/ + index.html)
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
      const pkg = JSON.parse(files["package.json"] ?? "{}") as { dependencies?: Record<string, string> };
      return pkg.dependencies ?? { react: "^18.3.1", "react-dom": "^18.3.1" };
    } catch {
      return { react: "^18.3.1", "react-dom": "^18.3.1" };
    }
  }, [files]);

  const save = async () => {
    setSaving(true);
    try {
      await updateFn({ data: { id, files } });
      setDirty(false);
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      if (dirty) {
        await updateFn({ data: { id, files } });
        setDirty(false);
      }
      const result = await genFn({ data: { projectId: id, prompt: prompt.trim() } });
      setFiles(result.files as FileMap);
      setPrompt("");
      toast.success(`Updated ${result.changedFiles.length} file(s)`);
      if (result.changedFiles[0]) setActivePath(result.changedFiles[0]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
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
      if (dirty) {
        await updateFn({ data: { id, files } });
        setDirty(false);
      }
      const result = await chatFn({ data: { projectId: id, messages: nextMsgs } });
      setFiles(result.files as FileMap);
      const tail =
        result.changedFiles.length > 0
          ? `\n\n_Updated ${result.changedFiles.length} file(s): ${result.changedFiles.join(", ")}_`
          : "";
      setChatMsgs((m) => [...m, { role: "assistant", content: result.reply + tail }]);
      if (result.changedFiles[0]) setActivePath(result.changedFiles[0]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chat failed";
      setChatMsgs((m) => [...m, { role: "assistant", content: "⚠️ " + msg }]);
    } finally {
      setChatBusy(false);
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
      if (result.changedFiles[0]) setActivePath(result.changedFiles[0]);
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
      if (dirty) {
        await updateFn({ data: { id, files } });
        setDirty(false);
      }
      const result = await deployFn({ data: { projectId: id } });
      if (result.url) {
        setLastDeployUrl(result.url);
        toast.success("Deployed! Installable as PWA from the live URL.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "") || "app";

  const downloadSource = async () => {
    const zip = new JSZip();
    for (const [p, c] of Object.entries(files)) zip.file(p, c);
    zip.file(
      "README.md",
      `# ${name}\n\nRun locally:\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n\nBuild: \`npm run build\`\n`,
    );
    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(blob, `${slug}-source.zip`);
    setShowDownload(false);
  };

  const downloadStandalone = () => {
    // Single self-contained HTML using esm.sh + babel-standalone for instant offline preview
    const appJsx = files["src/App.jsx"] ?? `export default function App(){return <h1>Hello</h1>}`;
    const cssFiles = Object.entries(files)
      .filter(([p]) => p.endsWith(".css"))
      .map(([, c]) => c)
      .join("\n");
    const otherJsx = Object.entries(files)
      .filter(([p]) => p.startsWith("src/") && (p.endsWith(".jsx") || p.endsWith(".js")) && p !== "src/App.jsx" && p !== "src/main.jsx")
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500 font-mono">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> loading editor...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100 font-mono overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 py-2.5 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/build" className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="text-xs text-zinc-500">build</span>
          <span className="text-zinc-700">/</span>
          <span className="text-sm font-semibold text-zinc-100 truncate">{name}</span>
          {dirty && <span className="text-[10px] text-amber-400 shrink-0">●  unsaved</span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPageModal(true)}
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
          >
            <FilePlus className="h-3 w-3" />
            new page
          </button>
          <div className="relative">
            <button
              onClick={() => setShowDownload((v) => !v)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-700"
            >
              <Download className="h-3 w-3" />
              download
            </button>
            {showDownload && (
              <div className="absolute right-0 top-full mt-1 w-64 rounded-md border border-zinc-800 bg-zinc-950 p-1 text-xs shadow-2xl z-30">
                <button onClick={downloadSource} className="block w-full rounded px-3 py-2 text-left text-zinc-200 hover:bg-zinc-900">
                  📦 Source ZIP <span className="text-zinc-500">— npm install &amp; run</span>
                </button>
                <button onClick={downloadStandalone} className="block w-full rounded px-3 py-2 text-left text-zinc-200 hover:bg-zinc-900">
                  🌐 Standalone HTML <span className="text-zinc-500">— one file, no build</span>
                </button>
                <div className="border-t border-zinc-800 my-1" />
                <div className="px-3 py-2 text-zinc-500">
                  <div className="flex items-center gap-1.5 text-zinc-300 mb-0.5"><Smartphone className="h-3 w-3"/>Mobile / Desktop install</div>
                  Deploy, then "Add to Home Screen" (mobile) or install icon in address bar (desktop). PWA is already wired in.
                </div>
              </div>
            )}
          </div>
          {lastDeployUrl && (
            <a
              href={lastDeployUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-950"
            >
              <ExternalLink className="h-3 w-3" />
              live
            </a>
          )}
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-700 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            save
          </button>
          <button
            onClick={deploy}
            disabled={deploying}
            className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {deploying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
            {deploying ? "deploying..." : "deploy"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950/60 py-2 text-xs">
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-600">files</div>
          {sortedPaths.map((p) => (
            <button
              key={p}
              onClick={() => setActivePath(p)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition ${
                activePath === p
                  ? "bg-emerald-950/40 text-emerald-300"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              {p.includes("/") ? <Folder className="h-3 w-3 shrink-0" /> : <FileIcon className="h-3 w-3 shrink-0" />}
              <span className="truncate">{p}</span>
            </button>
          ))}
        </aside>

        {/* Editor column */}
        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-1.5">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5"><Code2 className="h-3 w-3"/>{activePath || "no file selected"}</span>
          </div>
          {activePath ? (
            <textarea
              value={files[activePath] ?? ""}
              onChange={(e) => {
                setFiles((f) => ({ ...f, [activePath]: e.target.value }));
                setDirty(true);
              }}
              spellCheck={false}
              className="flex-1 resize-none bg-zinc-950 p-4 text-sm text-zinc-100 outline-none"
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", tabSize: 2, lineHeight: 1.6 }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">Select a file</div>
          )}

          {/* AI inline edit */}
          <div className="border-t border-zinc-800 bg-zinc-950/95 p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-emerald-400">
                  <Sparkles className="h-3 w-3" /> ai_edit
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
                  }}
                  placeholder="describe a change to current files... (⌘+enter)"
                  rows={2}
                  className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-700"
                />
              </div>
              <button
                onClick={generate}
                disabled={generating || !prompt.trim()}
                className="flex h-[68px] items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-40"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "..." : "run"}
              </button>
            </div>
          </div>
        </main>

        {/* Right panel: preview / chat */}
        <aside className="w-[440px] shrink-0 flex flex-col border-l border-zinc-800 bg-zinc-950">
          <div className="flex border-b border-zinc-800 text-xs">
            <button
              onClick={() => setRightTab("preview")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition ${
                rightTab === "preview" ? "bg-zinc-900 text-emerald-300 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              <Play className="h-3 w-3" /> live preview
            </button>
            <button
              onClick={() => setRightTab("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition ${
                rightTab === "chat" ? "bg-zinc-900 text-emerald-300 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              <MessageSquare className="h-3 w-3" /> chat builder
            </button>
          </div>

          {rightTab === "preview" ? (
            <div className="flex-1 overflow-hidden bg-white">
              <SandpackProvider
                key={JSON.stringify(Object.keys(sandpackFiles))}
                template="vite-react"
                files={sandpackFiles}
                customSetup={{ dependencies: sandpackDeps }}
                options={{ recompileMode: "delayed", recompileDelay: 600 }}
                theme="dark"
              >
                <SandpackLayout style={{ height: "100%", border: "none", borderRadius: 0 }}>
                  <SandpackPreview style={{ height: "70%" }} showOpenInCodeSandbox={false} showRefreshButton />
                  <SandpackConsole style={{ height: "30%" }} />
                </SandpackLayout>
              </SandpackProvider>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {chatMsgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-emerald-500 text-black"
                          : "bg-zinc-900 text-zinc-100 border border-zinc-800"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatBusy && (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-400 flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> thinking...
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-zinc-800 p-2">
                <div className="flex gap-2">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendChat();
                      }
                    }}
                    placeholder="build me a landing page with..."
                    rows={2}
                    className="flex-1 resize-none rounded-md border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-700"
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatBusy || !chatInput.trim()}
                    className="rounded-md bg-emerald-500 px-3 text-black transition hover:bg-emerald-400 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <AnimatePresence>
        {!vercelConnected && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-4 right-4 max-w-xs rounded-md border border-amber-900/60 bg-amber-950/60 p-3 text-xs text-amber-200 backdrop-blur z-20"
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
              className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <FilePlus className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-semibold">Generate a new page</h2>
              </div>
              <label className="text-xs text-zinc-500">page name</label>
              <input
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                placeholder="About"
                className="w-full mt-1 mb-3 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-700"
              />
              <label className="text-xs text-zinc-500">describe the page</label>
              <textarea
                value={pageDesc}
                onChange={(e) => setPageDesc(e.target.value)}
                placeholder="Hero with company story, team grid, contact CTA"
                rows={4}
                className="w-full mt-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-700"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowPageModal(false)} className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">
                  cancel
                </button>
                <button
                  onClick={createPage}
                  disabled={pageBusy || !pageName.trim() || !pageDesc.trim()}
                  className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50 flex items-center gap-2"
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
