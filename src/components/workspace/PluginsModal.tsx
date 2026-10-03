import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Settings2, X, Check } from "lucide-react";
import { PLUGINS, type PluginCategory } from "@/lib/plugins";
import type { PluginState } from "@/lib/workspace-store";

const CATS: ("All" | "Installed" | PluginCategory)[] = ["All", "Installed", "Live data", "Knowledge", "Utilities", "Finance"];

export function PluginsModal({ open, onClose, state, onChange }: {
  open: boolean; onClose: () => void; state: PluginState; onChange: (s: PluginState) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [settingsFor, setSettingsFor] = useState<string | null>(null);

  const list = useMemo(() => PLUGINS.filter((p) => {
    if (cat === "Installed" && !state.enabled.includes(p.id)) return false;
    if (cat !== "All" && cat !== "Installed" && p.category !== cat) return false;
    const s = q.trim().toLowerCase();
    return !s || p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s);
  }), [q, cat, state.enabled]);

  const toggle = (id: string) => onChange({
    ...state,
    enabled: state.enabled.includes(id) ? state.enabled.filter((x) => x !== id) : [...state.enabled, id],
  });
  const setSetting = (pid: string, key: string, val: string) =>
    onChange({ ...state, settings: { ...state.settings, [pid]: { ...(state.settings[pid] ?? {}), [key]: val } } });

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-3 sm:p-6" onClick={onClose}>
          <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Plugins"
            className="glass gradient-border rounded-3xl w-full max-w-3xl max-h-[88vh] flex flex-col">
            <div className="p-5 sm:p-6 border-b border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold gradient-text">Plugins</h2>
                  <p className="text-xs text-muted-foreground mt-1">Give Orbit live tools. Enabled plugins kick in automatically when your message needs them.</p>
                </div>
                <button onClick={onClose} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/10"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 glass rounded-xl flex items-center gap-2 px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plugins"
                  className="bg-transparent flex-1 py-2 text-sm outline-none placeholder:text-muted-foreground" />
              </div>
              <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
                {CATS.map((c) => (
                  <button key={c} onClick={() => setCat(c)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition ${cat === c ? "border-primary/60 bg-primary/15 text-foreground" : "border-white/10 text-muted-foreground hover:text-foreground"}`}>
                    {c}{c === "Installed" ? ` · ${state.enabled.length}` : ""}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 sm:p-6 overflow-auto scrollbar-thin grid sm:grid-cols-2 gap-3">
              {list.length === 0 && <div className="text-sm text-muted-foreground col-span-full text-center py-8">No plugins match.</div>}
              {list.map((p) => {
                const on = state.enabled.includes(p.id);
                return (
                  <div key={p.id} className={`rounded-2xl border p-4 transition ${on ? "border-primary/40 bg-primary/5" : "border-white/10 bg-white/[0.02]"}`}>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl grid place-items-center text-xl bg-white/5 border border-white/10 shrink-0">{p.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{p.name}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${on ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-muted-foreground"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-400" : "bg-muted-foreground"}`} />{on ? "Active" : "Off"}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{p.category}</div>
                        <p className="text-xs text-muted-foreground mt-1.5">{p.description}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => toggle(p.id)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${on ? "border border-white/15 hover:bg-white/5" : "text-white neon-glow"}`}
                        style={on ? undefined : { background: "var(--gradient-neon)" }}>
                        {on ? "Disable" : "Enable"}
                      </button>
                      {p.settings && (
                        <button onClick={() => setSettingsFor(settingsFor === p.id ? null : p.id)} aria-label={`${p.name} settings`}
                          className="h-8 w-8 grid place-items-center rounded-lg border border-white/15 hover:bg-white/5"><Settings2 className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                    {settingsFor === p.id && p.settings?.map((s) => (
                      <label key={s.key} className="mt-3 block text-[11px] text-muted-foreground">
                        {s.label}
                        <input defaultValue={state.settings[p.id]?.[s.key] ?? ""} placeholder={s.placeholder}
                          onBlur={(e) => setSetting(p.id, s.key, e.target.value.slice(0, 200))}
                          className="mt-1 w-full glass rounded-lg px-2.5 py-1.5 text-xs text-foreground bg-transparent outline-none" />
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-3 border-t border-white/10 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Check className="h-3 w-3" /> Changes save automatically.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
