import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Mail, Lock, User, Calendar, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Blobs } from "@/components/Blobs";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { upsertProfile } from "@/lib/chat.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · OrbitIntelligenceAI" },
      { name: "description", content: "Sign in or create your OrbitIntelligenceAI account." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined,
  }),
  component: AuthPage,
});

function safeNext(next: string, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

function ageFrom(date: string): number {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const dest = safeNext(next ?? "", "/chat");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birth, setBirth] = useState("");
  const [busy, setBusy] = useState(false);
  const save = useServerFn(upsertProfile);


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.href = dest;
    });
  }, [dest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!birth || ageFrom(birth) < 9) {
          toast.error("You must be at least 9 years old.");
          setBusy(false);
          return;
        }
        if (username.trim().length < 2) {
          toast.error("Pick a username (2+ characters).");
          setBusy(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${dest}` },
        });
        if (error) throw error;
        if (data.session) {
          await save({ data: { username: username.trim(), birth_date: birth } });
          toast.success("Welcome to Orbit ✨");
          window.location.href = dest;
        } else {
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back 💜");
        window.location.href = dest;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };




  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 mode-genz">
      <Blobs variant="genz" />
      <Link to="/" className="absolute top-4 left-4 glass rounded-xl h-10 px-3 flex items-center gap-2 text-sm hover:bg-white/10">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>
      <div className="glass gradient-border rounded-3xl p-6 sm:p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-xl grid place-items-center neon-glow" style={{ background: "var(--gradient-neon)" }}>
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold gradient-text text-lg">OrbitIntelligenceAI</div>
            <div className="text-[11px] text-muted-foreground">by Srikar</div>
          </div>
        </div>

        <div className="flex gap-1 p-1 glass rounded-full mb-5 text-sm">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-full font-semibold transition ${
                mode === m ? "text-white neon-glow" : "text-muted-foreground"
              }`}
              style={mode === m ? { background: "var(--gradient-neon)" } : undefined}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <>
              <Field icon={<User className="h-4 w-4" />} placeholder="Username" value={username} onChange={setUsername} />
              <Field icon={<Calendar className="h-4 w-4" />} placeholder="Date of birth" type="date" value={birth} onChange={setBirth} />
            </>
          )}
          <Field icon={<Mail className="h-4 w-4" />} placeholder="Email" type="email" value={email} onChange={setEmail} />
          <Field icon={<Lock className="h-4 w-4" />} placeholder="Password" type="password" value={password} onChange={setPassword} />

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white neon-glow disabled:opacity-50"
            style={{ background: "var(--gradient-neon)" }}
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {mode === "signup" && (
          <p className="text-[11px] text-muted-foreground mt-3 text-center">
            You must be at least 9 to create an account.
          </p>
        )}

        <Link to="/chat" className="mt-4 block text-center text-xs text-muted-foreground hover:text-white underline">
          Continue as guest (chats won't be saved)
        </Link>

      </div>
    </div>
  );
}

function Field({ icon, ...p }: { icon: React.ReactNode; placeholder: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="glass rounded-xl flex items-center gap-2 px-3">
      <span className="text-muted-foreground">{icon}</span>
      <input
        required
        type={p.type ?? "text"}
        placeholder={p.placeholder}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        className="bg-transparent flex-1 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
