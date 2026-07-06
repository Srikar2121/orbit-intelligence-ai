import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "generate_image",
  title: "Generate image",
  description:
    "Generate an image from a text prompt using the Orbit AI image model. Returns a base64-encoded PNG.",
  inputSchema: {
    prompt: z.string().min(1).max(2000).describe("Description of the image to generate."),
  },
  annotations: { readOnlyHint: false, openWorldHint: true },
  handler: async ({ prompt }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        content: [{ type: "text", text: "Image generation is not configured on this server." }],
        isError: true,
      };
    }
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => `HTTP ${res.status}`);
      return {
        content: [{ type: "text", text: `Image generation failed: ${msg.slice(0, 300)}` }],
        isError: true,
      };
    }
    const json = (await res.json()) as {
      choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
    };
    const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? "";
    const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(url);
    if (!match) {
      return {
        content: [{ type: "text", text: "No image returned by the model." }],
        isError: true,
      };
    }
    return {
      content: [
        { type: "image", data: match[2], mimeType: match[1] },
        { type: "text", text: `Generated image for prompt: ${prompt}` },
      ],
    };
  },
});
