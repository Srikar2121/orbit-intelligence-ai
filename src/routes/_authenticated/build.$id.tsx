import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  getBuildProject,
  updateBuildProject,
  generateCode,
  deployToVercel,
  getVercelStatus,
} from "@/lib/build.functions";

export const Route = createFileRoute("/_authenticated/build/$id")({
  head: () => ({
    meta: [{ title: "Editor · Build Mode" }, { name: "description", content: "Code with AI and deploy." }],
  }),
  component: Editor,
});

type FileMap = Record<string, string>;

function Editor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getBuildProject);
  const updateFn = useServerFn(updateBuildProject);
  const genFn = useServerFn(generateCode);
  const deployFn = useServerFn(deployToVercel);
  const vercelFn = useServerFn(getVercelStatus);

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

  const sortedPaths = useMemo(() => Object.keys(files).sort(), [files]);

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
      // save current edits first
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
        toast.success("Deployed! Building on Vercel...");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500 font-mono">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> loading editor...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-mono">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/build"
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="text-xs text-zinc-500">build</span>
          <span className="text-zinc-700">/</span>
          <span className="text-sm font-semibold text-zinc-100">{name}</span>
          {dirty && <span className="text-[10px] text-amber-400">●  unsaved</span>}
        </div>

        <div className="flex items-center gap-2">
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

        {/* Editor */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-1.5">
            <span className="text-xs text-zinc-500">{activePath || "no file selected"}</span>
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
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                tabSize: 2,
                lineHeight: 1.6,
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">Select a file</div>
          )}

          {/* AI prompt bar */}
          <div className="border-t border-zinc-800 bg-zinc-950/95 p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-emerald-400">
                  <Sparkles className="h-3 w-3" />
                  ai_generate
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
                  }}
                  placeholder="describe what to build or change... (⌘+enter to run)"
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
                {generating ? "thinking..." : "generate"}
              </button>
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {!vercelConnected && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-4 right-4 max-w-xs rounded-md border border-amber-900/60 bg-amber-950/60 p-3 text-xs text-amber-200 backdrop-blur"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Connect Vercel on the projects page to enable deploys.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
