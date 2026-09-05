import { motion } from "framer-motion";
import { Video, Calendar, Sparkles, ArrowRight } from "lucide-react";

export function TeachersDay() {
  const meetLink = "https://meet.google.com/joi-zkhe-bne";

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
          {/* ambient glow */}
          <div
            className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ background: "var(--gradient-neon)" }}
          />
          <div
            className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-20 pointer-events-none"
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
              <Sparkles className="h-3.5 w-3.5 text-cyan-accent" />
              <span className="gradient-text">Teachers' Day Special</span>
            </motion.div>

            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Celebrating the mentors who <span className="gradient-text">shape our future</span>
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-8">
              Join us for a live Teachers' Day meet on OrbitIntelligenceAI. Come hang out, share stories, and vibe with the community.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 rounded-2xl px-7 py-4 font-semibold text-white neon-glow hover:scale-[1.03] transition"
                style={{ background: "var(--gradient-neon)" }}
              >
                <Video className="h-5 w-5" />
                Join Google Meet
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </a>

              <div
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-4 text-sm font-medium"
                style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
              >
                <Calendar className="h-4 w-4 text-cyan-accent" />
                <span className="text-foreground/90">meet.google.com/joi-zkhe-bne</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
