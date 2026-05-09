import { motion } from "framer-motion";
import { Sparkles, Plus, Send } from "lucide-react";

export function ChatPreview() {
  return (
    <section id="preview" className="relative py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold"><span className="gradient-text">A chat that feels alive</span></h2>
          <p className="mt-4 text-muted-foreground">Glassy, gradient, and ridiculously smooth.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="glass rounded-3xl overflow-hidden gradient-border">
          <div className="grid md:grid-cols-[260px_1fr] min-h-[480px]">
            {/* Sidebar */}
            <aside className="border-r border-white/10 p-4 space-y-3 hidden md:block">
              <button className="w-full rounded-xl py-2 text-sm font-semibold text-white flex items-center gap-2 justify-center" style={{ background: 'var(--gradient-neon)' }}>
                <Plus className="h-4 w-4" /> New chat
              </button>
              <div className="space-y-1.5 text-sm">
                {["Trip to Tokyo ✈️", "Startup name ideas", "Resume rewrite", "Late night thoughts", "Python bug fix"].map((t, i) => (
                  <div key={t} className={`px-3 py-2 rounded-lg cursor-pointer truncate ${i === 0 ? 'bg-white/10' : 'hover:bg-white/5 text-muted-foreground'}`}>{t}</div>
                ))}
              </div>
            </aside>

            {/* Chat */}
            <div className="flex flex-col">
              <div className="flex-1 p-6 space-y-4 overflow-hidden">
                <div className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white" style={{ background: 'var(--gradient-neon)' }}>
                    Plan me a 5-day Tokyo trip — vibes only ✨
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-xl grid place-items-center shrink-0" style={{ background: 'var(--gradient-neon)' }}>
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="max-w-[75%] glass rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm">
                    Bet. Day 1: Shibuya neon walk + golden gai cocktails. Day 2: teamLab Planets at sunrise. Want me to keep going?
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-xl grid place-items-center shrink-0" style={{ background: 'var(--gradient-neon)' }}>
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-white/70 typing-dot" />
                    <span className="h-2 w-2 rounded-full bg-white/70 typing-dot" style={{ animationDelay: '0.15s' }} />
                    <span className="h-2 w-2 rounded-full bg-white/70 typing-dot" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/10">
                <div className="glass rounded-2xl flex items-center gap-2 p-2 gradient-border">
                  <input disabled placeholder="Message Mindmesh…" className="flex-1 bg-transparent px-3 py-2 outline-none text-sm" />
                  <button className="h-9 w-9 rounded-xl grid place-items-center text-white" style={{ background: 'var(--gradient-neon)' }}>
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
