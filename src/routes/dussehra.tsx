import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Flame, Sparkles, BowArrow, PartyPopper, Wand2, Copy, Check } from "lucide-react";
import { Blobs } from "@/components/Blobs";
import { toast } from "sonner";

export const Route = createFileRoute("/dussehra")({
  head: () => ({
    meta: [
      { title: "Dussehra Portal · OrbitIntelligenceAI" },
      { name: "description", content: "Celebrate Dussehra with OrbitIntelligenceAI — festive greetings, wishes and the victory of good over evil." },
      { property: "og:title", content: "Dussehra Portal · OrbitIntelligenceAI" },
      { property: "og:description", content: "Festive greetings and wishes for Vijayadashami." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DussehraPortal,
});

const WISHES = [
  "May the light of Dussehra burn away every doubt and light up your boldest ideas. Happy Vijayadashami! 🏹",
  "This Dussehra, may good win in your heart, your home, and every dream you're chasing. ✨",
  "Burn the effigy of fear. Aim your arrow at something great. Happy Dussehra! 🔥",
  "Wishing you ten heads of courage and one heart full of light. Happy Vijayadashami! 🎆",
  "May your victories be as grand as Ravana's fall and your joys as bright as the festive lights. 🪔",
];

const FACTS = [
  { title: "Vijayadashami", text: "The 'tenth day of victory' — marking Lord Rama's triumph over Ravana and Goddess Durga's victory over Mahishasura." },
  { title: "Effigy burning", text: "Giant effigies of Ravana, Meghnath and Kumbhakarna are set ablaze across India, symbolizing the destruction of evil." },
  { title: "New beginnings", text: "Considered one of the most auspicious days to start something new — a venture, a skill, or a big idea." },
  { title: "Ayudha Puja", text: "In many regions, tools, books and instruments are worshipped — a tribute to the things that help us build." },
];

function DussehraPortal() {
  const [name, setName] = useState("");
  const [wish, setWish] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const base = WISHES[Math.floor(Math.random() * WISHES.length)];
    setWish(name.trim() ? `${name.trim()}, ${base}` : base);
    setCopied(false);
  };

  const copy = async () => {
    if (!wish) return;
    try {
      await navigator.clipboard.writeText(wish);
      setCopied(true);
      toast.success("Wish copied — share the festive vibes!");
    } catch {
      toast.error("Could not copy.");
    }
  };

  return (
    <div className="relative min-h-screen mode-genz">
      <Blobs variant="genz" />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between gap-3 mb-8">
          <Link to="/" className="glass rounded-xl h-10 px-3 flex items-center gap-2 text-sm hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold gradient-text">Dussehra Portal</h1>
          <Link to="/chat" className="glass rounded-xl h-10 px-3 flex items-center text-sm hover:bg-white/10">
            Chat
          </Link>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] glass border border-white/10 p-8 sm:p-12 text-center mb-8"
        >
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }} />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-25 pointer-events-none"
            style={{ background: "var(--gradient-neon)" }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-6"
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
              <PartyPopper className="h-3.5 w-3.5 text-orange-400" />
              <span className="gradient-text">Happy Dussehra</span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
              The victory of <span className="gradient-text">good over evil</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Welcome to the festive corner of OrbitIntelligenceAI. Generate a personalized wish, learn about the festival, and let your brightest ideas take the bow.
            </p>
          </div>
        </motion.div>

        {/* Wish generator */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="glass gradient-border rounded-3xl p-6 sm:p-8 mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Wand2 className="h-5 w-5 text-orange-400" />
            <h3 className="font-display text-lg font-bold">Festive wish generator</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="flex-1 glass rounded-xl px-4 py-2.5 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={generate}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white neon-glow hover:scale-[1.02] transition"
              style={{ background: "var(--gradient-neon)" }}
            >
              Generate a wish
            </button>
          </div>
          {wish && (
            <motion.div
              key={wish}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl p-5 flex items-start justify-between gap-3"
            >
              <p className="text-sm sm:text-base">{wish}</p>
              <button
                onClick={copy}
                className="glass rounded-lg h-9 w-9 grid place-items-center hover:bg-white/10 shrink-0"
                aria-label="Copy wish"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* About the festival */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {FACTS.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                {i % 2 === 0 ? <Flame className="h-4 w-4 text-orange-400" /> : <BowArrow className="h-4 w-4 text-orange-400" />}
                <h4 className="font-semibold text-sm">{f.title}</h4>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">{f.text}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center pb-8">
          <Link
            to="/chat"
            className="group inline-flex items-center gap-3 rounded-2xl px-7 py-4 font-semibold text-white neon-glow hover:scale-[1.03] transition"
            style={{ background: "var(--gradient-neon)" }}
          >
            <Sparkles className="h-5 w-5" />
            Chat with Orbit this Dussehra
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">Festive greetings from Srikar 🪔</p>
        </div>
      </div>
    </div>
  );
}
