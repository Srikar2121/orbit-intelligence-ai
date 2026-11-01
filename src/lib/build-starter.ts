// Starter file set used when a new Build Mode project is created.
// Shared between the signed-in server functions and the guest (local) store.
export const STARTER_FILES: Record<string, string> = {
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
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#10b981" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
    <script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}</script>
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
