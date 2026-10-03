import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Project } from "@/lib/workspace-store";

const ICONS = ["🪐", "🚀", "🧠", "📚", "💡", "🎨", "🧪", "💼", "🎮", "🏏", "✍️", "🌱"];

export type ProjectDraft = { name: string; description: string; icon: string; context: string };

export function ProjectDialog({ open, initial, onClose, onSubmit }: {
  open: boolean; initial?: Project | null; onClose: () => void; onSubmit: (d: ProjectDraft) => Promise<void> | void;
}) {
  const [d, setD] = useState<ProjectDraft>({ name: "", description: "", icon: "🪐", context: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setD({ name: initial?.name ?? "", description: initial?.description ?? "", icon: initial?.icon ?? "🪐", context: initial?.context ?? "" });
  }, [open, initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.name.trim() || busy) return;
    setBusy(true);
    try { await onSubmit({ ...d, name: d.name.trim() }); onClose(); } finally { setBusy(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
          <motion.form onSubmit={submit} initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()} className="glass gradient-border rounded-3xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold gradient-text">{initial ? "Edit project" : "New project"}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((i) => (
                <button type="button" key={i} onClick={() => setD({ ...d, icon: i })}
                  className={`h-9 w-9 rounded-xl text-lg grid place-items-center border transition ${d.icon === i ? "border-primary/60 bg-primary/15" : "border-white/10 hover:bg-white/5"}`}>{i}</button>
              ))}
            </div>
            <Field label="Name"><input autoFocus required maxLength={80} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Science fair" className={inp} /></Field>
            <Field label="Description (optional)"><input maxLength={500} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} placeholder="What's this project about?" className={inp} /></Field>
            <Field label="Project context — Orbit reads this in every chat here">
              <textarea maxLength={4000} rows={4} value={d.context} onChange={(e) => setD({ ...d, context: e.target.value })}
                placeholder="Goals, background, tone, facts Orbit should remember…" className={inp + " resize-none"} />
            </Field>
            <button type="submit" disabled={busy || !d.name.trim()} className="w-full rounded-xl py-2.5 text-sm font-semibold text-white neon-glow disabled:opacity-50" style={{ background: "var(--gradient-neon)" }}>
              {busy ? "Saving…" : initial ? "Save changes" : "Create project"}
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const inp = "mt-1 w-full glass rounded-xl px-3 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-[11px] text-muted-foreground">{label}{children}</label>;
}
