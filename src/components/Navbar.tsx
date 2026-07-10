import { Link } from "@tanstack/react-router";
import { Sparkles, Sun, Moon, Brain, Zap, Code2 } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "default" | "genz" | "codey";

const MODES: { id: Mode; label: string; icon: any; sub: string }[] = [
  { id: "default", label: "Default", icon: Brain, sub: "for the nerds" },
  { id: "genz", label: "Gen-Z", icon: Zap, sub: "for humans" },
  { id: "codey", label: "Codey", icon: Code2, sub: "for Elon & Bezos" },
];

type Props = { mode?: Mode; onModeChange?: (m: Mode) => void };

export function Navbar({ mode = "genz", onModeChange }: Props) {
  const [light, setLight] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
  }, [light]);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 pt-3 sm:pt-4">
        <nav className="glass rounded-2xl px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          <Link to="/" className="flex items-center gap-2 group min-w-0 shrink">
            <div className="relative h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl grid place-items-center neon-glow" style={{ background: 'var(--gradient-neon)' }}>
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-display text-sm sm:text-lg font-bold gradient-text truncate">
                <span className="sm:hidden">Orbit</span>
                <span className="hidden sm:inline">OrbitIntelligenceAI</span>
              </div>
              <div className="hidden sm:block text-[10px] uppercase tracking-widest text-muted-foreground">Created by Srikar</div>
            </div>
          </Link>

          {onModeChange && (
            <div className="hidden lg:flex items-center gap-1 glass rounded-full p-1">
              {MODES.map((m) => {
                const Icon = m.icon;
                const active = mode === m.id;
                return (
                  <button key={m.id} onClick={() => onModeChange(m.id)} title={m.sub}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${active ? 'text-white neon-glow' : 'text-muted-foreground hover:text-white'}`}
                    style={active ? { background: 'var(--gradient-neon)' } : undefined}>
                    <Icon className="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onModeChange && (
              <select value={mode} onChange={(e) => onModeChange(e.target.value as Mode)}
                className="lg:hidden glass rounded-xl px-2 py-1.5 text-[11px] sm:text-xs font-semibold bg-transparent outline-none">
                {MODES.map((m) => (
                  <option key={m.id} value={m.id} className="bg-background">{m.label}</option>
                ))}
              </select>
            )}
            <button onClick={() => setLight(!light)} className="h-8 w-8 sm:h-9 sm:w-9 grid place-items-center rounded-xl glass hover:bg-white/10 transition shrink-0" aria-label="Toggle theme">
              {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <Link to="/chat" className="rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white neon-glow hover:scale-[1.03] transition shrink-0" style={{ background: 'var(--gradient-neon)' }}>
              Launch
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
