import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { ClipboardCheck, Trash2 } from "lucide-react";
import { gradeSubmission, listGrades, deleteGrade } from "@/lib/portal.functions";

type Grade = Awaited<ReturnType<typeof listGrades>>[number];

export function GradingSimulator() {
  const grade = useServerFn(gradeSubmission);
  const load = useServerFn(listGrades);
  const remove = useServerFn(deleteGrade);

  const [form, setForm] = useState({
    studentName: "",
    assignment: "",
    subject: "",
    rubric: "",
    submission: "",
    maxScore: 100,
    save: true,
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; letter: string; feedback: string } | null>(null);
  const [history, setHistory] = useState<Grade[]>([]);

  const refresh = async () => {
    try {
      setHistory(await load({}));
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await grade({ data: form });
      setResult({ score: res.score, maxScore: res.maxScore, letter: res.letter, feedback: res.feedback });
      if (form.save) await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not grade this.");
    } finally {
      setBusy(false);
    }
  };

  const pct = result ? Math.round((result.score / result.maxScore) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-cyan-accent" />
          <h3 className="font-semibold text-sm">Grading simulator</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} placeholder="Student name"
            className="glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none" />
          <input value={form.assignment} onChange={(e) => setForm({ ...form, assignment: e.target.value })} placeholder="Assignment title"
            className="glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none" />
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject / grade level"
            className="glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none" />
          <input type="number" min={1} max={1000} value={form.maxScore}
            onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) || 100 })} placeholder="Max score"
            className="glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none" />
        </div>
        <textarea value={form.rubric} onChange={(e) => setForm({ ...form, rubric: e.target.value })} rows={3}
          placeholder="Rubric or marking criteria (optional)"
          className="w-full glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none resize-y" />
        <textarea value={form.submission} onChange={(e) => setForm({ ...form, submission: e.target.value })} rows={7}
          placeholder="Paste the student's work here…"
          className="w-full glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none resize-y" />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={form.save} onChange={(e) => setForm({ ...form, save: e.target.checked })} /> Save to my gradebook
          </label>
          <button onClick={() => void run()} disabled={busy || !form.studentName || !form.assignment || !form.submission}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white neon-glow disabled:opacity-50"
            style={{ background: "var(--gradient-neon)" }}>
            {busy ? "Grading…" : "Grade it"}
          </button>
        </div>
      </div>

      {result && (
        <div className="glass gradient-border rounded-3xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-2xl grid place-items-center neon-glow font-display text-lg font-extrabold text-white"
              style={{ background: "var(--gradient-neon)" }}>
              {result.letter || `${pct}%`}
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{result.score} / {result.maxScore}</div>
              <div className="text-xs text-muted-foreground">{pct}% · {form.studentName}</div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-4">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gradient-neon)" }} />
          </div>
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{result.feedback}</ReactMarkdown>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-widest text-muted-foreground">Gradebook</h4>
          {history.map((g) => (
            <div key={g.id} className="glass rounded-2xl p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-sm">{g.student_name} — {g.assignment}</div>
                <div className="text-[11px] text-muted-foreground">
                  {g.score}/{g.max_score}{g.letter ? ` · ${g.letter}` : ""} · {new Date(g.created_at).toLocaleDateString()}
                </div>
              </div>
              <button onClick={async () => { await remove({ data: { id: g.id } }); await refresh(); }}
                className="glass rounded-lg h-8 w-8 grid place-items-center hover:bg-white/10" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
