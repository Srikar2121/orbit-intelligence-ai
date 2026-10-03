// Workspace persistence. Signed-in users sync to the cloud; everyone else
// keeps projects, plugins and chats in this browser (localStorage).
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listProjects, createProject, updateProject, deleteProject, getPlugins, savePlugins } from "@/lib/workspace.functions";
import { DEFAULT_ENABLED } from "@/lib/plugins";

export type Project = { id: string; name: string; description: string | null; icon: string; context: string | null; updated_at: string };
export type PluginState = { enabled: string[]; settings: Record<string, Record<string, string>> };
export type LocalThread = { id: string; title: string; mode: string; updated_at: string; project_id: string | null };
export type LocalMsg = { id: string; role: "user" | "assistant"; content: string };

const read = <T,>(k: string, fb: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fb; } catch { return fb; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full */ } };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

// ---------- Local chats (guests) ----------
export const localChats = {
  list: (): LocalThread[] => read<LocalThread[]>("orbit_threads", []).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  create: (title: string, mode: string, project_id: string | null): LocalThread => {
    const t = { id: uid(), title, mode, project_id, updated_at: new Date().toISOString() };
    write("orbit_threads", [t, ...read<LocalThread[]>("orbit_threads", [])]);
    return t;
  },
  remove: (id: string) => {
    write("orbit_threads", read<LocalThread[]>("orbit_threads", []).filter((t) => t.id !== id));
    localStorage.removeItem("orbit_msgs_" + id);
  },
  load: (id: string): LocalMsg[] => read<LocalMsg[]>("orbit_msgs_" + id, []),
  save: (id: string, role: "user" | "assistant", content: string) => {
    write("orbit_msgs_" + id, [...read<LocalMsg[]>("orbit_msgs_" + id, []), { id: uid(), role, content }]);
    write("orbit_threads", read<LocalThread[]>("orbit_threads", []).map((t) => (t.id === id ? { ...t, updated_at: new Date().toISOString() } : t)));
  },
  removeProject: (pid: string) => {
    const all = read<LocalThread[]>("orbit_threads", []);
    all.filter((t) => t.project_id === pid).forEach((t) => localStorage.removeItem("orbit_msgs_" + t.id));
    write("orbit_threads", all.filter((t) => t.project_id !== pid));
  },
};

export function useWorkspace(authed: boolean | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [plugins, setPluginState] = useState<PluginState>({ enabled: DEFAULT_ENABLED, settings: {} });
  const listFn = useServerFn(listProjects);
  const createFn = useServerFn(createProject);
  const updateFn = useServerFn(updateProject);
  const deleteFn = useServerFn(deleteProject);
  const getPlFn = useServerFn(getPlugins);
  const savePlFn = useServerFn(savePlugins);

  useEffect(() => {
    if (authed === null) return;
    if (authed) {
      listFn().then((r) => setProjects(r as Project[])).catch(() => {});
      getPlFn().then((p: any) => p && setPluginState({ enabled: p.enabled, settings: (p.settings ?? {}) as PluginState["settings"] })).catch(() => {});
    } else {
      setProjects(read<Project[]>("orbit_projects", []));
      setPluginState(read<PluginState>("orbit_plugins", { enabled: DEFAULT_ENABLED, settings: {} }));
    }
  }, [authed, listFn, getPlFn]);

  const persistLocal = (p: Project[]) => { setProjects(p); write("orbit_projects", p); };

  const addProject = useCallback(async (f: { name: string; description?: string | null; icon?: string; context?: string | null }) => {
    if (authed) {
      const row = (await createFn({ data: f })) as Project;
      setProjects((p) => [row, ...p]);
      return row;
    }
    const row: Project = { id: uid(), name: f.name, description: f.description ?? null, icon: f.icon ?? "🪐", context: f.context ?? null, updated_at: new Date().toISOString() };
    persistLocal([row, ...read<Project[]>("orbit_projects", [])]);
    return row;
  }, [authed, createFn]);

  const editProject = useCallback(async (id: string, f: Partial<Omit<Project, "id" | "updated_at">>) => {
    if (authed) {
      const row = (await updateFn({ data: { id, ...f, name: f.name ?? undefined, icon: f.icon ?? undefined } })) as Project;
      setProjects((p) => p.map((x) => (x.id === id ? row : x)));
      return;
    }
    persistLocal(read<Project[]>("orbit_projects", []).map((x) => (x.id === id ? { ...x, ...f, updated_at: new Date().toISOString() } : x)));
  }, [authed, updateFn]);

  const removeProject = useCallback(async (id: string) => {
    if (authed) await deleteFn({ data: { id } });
    else { persistLocal(read<Project[]>("orbit_projects", []).filter((x) => x.id !== id)); localChats.removeProject(id); }
    setProjects((p) => p.filter((x) => x.id !== id));
  }, [authed, deleteFn]);

  const setPlugins = useCallback((next: PluginState) => {
    setPluginState(next);
    if (authed) savePlFn({ data: next }).catch(() => {});
    else write("orbit_plugins", next);
  }, [authed, savePlFn]);

  return { projects, addProject, editProject, removeProject, plugins, setPlugins };
}
