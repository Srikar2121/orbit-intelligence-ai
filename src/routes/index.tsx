import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Blobs } from "@/components/Blobs";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { TeachersDay } from "@/components/TeachersDay";
import { Footer } from "@/components/Footer";
import { Onboarding } from "@/components/Onboarding";
import { PrivacyPopup } from "@/components/PrivacyPopup";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OrbitIntelligenceAI — Your thoughts. Connected." },
      { name: "description", content: "OrbitIntelligenceAI is a futuristic AI companion that learns how you think. Created by Srikar." },
      { property: "og:title", content: "OrbitIntelligenceAI — Your thoughts. Connected." },
      { property: "og:description", content: "A premium Gen-Z AI chat experience. Created by Srikar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
        <TeachersDay />
      </main>
      <Footer />
      <Onboarding />
      <PrivacyPopup />
    </div>
  );
}

