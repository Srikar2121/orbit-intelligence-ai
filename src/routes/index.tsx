import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Blobs } from "@/components/Blobs";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { ChatPreview } from "@/components/ChatPreview";
import { Testimonials } from "@/components/Testimonials";
import { Footer } from "@/components/Footer";
import { Onboarding } from "@/components/Onboarding";
import { PrivacyPopup } from "@/components/PrivacyPopup";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OrbitIntelligenceAI — Your thoughts. Connected." },
      { name: "description", content: "OrbitIntelligenceAI is a futuristic AI companion that learns how you think. Created by Srikar." },
      { property: "og:title", content: "OrbitIntelligenceAI — Your thoughts. Connected." },
      { property: "og:description", content: "A premium Gen-Z AI chat experience. Created by Srikar." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
  },
  component: Index,
});

export type Mode = "default" | "genz" | "codey";

function Index() {
  const [mode, setMode] = useState<Mode>("genz");
  return (
    <div className={`relative min-h-screen mode-${mode} transition-colors duration-500`}>
      <Blobs variant={mode} />
      <Navbar mode={mode} onModeChange={setMode} />
      <main>
        <Hero />
        <Features />
        <ChatPreview />
        <Testimonials />
      </main>
      <Footer />
      <Onboarding />
      <PrivacyPopup />
    </div>
  );
}
