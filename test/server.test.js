import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("experience contains accessible voice controls", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Start voice conversation/);
  assert.doesNotMatch(html, /chat-bubble|conversation-history/);
});

test("client implements core speech loop and visemes", async () => {
  const js = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  for (const feature of ["SpeechRecognition", "SpeechSynthesisUtterance", "onboundary", "history.push", "[mbp]", "[fv]"]) assert.ok(js.includes(feature), feature);
});

test("server is reachable through cloud workspace port forwarding", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /process\.env\.HOST \|\| "0\.0\.0\.0"/);
  assert.match(server, /listen\(port, host/);
});
