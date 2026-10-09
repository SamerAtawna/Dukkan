/**
 * The event stream both Claude agents send (POST /api/agent for buyers, POST /api/assistant for the seller)
 * and the client parser for it. Server-Sent Events, one JSON object per `data:` line.
 */

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; id: string; name: string; input: unknown }
  | { type: "result"; id: string; name: string; output: unknown }
  | { type: "done"; text: string }
  | { type: "error"; message: string };

/** Read an SSE body to the end, calling `onEvent` for each event in order. */
export async function readSse(body: ReadableStream<Uint8Array>, onEvent: (e: StreamEvent) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 2);
      if (!line.startsWith("data: ")) continue;
      onEvent(JSON.parse(line.slice(6)) as StreamEvent);
    }
  }
}
