import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const STARTER_FILES: Record<string, string> = {
  "package.json": JSON.stringify(
    {
      name: "orbit-build-app",
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
      devDependencies: {
        "@vitejs/plugin-react": "^4.3.1",
        vite: "^5.4.0",
      },
    },
    null,
    2,
  ),
  "vite.config.js": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()] });
`,
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
  "src/main.jsx": `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
  "src/App.jsx": `export default function App() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "4rem", textAlign: "center" }}>
      <h1>Hello from your new app 🚀</h1>
      <p>Edit src/App.jsx in Build Mode to start coding.</p>
    </main>
  );
}
`,
  "src/index.css": `body { margin: 0; background: #0a0a0a; color: white; }
`,
  "public/manifest.webmanifest": JSON.stringify(
    {
      name: "My App",
      short_name: "MyApp",
      start_url: "/",
      display: "standalone",
      background_color: "#0a0a0a",
      theme_color: "#10b981",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2,
  ),
  "public/sw.js": `const CACHE='app-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  e.respondWith(fetch(e.request).then(r=>{
    const c=r.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c));return r;
  }).catch(()=>caches.match(e.request)));
});
`,
};

export const listBuildProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("build_projects")
      .select("id, name, description, framework, last_deploy_url, last_deploy_status, last_deployed_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createBuildProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().min(1).max(60), description: z.string().max(280).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("build_projects")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description ?? null,
        framework: "vite-react",
        files: STARTER_FILES,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getBuildProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("build_projects")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateBuildProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        files: z.record(z.string(), z.string()).optional(),
        name: z.string().min(1).max(60).optional(),
        description: z.string().max(280).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      files?: Record<string, string>;
      name?: string;
      description?: string | null;
    } = {};
    if (data.files) patch.files = data.files;
    if (data.name) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    const { error } = await context.supabase.from("build_projects").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBuildProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("build_projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// AI code generation — returns a map of files (paths -> contents) to merge into project
export const generateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        prompt: z.string().min(1).max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { data: project, error: pErr } = await context.supabase
      .from("build_projects")
      .select("files")
      .eq("id", data.projectId)
      .single();
    if (pErr) throw new Error(pErr.message);

    const existing = (project.files ?? {}) as Record<string, string>;
    const fileList = Object.keys(existing).join("\n");

    const system = `You are an expert React + Vite code generator. Output ONLY a JSON object mapping file paths to file contents. No prose, no markdown fences, just JSON.

Rules:
- Only include files you are creating or modifying. Unchanged files: omit them.
- File paths are relative (e.g. "src/App.jsx", "src/components/Foo.jsx", "package.json").
- For React, use .jsx files and standard React 18.
- Keep package.json valid if you change it. Existing deps: react, react-dom, vite, @vitejs/plugin-react.
- If you add a dependency, update package.json deps accordingly.
- Do NOT include build output or node_modules.

Current project files:
${fileList}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("AI rate limit. Try again shortly.");
      if (response.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(content) as Record<string, string>;
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    const validFiles: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && k.length < 200 && !k.includes("..")) {
        validFiles[k] = v;
      }
    }

    const merged = { ...existing, ...validFiles };
    const { error: uErr } = await context.supabase
      .from("build_projects")
      .update({ files: merged })
      .eq("id", data.projectId);
    if (uErr) throw new Error(uErr.message);

    return { changedFiles: Object.keys(validFiles), files: merged };
  });

// Vercel token management
export const getVercelStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("vercel_token")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { connected: !!data?.vercel_token };
  });

export const saveVercelToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ token: z.string().min(10).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // verify token before saving
    const ver = await fetch("https://api.vercel.com/v2/user", {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    if (!ver.ok) throw new Error("Invalid Vercel token");

    const { error } = await context.supabase
      .from("profiles")
      .update({ vercel_token: data.token })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const disconnectVercel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ vercel_token: null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Deploy a project to Vercel
export const deployToVercel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: profile, error: profErr }, { data: project, error: projErr }] = await Promise.all([
      context.supabase.from("profiles").select("vercel_token").eq("id", context.userId).maybeSingle(),
      context.supabase.from("build_projects").select("name, files, vercel_project_id").eq("id", data.projectId).single(),
    ]);
    if (profErr) throw new Error(profErr.message);
    if (projErr) throw new Error(projErr.message);
    if (!profile?.vercel_token) throw new Error("Vercel not connected. Add your API token first.");

    const files = (project.files ?? {}) as Record<string, string>;
    const slug = project.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "orbit-app";

    const payload = {
      name: slug,
      target: "production" as const,
      files: Object.entries(files).map(([file, dataStr]) => ({ file, data: dataStr })),
      projectSettings: {
        framework: "vite",
        buildCommand: "vite build",
        outputDirectory: "dist",
        installCommand: "npm install",
      },
    };

    const res = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${profile.vercel_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await res.json()) as { url?: string; id?: string; error?: { message?: string } };
    if (!res.ok) {
      const msg = body?.error?.message || `Vercel error ${res.status}`;
      await context.supabase
        .from("build_projects")
        .update({ last_deploy_status: `failed: ${msg}`.slice(0, 200), last_deployed_at: new Date().toISOString() })
        .eq("id", data.projectId);
      throw new Error(msg);
    }

    const deployUrl = body.url ? `https://${body.url}` : null;
    await context.supabase
      .from("build_projects")
      .update({
        last_deploy_url: deployUrl,
        last_deploy_status: "building",
        last_deployed_at: new Date().toISOString(),
      })
      .eq("id", data.projectId);

    return { url: deployUrl, deploymentId: body.id };
  });
