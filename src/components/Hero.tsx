import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-20 pb-28 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl text-center relative">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-8">
          <Sparkles className="h-3.5 w-3.5 text-cyan-accent" />
          <span>New · OrbitIntelligence v1.0 — Created by Srikar</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-[2.75rem] xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tight break-words">
          <span className="gradient-text">OrbitIntelligenceAI</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Your thoughts. Connected. An intelligent AI companion that learns how you think,
          remembers what matters, and replies in milliseconds.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/chat" className="group inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 font-semibold text-white neon-glow hover:scale-[1.03] transition" style={{ background: 'var(--gradient-neon)' }}>
            Start Chatting
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
          </Link>
          <a href="#features" className="inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 font-semibold glass hover:bg-white/10 transition">
            Explore Features
          </a>
        </motion.div>

        {/* Glowing orb */}
        <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 1 }}
          className="relative mt-20 mx-auto h-64 w-64 sm:h-80 sm:w-80">
          <div className="absolute inset-0 rounded-full animate-pulse-glow" style={{ background: 'radial-gradient(circle at 30% 30%, #c9a8ff, #7C4DFF 40%, #00E5FF 70%, #FF4D9D)' }} />
          <div className="absolute inset-6 rounded-full glass grid place-items-center">
            <Sparkles className="h-16 w-16 text-white/90" />
          </div>
          <div className="absolute -inset-8 rounded-full border border-white/10 animate-spin" style={{ animationDuration: '20s' }} />
          <div className="absolute -inset-16 rounded-full border border-white/5 animate-spin" style={{ animationDuration: '40s', animationDirection: 'reverse' }} />
        </motion.div>
      </div>
    </section>
  );
}
