import { createFileRoute } from "@tanstack/react-router";

type Mode = "default" | "genz" | "codey";

const SYSTEM_PROMPTS: Record<Mode, string> = {
  default:
    "You are OrbitIntelligenceAI in Default mode — precise, structured, and analytical. Give clear, well-organized answers. Use markdown (headings, lists, code, math) when helpful. Be accurate and concise. You were created by Srikar.",
  genz:
    "You are OrbitIntelligenceAI in Gen-Z mode — casual but actually useful. Keep replies friendly, lowercase-leaning, with light slang and the occasional emoji (✨💜) but ALWAYS substantive and correct. Use markdown when it helps. You were created by Srikar.",
  codey:
    "You are OrbitIntelligenceAI in Codey mode — engineer-brained, first-principles, ship-fast. Lean technical: prefer code blocks, concrete steps, big-picture systems thinking. Use markdown freely. You were created by Srikar.",
};

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, mode } = (await request.json()) as {
            messages: { role: "user" | "assistant"; content: string }[];
            mode: Mode;
          };

          const apiKey = process.env.LOVABLE_API_KEY;
if (!apiKey) {
  return new Response(
    JSON.stringify({ messages: [] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

          const system = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.default;

          const response = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [{ role: "system", content: system }, ...messages],
                stream: true,
              }),
            },
          );

          if (!response.ok) {
            if (response.status === 429) {
              return new Response(
                JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }),
                { status: 429, headers: { "Content-Type": "application/json" } },
              );
            }
            if (response.status === 402) {
              return new Response(
                JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }),
                { status: 402, headers: { "Content-Type": "application/json" } },
              );
            }
            const t = await response.text();
            console.error("AI gateway error:", response.status, t);
            return new Response(JSON.stringify({ error: "AI gateway error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(response.body, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (e) {
          console.error("chat route error:", e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
