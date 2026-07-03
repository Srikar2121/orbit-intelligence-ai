import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") ?? "";
          if (!authHeader.startsWith("Bearer ")) return jsonError("Unauthorized", 401);
          const token = authHeader.slice(7).trim();
          if (!token) return jsonError("Unauthorized", 401);

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return jsonError("Server not configured", 500);

          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          });

          const { data: userData, error: userErr } = await supabase.auth.getUser(token);
          if (userErr || !userData?.user) return jsonError("Unauthorized", 401);

          let parsed: z.infer<typeof bodySchema>;
          try {
            parsed = bodySchema.parse(await request.json());
          } catch {
            return jsonError("Invalid request body", 400);
          }

          // Consume quota using the same daily counter so image gen counts too
          const { data: quotaRows, error: qErr } = await supabase.rpc("consume_chat_quota", { _model: "default" });
          if (qErr) return jsonError("Quota check failed", 500);
          const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
          if (!quota?.allowed) return jsonError("Daily message limit reached", 429);

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return jsonError("LOVABLE_API_KEY is not configured", 500);

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "openai/gpt-image-2",
              prompt: parsed.prompt,
              quality: "low",
              size: "1024x1024",
              n: 1,
              stream: true,
              partial_images: 1,
            }),
          });

          if (!upstream.ok || !upstream.body) {
            if (upstream.status === 429) return jsonError("Rate limit exceeded. Try again shortly.", 429);
            if (upstream.status === 402) return jsonError("AI credits exhausted.", 402);
            const t = await upstream.text().catch(() => "");
            console.error("Image gateway error:", upstream.status, t);
            return jsonError("Image generation failed", 500);
          }

          return new Response(upstream.body, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        } catch (e) {
          console.error("image route error:", e);
          return jsonError("Unknown error", 500);
        }
      },
    },
  },
});
