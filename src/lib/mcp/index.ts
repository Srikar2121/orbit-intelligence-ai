import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import generateImageTool from "./tools/generate-image";

// The OAuth issuer MUST be the direct Supabase host — the published
// SUPABASE_URL is the .lovable.cloud proxy which mcp-js rejects (RFC 8414).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "orbit-mcp",
  title: "Orbit Intelligence",
  version: "0.1.0",
  instructions:
    "Tools exposed by the Orbit Intelligence app. Use `echo` to verify connectivity, and `generate_image` to create an image from a text prompt.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, generateImageTool],
});
