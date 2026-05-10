import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export function Onboarding() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('orbit_onboarded')) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    localStorage.setItem('orbit_onboarded', '1');
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={close}>
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass gradient-border rounded-3xl p-8 max-w-md w-full text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl grid place-items-center neon-glow animate-pulse-glow" style={{ background: 'var(--gradient-neon)' }}>
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h3 className="mt-5 text-2xl font-bold gradient-text">Welcome to OrbitIntelligence</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Hey, I'm OrbitIntelligenceAI. What's on your mind today? Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">⌘ K</kbd> any time to start a new chat.
            </p>
            <button onClick={close} className="mt-6 w-full rounded-2xl py-3 font-semibold text-white neon-glow hover:scale-[1.02] transition" style={{ background: 'var(--gradient-neon)' }}>
              Let's go ✨
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
