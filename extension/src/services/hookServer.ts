// Local HTTP + SSE bridge for Live Roast Mode.
// The Cursor afterFileEdit hook script POSTs edit events here.
// The webview opens an SSE connection to receive playback commands.

import * as http from "http";
import { AddressInfo } from "net";

export interface EditEvent {
  conversation_id?: string;
  generation_id?: string;
  file_path: string;
  edits: Array<{ old_string: string; new_string: string }>;
  hook_event_name?: string;
  workspace_roots?: string[];
}

export type EditHandler = (event: EditEvent) => Promise<void>;

export class HookServer {
  private server: http.Server | null = null;
  private sseClients: Set<http.ServerResponse> = new Set();
  private editHandler: EditHandler | null = null;

  setEditHandler(handler: EditHandler) {
    this.editHandler = handler;
  }

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handle(req, res));
      this.server.listen(0, "127.0.0.1", () => {
        const addr = this.server!.address() as AddressInfo;
        resolve(addr.port);
      });
      this.server.on("error", reject);
    });
  }

  stop() {
    for (const c of this.sseClients) { try { c.end(); } catch {} }
    this.sseClients.clear();
    this.server?.close();
    this.server = null;
  }

  /** Push a JSON event to every connected SSE client (the webview). */
  push(event: Record<string, unknown>) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const c of this.sseClients) {
      try { c.write(data); } catch {}
    }
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse) {
    // CORS — webview origin is vscode-webview://...
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    if (req.url === "/events" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(`event: ready\ndata: {}\n\n`);
      this.sseClients.add(res);
      req.on("close", () => this.sseClients.delete(res));
      return;
    }

    if (req.url === "/edit" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => { body += chunk.toString(); });
      req.on("end", async () => {
        try {
          const event = JSON.parse(body || "{}") as EditEvent;
          if (this.editHandler) {
            // Don't await — hook script should return fast
            this.editHandler(event).catch(() => {});
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch (e: any) {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: String(e) }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  }
}
