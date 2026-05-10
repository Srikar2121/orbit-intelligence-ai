import { motion } from "framer-motion";

const reviews = [
  { name: "Aria K.", handle: "@ariakthinks", text: "brightcore literally reads my mind. it's giving best friend energy 💜", color: "#7C4DFF" },
  { name: "Devon M.", handle: "@devbuilds", text: "replaced 4 apps with this. the UI alone is unreal.", color: "#00E5FF" },
  { name: "Sana R.", handle: "@sanawrites", text: "I wrote my entire short story in one session. flow state unlocked.", color: "#FF4D9D" },
  { name: "Jules P.", handle: "@julesxo", text: "okay but the typing animation??? obsessed.", color: "#7C4DFF" },
  { name: "Kai T.", handle: "@kaicodes", text: "fastest ai i've ever used. feels like talking to a friend.", color: "#00E5FF" },
  { name: "Rhea V.", handle: "@rheavibes", text: "the vibes are immaculate. this is THE ai app of the year.", color: "#FF4D9D" },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold"><span className="gradient-text">Loved by the internet</span></h2>
          <p className="mt-4 text-muted-foreground">Real-feeling words from a not-so-real focus group ✨</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((r, i) => (
            <motion.div key={r.handle}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-3xl p-6 hover:-translate-y-1 transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full" style={{ background: `linear-gradient(135deg, ${r.color}, #fff2)` }} />
                <div>
                  <div className="text-sm font-semibold">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.handle}</div>
                </div>
              </div>
              <p className="text-sm leading-relaxed">{r.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
