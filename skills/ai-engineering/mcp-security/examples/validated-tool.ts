import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import path from "node:path";

const ALLOWED_DIR = "/srv/docs"; // the only directory this tool may read

const server = new McpServer({ name: "docs-server", version: "1.0.0" });

server.registerTool(
  "read_doc",
  {
    description: "Reads a document from the docs directory.",
    inputSchema: z.object({
      name: z.string().min(1).max(128).describe("File name, no path separators"),
    }),
  },
  async ({ name }) => {
    if (name.includes("/") || name.includes("\\") || name.includes("..")) {
      return { content: [{ type: "text", text: "Invalid file name." }], isError: true };
    }
    const resolved = path.resolve(ALLOWED_DIR, name);
    if (!resolved.startsWith(ALLOWED_DIR + path.sep)) {
      return { content: [{ type: "text", text: "Access denied." }], isError: true };
    }
    const text = await readFileWithinLimit(resolved); // capped size, errors as results
    return { content: [{ type: "text", text }] };
  },
);
