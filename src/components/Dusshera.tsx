import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Flame, Sparkles, ArrowRight, BowArrow, PartyPopper } from "lucide-react";

export function Dusshera() {
  return (
    <section className="relative px-4 sm:px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] glass border border-white/10 p-8 sm:p-12 text-center"
        >
          {/* festive glows */}
          <div
            className="absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-25 pointer-events-none"
            style={{ background: "var(--gradient-neon)" }}
          />

          <div className="relative">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-6"
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
            >
              <PartyPopper className="h-3.5 w-3.5 text-orange-400" />
              <span className="gradient-text">Happy Dussehra</span>
            </motion.div>

            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              May good always <span className="gradient-text">win</span> — inside you and around you
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-8">
              This Dussehra, burn the effigy of doubt and let your brightest ideas take the bow.
              OrbitIntelligenceAI is here for every big thought you chase this festive season.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/chat"
                className="group inline-flex items-center gap-3 rounded-2xl px-7 py-4 font-semibold text-white neon-glow hover:scale-[1.03] transition"
                style={{ background: "var(--gradient-neon)" }}
              >
                <Sparkles className="h-5 w-5" />
                Start Chatting
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </Link>

              <div
                className="inline-flex items-center gap-3 rounded-2xl px-7 py-4 font-semibold"
                style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
              >
                <BowArrow className="h-5 w-5 text-orange-400" />
                Aim big. Think bigger.
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <span
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
              >
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                Victory of good over evil
              </span>
              {["Vijayadashami vibes", "New beginnings", "Festive greetings from Srikar"].map((f) => (
                <span
                  key={f}
                  className="rounded-xl px-3 py-2"
                  style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
