import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./public", import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
  res.end(body);
}

async function chat(req, res) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const { messages = [] } = JSON.parse(raw || "{}");
  if (!process.env.OPENAI_API_KEY) return send(res, 503, JSON.stringify({ error: "AI_NOT_CONFIGURED" }));

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: "You are Nova, a warm, perceptive digital human. Reply for speech: concise, natural, no markdown, usually two or three sentences. Remember context and answer follow-ups directly.",
      input: messages.slice(-12)
    })
  });
  const data = await response.json();
  if (!response.ok) return send(res, 502, JSON.stringify({ error: "AI_UNAVAILABLE" }));
  send(res, 200, JSON.stringify({ text: data.output_text || "I'm here. What would you like to explore?" }));
}

createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/chat") return await chat(req, res);
    const requestPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const path = normalize(join(root, requestPath));
    if (!path.startsWith(root)) return send(res, 403, "Forbidden", "text/plain");
    send(res, 200, await readFile(path), types[extname(path)] || "application/octet-stream");
  } catch (error) {
    send(res, error.code === "ENOENT" ? 404 : 500, "Not found", "text/plain");
  }
}).listen(port, host, () => console.log(`Nova is awake on http://${host}:${port}`));
