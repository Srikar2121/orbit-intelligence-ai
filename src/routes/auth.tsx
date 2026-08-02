import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Mail, Lock, User, Calendar, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : "",
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
  const dest = safeNext(next, "/chat");
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

  const signInWith = async (provider: "google" | "apple") => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}${dest}`,
    });
    if (res.error) {
      toast.error(res.error.message ?? `${provider} sign-in failed`);
      setBusy(false);
      return;
    }
    if (!res.redirected) window.location.href = dest;
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

        <button
          type="button"
          onClick={signInGoogle}
          disabled={busy}
          className="w-full glass rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/10 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.5-5.9 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 8 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.3a12 12 0 0 1-18.6-5.5l-6.5 5A20 20 0 0 0 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.4l6.3 5.3c-.4.4 6.7-4.9 6.7-14.7 0-1.2-.1-2.3-.4-3.5z"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4 text-[11px] text-muted-foreground">
          <div className="h-px bg-white/10 flex-1" /> or email <div className="h-px bg-white/10 flex-1" />
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
