import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type Mode = "default" | "genz" | "codey";

const BUILD_MODE_AWARENESS =
  " This app also has a Build Mode — an in-app AI IDE where users create projects, edit files with AI multi-file edits, live-preview them, and one-click deploy to Vercel. Users open it from the Build button in chat or at /build. If a user wants to actually build/ship a website or app, point them to Build Mode.";

const SYSTEM_PROMPTS: Record<Mode, string> = {
  default:
    "You are OrbitIntelligenceAI in Default mode — precise, structured, and analytical. Give clear, well-organized answers. Use markdown (headings, lists, code, math) when helpful. Be accurate and concise. You were created by Srikar." +
    BUILD_MODE_AWARENESS,
  genz:
    "You are OrbitIntelligenceAI in Gen-Z mode — casual but actually useful. Keep replies friendly, lowercase-leaning, with light slang and the occasional emoji (✨💜) but ALWAYS substantive and correct. Use markdown when it helps. You were created by Srikar." +
    BUILD_MODE_AWARENESS,
  codey:
    "You are OrbitIntelligenceAI in Codey mode — a lightweight coding companion, like a simpler version of Build Mode inside chat. Focus on code: short explanations, clean code blocks, concrete snippets, quick fixes. Keep it engineer-brained but approachable — no giant essays. For full multi-file projects and one-click deploys, tell the user to switch to Build Mode. You were created by Srikar." +
    BUILD_MODE_AWARENESS,
};

type OrbitModel = "rapid" | "lite" | "proman";

const MODEL_MAP: Record<OrbitModel, string> = {
  rapid: "google/gemini-3.6-flash",
  lite: "google/gemini-3.1-flash-lite",
  proman: "google/gemini-2.5-pro",
};

const EFFORT_PROMPT: Record<"low" | "medium" | "high", string> = {
  low: " Effort level: QUICK — answer in as few words as possible, no preamble.",
  medium: " Effort level: BALANCED — a clear, complete answer with light structure.",
  high:
    " Effort level: DEEP — think carefully, cover edge cases, show reasoning steps and structure the answer thoroughly.",
};

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(50),
  mode: z.enum(["default", "genz", "codey"]),
  model: z.enum(["rapid", "lite", "proman"]).default("rapid"),
  effort: z.enum(["low", "medium", "high"]).default("medium"),
  memory: z.string().max(6000).optional(),
});


function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Optional Bearer token — guests may chat without saving
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            return jsonError("Server not configured", 500);
          }

          // 2. Validate payload
          let parsed: z.infer<typeof bodySchema>;
          try {
            parsed = bodySchema.parse(await request.json());
          } catch {
            return jsonError("Invalid request body", 400);
          }
          const { mode, model, effort, memory } = parsed;
          let messages = parsed.messages;

          if (token) {
            const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
              global: { headers: { Authorization: `Bearer ${token}` } },
              auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
            });

            const { data: userData, error: userErr } = await supabase.auth.getUser(token);
            if (userErr || !userData?.user) return jsonError("Unauthorized", 401);

            // Enforce per-model daily quota server-side
            const { data: quotaRows, error: quotaErr } = await supabase.rpc("consume_chat_quota", {
              _model: mode,
            });
            if (quotaErr) return jsonError("Quota check failed", 500);
            const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
            if (!quota?.allowed) {
              return jsonError("Daily message limit reached", 429);
            }
          } else {
            // Guests: no persistence and a shorter context window
            messages = messages.slice(-12);
          }

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return jsonError("LOVABLE_API_KEY is not configured", 500);

          const system =
            SYSTEM_PROMPTS[mode] +
            EFFORT_PROMPT[effort] +
            (token && memory
              ? `\n\nLong-term memory of earlier conversations with this user (use it naturally, don't recite it):\n${memory}`
              : "");

          const response = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: MODEL_MAP[model as OrbitModel],
                messages: [{ role: "system", content: system }, ...messages],
                stream: true,
              }),
            },
          );


          if (!response.ok) {
            if (response.status === 429) return jsonError("Rate limit exceeded. Try again in a moment.", 429);
            if (response.status === 402)
              return jsonError("AI credits exhausted. Add funds in Settings → Workspace → Usage.", 402);
            const t = await response.text();
            console.error("AI gateway error:", response.status, t);
            return jsonError("AI gateway error", 500);
          }

          return new Response(response.body, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (e) {
          console.error("chat route error:", e);
          return jsonError("Unknown error", 500);
        }
      },
    },
  },
});
