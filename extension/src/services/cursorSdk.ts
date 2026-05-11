// Cursor SDK wrapper — uses the Cursor agent for code generation.
// Falls back to the caller's responsibility if no API key is set.
//
// We dynamically import @cursor/sdk so the extension doesn't fail to load
// on machines that haven't installed the optional dep yet.

export interface CursorBuildResult {
  text: string;
  files?: Array<{ path: string; content: string }>;
}

export async function buildWithCursor(
  apiKey: string,
  cwd: string,
  prompt: string,
  onChunk?: (text: string) => void,
): Promise<CursorBuildResult> {
  // Dynamic import so a missing module doesn't crash activation.
  // We hide the specifier from TypeScript so it doesn't require the dep at compile time.
  const sdkSpecifier = "@cursor/sdk";
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const dynImport = new Function("s", "return import(s)") as (s: string) => Promise<any>;
  const sdk: any = await dynImport(sdkSpecifier).catch(() => {
    throw new Error(
      "@cursor/sdk is not installed. Run `npm install @cursor/sdk` in the extension folder.",
    );
  });

  const Agent = sdk.Agent;
  if (!Agent) throw new Error("Cursor SDK loaded but Agent class missing.");

  // Wrap the user prompt so the agent writes the app into ./yap-app
  const fullPrompt = `${prompt}

When you write code, place files inside the directory ./yap-app/ (create it if missing). Build a complete, runnable single-page web app — index.html plus any css/js. Use a CDN like Tailwind for styling. Make it visually polished. Don't ask follow-up questions, just build it.`;

  const agent = await Agent.create({
    apiKey,
    model: { id: "composer-2" },
    local: { cwd },
  });

  let collected = "";
  try {
    const run = await agent.send(fullPrompt);
    for await (const event of run.stream()) {
      if (event.type !== "assistant") continue;
      for (const block of event.message.content) {
        if (block.type === "text" && block.text) {
          collected += block.text;
          onChunk?.(block.text);
        }
      }
    }
    await run.wait();
  } finally {
    if (typeof agent[Symbol.asyncDispose] === "function") {
      await agent[Symbol.asyncDispose]();
    }
  }

  return { text: collected };
}
