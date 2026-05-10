import { Github, Twitter, Instagram, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-20 px-4 sm:px-6 pb-10">
      <div className="mx-auto max-w-7xl glass rounded-3xl p-8 sm:p-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center neon-glow" style={{ background: 'var(--gradient-neon)' }}>
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-display font-bold gradient-text text-lg">OrbitIntelligenceAI</div>
              <div className="text-xs text-muted-foreground">Your thoughts. Connected.</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {[Twitter, Instagram, Github].map((Icon, i) => (
              <a key={i} href="#" className="h-10 w-10 rounded-xl glass grid place-items-center hover:bg-white/10 transition">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} OrbitIntelligenceAI · All vibes reserved.</div>
          <div>Created by <span className="gradient-text font-semibold">Srikar</span></div>
        </div>
      </div>
    </footer>
  );
}
