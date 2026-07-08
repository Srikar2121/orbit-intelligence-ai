import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ArrowLeft, Code2, Rocket, Terminal, ExternalLink, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  listBuildProjects,
  createBuildProject,
  deleteBuildProject,
  getVercelStatus,
  saveVercelToken,
  disconnectVercel,
} from "@/lib/build.functions";

export const Route = createFileRoute("/_authenticated/build")({
  head: () => ({
    meta: [
      { title: "Build Mode · OrbitIntelligenceAI" },
      { name: "description", content: "Create, code with AI, and one-click deploy to Vercel." },
    ],
  }),
  component: BuildHome,
});

type Project = Awaited<ReturnType<typeof listBuildProjects>>[number];

function BuildHome() {
  const navigate = useNavigate();
  const listFn = useServerFn(listBuildProjects);
  const createFn = useServerFn(createBuildProject);
  const delFn = useServerFn(deleteBuildProject);
  const vercelStatusFn = useServerFn(getVercelStatus);
  const saveTokenFn = useServerFn(saveVercelToken);
  const disconnectFn = useServerFn(disconnectVercel);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [vercelConnected, setVercelConnected] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState("");
  const [savingToken, setSavingToken] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, v] = await Promise.all([listFn(), vercelStatusFn()]);
        setProjects(p);
        setVercelConnected(v.connected);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const create = async () => {
    if (!newName.trim()) return;
    try {
      const row = await createFn({ data: { name: newName.trim() } });
      setNewName("");
      setCreating(false);
      navigate({ to: "/build/$id", params: { id: row.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await delFn({ data: { id } });
      setProjects((p) => p.filter((x) => x.id !== id));
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const saveToken = async () => {
    setSavingToken(true);
    try {
      await saveTokenFn({ data: { token: token.trim() } });
      setVercelConnected(true);
      setShowToken(false);
      setToken("");
      toast.success("Vercel connected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid token");
    } finally {
      setSavingToken(false);
    }
  };

  const disconnect = async () => {
    try {
      await disconnectFn();
      setVercelConnected(false);
      toast.success("Disconnected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono">
      {/* Subtle grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <header className="relative border-b border-zinc-800/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/chat"
              className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-emerald-400" />
              <span className="text-sm tracking-widest text-zinc-500">BUILD_MODE</span>
              <span className="text-emerald-400">/</span>
              <span className="text-sm text-zinc-100">projects</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {vercelConnected ? (
              <button
                onClick={disconnect}
                className="flex items-center gap-2 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-950"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                vercel://connected
              </button>
            ) : (
              <button
                onClick={() => setShowToken(true)}
                className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-700"
              >
                <KeyRound className="h-3.5 w-3.5" />
                connect vercel
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-50">
            $ projects<span className="animate-pulse text-emerald-400">_</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Write code. Generate with AI. Ship to Vercel in one click.
          </p>
        </div>

        {/* Capabilities strip — new IDE features */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "◈", title: "Multi-file AI edits", desc: "AI edits across your whole tree in one turn." },
            { icon: "▶", title: "Live preview", desc: "Sandpack hot-reload as you type." },
            { icon: "◆", title: "Starter templates", desc: "Kick off from a template below." },
            { icon: "↗", title: "One-click deploy", desc: "Ship to Vercel from the sidebar." },
          ].map((c) => (
            <div key={c.title} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <span>{c.icon}</span>
                <span className="text-zinc-100">{c.title}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Starter templates */}
        <div className="mb-8">
          <div className="mb-2 text-xs uppercase tracking-wider text-zinc-500">start from a template</div>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "landing-page", label: "Landing page" },
              { name: "portfolio-site", label: "Portfolio" },
              { name: "saas-dashboard", label: "SaaS dashboard" },
              { name: "blog-starter", label: "Blog" },
              { name: "todo-app", label: "Todo app" },
            ].map((t) => (
              <button
                key={t.name}
                onClick={() => { setNewName(t.name); setCreating(true); }}
                className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
              >
                + {t.label}
              </button>
            ))}
          </div>
        </div>


        <div className="mb-6">
          {creating ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") create();
                  if (e.key === "Escape") {
                    setCreating(false);
                    setNewName("");
                  }
                }}
                placeholder="project-name"
                className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-700"
              />
              <button
                onClick={create}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                create
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
                className="rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
              >
                cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-md border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
            >
              <Plus className="h-4 w-4" />
              new project
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-zinc-500">loading...</div>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-12 text-center">
            <Code2 className="mx-auto h-10 w-10 text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">No projects yet. Create one to start building.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {projects.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-emerald-700/60"
                >
                  <Link to="/build/$id" params={{ id: p.id }} className="block">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-sm font-semibold text-zinc-100">{p.name}</h3>
                      <Code2 className="h-4 w-4 text-zinc-600" />
                    </div>
                    {p.description && (
                      <p className="mb-3 line-clamp-2 text-xs text-zinc-500">{p.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-600">
                      <span>{p.framework}</span>
                      {p.last_deploy_url && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-500">deployed</span>
                        </>
                      )}
                    </div>
                  </Link>
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    {p.last_deploy_url && (
                      <a
                        href={p.last_deploy_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => remove(p.id)}
                      className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Vercel token modal */}
      <AnimatePresence>
        {showToken && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowToken(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-6 font-mono"
            >
              <div className="mb-4 flex items-center gap-2">
                <Rocket className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-zinc-100">Connect Vercel</h2>
              </div>
              <p className="mb-4 text-xs text-zinc-400">
                Paste your Vercel API token to enable one-click deploys. Create one at{" "}
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 underline"
                >
                  vercel.com/account/tokens
                </a>
                .
              </p>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="vercel_xxxxxxxxxxxx"
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-700"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowToken(false)}
                  className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  cancel
                </button>
                <button
                  onClick={saveToken}
                  disabled={savingToken || !token.trim()}
                  className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {savingToken ? "verifying..." : "connect"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
