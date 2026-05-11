#!/usr/bin/env node
// Yap afterFileEdit hook — installed into <workspace>/.cursor/yap-hook.cjs
// Reads stdin (Cursor's edit payload) and POSTs to the local Yap bridge.
// Stays small and dependency-free so Cursor doesn't pay a startup cost.

const http = require("http");
const fs = require("fs");
const path = require("path");

(async () => {
  let body = "";
  try {
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) body += chunk;
  } catch { /* no stdin */ }

  // Find the port written by the extension on activation.
  // We look in: ENV, then ~/.cursor/yap-port, then workspace .cursor/yap-port
  let port = parseInt(process.env.YAP_PORT || "0", 10);
  if (!port) {
    const candidates = [
      path.join(process.env.HOME || process.env.USERPROFILE || "", ".cursor", "yap-port"),
      path.join(process.cwd(), ".cursor", "yap-port"),
    ];
    for (const p of candidates) {
      try {
        const v = parseInt(fs.readFileSync(p, "utf8").trim(), 10);
        if (v > 0) { port = v; break; }
      } catch {}
    }
  }
  if (!port) process.exit(0); // Yap not running — silently no-op.

  const data = body || "{}";
  const req = http.request({
    host: "127.0.0.1",
    port,
    path: "/edit",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
    timeout: 1500,
  }, (res) => { res.resume(); res.on("end", () => process.exit(0)); });

  req.on("error", () => process.exit(0));
  req.on("timeout", () => { req.destroy(); process.exit(0); });
  req.write(data);
  req.end();
})();
