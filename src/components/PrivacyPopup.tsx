import { AnimatePresence, motion } from "framer-motion";
import { Shield } from "lucide-react";
import { useEffect, useState } from "react";

export function PrivacyPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("orbit_privacy_accepted")) {
      const t = setTimeout(() => setOpen(true), 300);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("orbit_privacy_accepted", "1");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] grid place-items-center p-3 sm:p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="glass gradient-border rounded-2xl sm:rounded-3xl p-5 sm:p-8 w-full max-w-lg mx-auto"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl grid place-items-center neon-glow"
                style={{ background: "var(--gradient-neon)" }}
              >
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold gradient-text">Privacy Policy</h3>
            </div>

            <div className="mt-5 space-y-3 text-sm text-muted-foreground max-h-72 overflow-y-auto pr-2">
              <p>
                Welcome to OrbitIntelligenceAI. Your privacy matters to us. By using this app you
                agree to the following:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Account data:</strong> we store your email,
                  username, avatar, and age confirmation to power your account.
                </li>
                <li>
                  <strong className="text-foreground">Chats & history:</strong> your conversations
                  are saved to your account so you can revisit them. They are only visible to you.
                </li>
                <li>
                  <strong className="text-foreground">AI processing:</strong> messages you send are
                  forwarded to AI model providers to generate replies.
                </li>
                <li>
                  <strong className="text-foreground">No selling of data:</strong> we never sell
                  your personal information to third parties.
                </li>
                <li>
                  <strong className="text-foreground">Cookies:</strong> we use local storage to keep
                  you signed in and remember preferences.
                </li>
              </ul>
              <p>
                You can request deletion of your account and data at any time by contacting support.
              </p>
            </div>

            <button
              onClick={accept}
              className="mt-6 w-full rounded-2xl py-3 font-semibold text-white neon-glow hover:scale-[1.02] transition"
              style={{ background: "var(--gradient-neon)" }}
            >
              I Agree & Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
