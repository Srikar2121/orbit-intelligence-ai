import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import generateImageTool from "./tools/generate-image";

export default defineMcp({
  name: "orbit-mcp",
  title: "Orbit Intelligence",
  version: "0.1.0",
  instructions:
    "Tools exposed by the Orbit Intelligence app. Use `echo` to verify connectivity, and `generate_image` to create an image from a text prompt.",
  tools: [echoTool, generateImageTool],
});
