import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Public Build-AI endpoint. Lets guests use the Build Mode IDE (AI file edits,
// code generation, page generation) without an Orbit account. No persistence
// here — the client keeps the project in its own browser and sends the current
// files with every request.

const fileSchema = z.record(
  z.string().min(1).max(200).refine((p) => !p.includes("..") && !p.startsWith("/")),
  z.string().max(30000),
);

const bodySchema = z
  .object({
    action: z.enum(["chat", "generate", "page"]),
    files: fileSchema.default({}),
    prompt: z.string().max(4000).optional(),
    pageName: z.string().min(1).max(40).optional(),
    description: z.string().min(1).max(500).optional(),
    messages: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
      .max(24)
      .optional(),
  })
  .refine((b) => Object.keys(b.files).length <= 40, "Too many files");

const RULES = `Rules:
- Only include files you create/modify; omit unchanged files.
- React 18 + Vite. Use .jsx. Deps available: react, react-dom, vite, @vitejs/plugin-react.
- For routing/multi-page apps, use react-router-dom (add to package.json deps if needed).
- Keep package.json valid if you change it.
- Keep files complete and runnable. Do NOT include build output or node_modules.`;

function fileList(files: Record<string, string>) {
  return Object.keys(files).join("\n") || "(empty project)";
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type GatewayResult = { error: string; status: 402 | 429 | 500 } | { parsed: Record<string, unknown> };

async function callGateway(
  system: string,
  user: { role: "user" | "assistant"; content: string }[],
): Promise<GatewayResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { error: "AI is not configured", status: 500 as const };

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, ...user],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) return { error: "AI rate limit. Try again in a moment.", status: 429 as const };
    if (response.status === 402) return { error: "AI credits exhausted. Try again later.", status: 402 as const };
    return { error: `AI gateway error ${response.status}`, status: 500 as const };
  }

  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return { parsed: JSON.parse(content) as Record<string, unknown> };
  } catch {
    return { parsed: {} };
  }
}

function sanitize(parsedFiles: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries((parsedFiles ?? {}) as Record<string, unknown>)) {
    if (typeof v === "string" && k.length < 200 && !k.includes("..") && !k.startsWith("/")) out[k] = v.slice(0, 30000);
  }
  return out;
}

export const Route = createFileRoute("/api/public/build-ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          let body: z.infer<typeof bodySchema>;
          try {
            body = bodySchema.parse(await request.json());
          } catch {
            return jsonError("Invalid request body", 400);
          }

          if (body.action === "chat") {
            if (!body.messages?.length) return jsonError("messages required", 400);
            const system = `You are a friendly AI site/page builder for a React + Vite project. The user is chatting with you to build a website.

You may modify project files. When you want to write/update files, respond with a JSON object of the exact shape:
{"reply":"short friendly summary","files":{"path/to/file.jsx":"FULL FILE CONTENTS",...}}

If you only want to chat (no file changes), still respond with the same JSON shape but with an empty files object.

${RULES}

Current project files:
${fileList(body.files ?? {})}`;

            const r = await callGateway(system, body.messages.slice(-12));
            if ("error" in r) return jsonError(r.error, r.status);
            const files = sanitize(r.parsed.files);
            const reply = typeof r.parsed.reply === "string" && r.parsed.reply.length < 4000 ? r.parsed.reply : "Done.";
            return Response.json({ reply, files });
          }

          if (body.action === "generate") {
            if (!body.prompt) return jsonError("prompt required", 400);
            const system = `You are an expert React + Vite code generator. Output ONLY a JSON object mapping file paths to file contents.

${RULES}
- Existing deps: react, react-dom, vite, @vitejs/plugin-react.

Current project files:
${fileList(body.files ?? {})}`;

            const r = await callGateway(system, [{ role: "user", content: body.prompt }]);
            if ("error" in r) return jsonError(r.error, r.status);
            return Response.json({ files: sanitize(r.parsed) });
          }

          // action === "page"
          if (!body.pageName || !body.description) return jsonError("pageName and description required", 400);
          const safeName = body.pageName.replace(/[^A-Za-z0-9]/g, "");
          if (!safeName) return jsonError("Invalid page name", 400);
          const componentName = safeName.charAt(0).toUpperCase() + safeName.slice(1);
          const system = `You generate a single React page component for a Vite + React project. Output JSON only: {"files":{"src/pages/${componentName}.jsx":"..."}}.
The component must be a default export named ${componentName}. Use inline styles or simple CSS. No imports beyond react.
Existing files:
${fileList(body.files ?? {})}`;

          const r = await callGateway(system, [
            { role: "user", content: `Page name: ${componentName}\nDescription: ${body.description}` },
          ]);
          if ("error" in r) return jsonError(r.error, r.status);
          return Response.json({ files: sanitize(r.parsed), componentName });
        } catch (e) {
          console.error("build-ai route error:", e);
          return jsonError("Unknown error", 500);
        }
      },
    },
  },
});
