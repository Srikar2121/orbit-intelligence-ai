import { Link } from "@tanstack/react-router";
import { Sparkles, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
  }, [light]);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4">
        <nav className="glass rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative h-9 w-9 rounded-xl grid place-items-center neon-glow" style={{ background: 'var(--gradient-neon)' }}>
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-bold gradient-text">BrightCore-AI</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Created by Srikar</div>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#preview" className="hover:text-foreground transition">Preview</a>
            <a href="#testimonials" className="hover:text-foreground transition">Reviews</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLight(!light)} className="h-9 w-9 grid place-items-center rounded-xl glass hover:bg-white/10 transition" aria-label="Toggle theme">
              {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <Link to="/chat" className="rounded-xl px-4 py-2 text-sm font-semibold text-white neon-glow hover:scale-[1.03] transition" style={{ background: 'var(--gradient-neon)' }}>
              Launch
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
