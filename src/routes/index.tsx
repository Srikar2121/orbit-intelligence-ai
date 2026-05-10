import { createFileRoute } from "@tanstack/react-router";
import { Blobs } from "@/components/Blobs";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { ChatPreview } from "@/components/ChatPreview";
import { Testimonials } from "@/components/Testimonials";
import { Footer } from "@/components/Footer";
import { Onboarding } from "@/components/Onboarding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BrightCore-AI — Your thoughts. Connected." },
      { name: "description", content: "BrightCore-AI is a futuristic AI companion that learns how you think. Created by Srikar." },
      { property: "og:title", content: "BrightCore-AI — Your thoughts. Connected." },
      { property: "og:description", content: "A premium Gen-Z AI chat experience. Created by Srikar." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen">
      <Blobs />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <ChatPreview />
        <Testimonials />
      </main>
      <Footer />
      <Onboarding />
    </div>
  );
}
