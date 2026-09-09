import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, GraduationCap } from "lucide-react";
import { askTeacherBot } from "@/lib/portal.functions";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK = [
  "Write a 40-minute lesson plan on photosynthesis for grade 7",
  "Make a 10-question quiz with answer key on fractions",
  "Build a 4-level rubric for a persuasive essay",
  "Differentiate this lesson for struggling and advanced learners",
  "Draft a friendly parent email about missing homework",
  "Give me 5 quick classroom energisers under 5 minutes",
];

export function TeacherBot() {
  const ask = useServerFn(askTeacherBot);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || busy) return;
    const history = messages.slice(-10);
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({ data: { prompt, history } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The assistant could not answer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-3xl p-4 sm:p-6 flex flex-col" style={{ minHeight: "60vh" }}>
      {messages.length === 0 ? (
        <div className="flex-1 grid place-items-center text-center py-8">
          <div>
            <div className="h-14 w-14 mx-auto rounded-2xl grid place-items-center neon-glow mb-4" style={{ background: "var(--gradient-neon)" }}>
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-1">Orbit Teach</h2>
            <p className="text-sm text-muted-foreground mb-6">Lesson plans, quizzes, rubrics, parent emails — ask for anything.</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {QUICK.map((q) => (
                <button key={q} onClick={() => void send(q)} className="glass rounded-xl px-3 py-2 text-xs text-left hover:bg-white/10">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto max-h-[60vh] pr-1">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "text-white neon-glow" : "glass"}`}
                style={m.role === "user" ? { background: "var(--gradient-neon)" } : undefined}
              >
                {m.role === "user" ? (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="glass rounded-2xl px-4 py-3 text-xs text-muted-foreground inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-cyan-accent" /> thinking…
            </div>
          )}
        </div>
      )}

      <div className="mt-4 glass rounded-2xl flex items-end gap-2 p-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder="Ask for a lesson plan, quiz, rubric…"
          className="flex-1 bg-transparent outline-none text-sm px-2 py-2 resize-none max-h-40"
        />
        <button
          onClick={() => void send(input)}
          disabled={busy || !input.trim()}
          className="h-9 w-9 grid place-items-center rounded-xl text-white neon-glow disabled:opacity-40"
          style={{ background: "var(--gradient-neon)" }}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
