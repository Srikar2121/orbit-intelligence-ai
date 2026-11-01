// Guest (no-account) Build Mode persistence. Projects and files live in this
// browser only; AI generation goes through the public /api/public/build-ai route.
import { STARTER_FILES } from "@/lib/build-starter";

export type LocalBuild = {
  id: string;
  name: string;
  description: string | null;
  framework: string;
  files: Record<string, string>;
  last_deploy_url: string | null;
  last_deploy_status: string | null;
  last_deployed_at: string | null;
  updated_at: string;
};

const read = <T,>(k: string, fb: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fb; } catch { return fb; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full */ } };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

const KEY = "orbit_build_projects";

const touch = (id: string, patch: Partial<LocalBuild>) => {
  write(KEY, read<LocalBuild[]>(KEY, []).map((p) => (p.id === id ? { ...p, ...patch, updated_at: new Date().toISOString() } : p)));
};

export const localBuilds = {
  list: (): LocalBuild[] => read<LocalBuild[]>(KEY, []).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  get: (id: string): LocalBuild | undefined => read<LocalBuild[]>(KEY, []).find((p) => p.id === id),
  create: (name: string): LocalBuild => {
    const p: LocalBuild = {
      id: uid(),
      name,
      description: null,
      framework: "vite-react",
      files: STARTER_FILES,
      last_deploy_url: null,
      last_deploy_status: null,
      last_deployed_at: null,
      updated_at: new Date().toISOString(),
    };
    write(KEY, [p, ...read<LocalBuild[]>(KEY, [])]);
    return p;
  },
  saveFiles: (id: string, files: Record<string, string>) => touch(id, { files }),
  rename: (id: string, name: string, description?: string | null) => touch(id, { name, description: description ?? null }),
  remove: (id: string) => write(KEY, read<LocalBuild[]>(KEY, []).filter((p) => p.id !== id)),
};

/** Guest AI calls for Build Mode — no account needed. */
export async function fetchBuildAI(body: {
  action: "chat" | "generate" | "page";
  files: Record<string, string>;
  prompt?: string;
  pageName?: string;
  description?: string;
  messages?: { role: "user" | "assistant"; content: string }[];
}): Promise<{ reply?: string; changedFiles: string[]; componentName?: string; files: Record<string, string> }> {
  const r = await fetch("/api/public/build-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await r.json().catch(() => ({}))) as { error?: string; reply?: string; files?: Record<string, string>; componentName?: string };
  if (!r.ok) throw new Error(j.error ?? `AI error ${r.status}`);
  const changed: Record<string, string> = j.files ?? {};
  return { reply: j.reply, changedFiles: Object.keys(changed), componentName: j.componentName, files: changed };
}
