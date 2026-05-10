import { motion } from "framer-motion";
import { Brain, Zap, MessageSquare, Sparkles, PenLine, Rocket } from "lucide-react";

const features = [
  { icon: MessageSquare, title: "Smart Conversations", desc: "Context-aware replies that actually feel human and relevant." },
  { icon: Brain, title: "AI Memory", desc: "Remembers your goals, preferences and the way you talk." },
  { icon: Zap, title: "Fast Responses", desc: "Streaming answers in milliseconds. No waiting around." },
  { icon: Sparkles, title: "Personalized Experience", desc: "Adapts tone, depth and vibe based on you." },
  { icon: PenLine, title: "Creative Writing", desc: "From poems to pitch decks — your idea, amplified." },
  { icon: Rocket, title: "Productivity Assistant", desc: "Plan, summarize and ship. BrightCore gets things done." },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <h2 className="text-4xl sm:text-5xl font-bold"><span className="gradient-text">Built for the way you think</span></h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Six superpowers wrapped in one beautifully fast AI companion.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="group relative glass rounded-3xl p-6 hover:bg-white/5 transition overflow-hidden">
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-0 group-hover:opacity-60 transition" style={{ background: 'var(--gradient-neon)', filter: 'blur(60px)' }} />
              <div className="relative">
                <div className="h-11 w-11 rounded-2xl grid place-items-center mb-4" style={{ background: 'var(--gradient-neon)' }}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
