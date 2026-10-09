import { z } from "zod";
import { agentStream } from "@/lib/server/agent-stream";
import { errorResponse, parseBody } from "@/lib/server/http";

/**
 * POST /api/agent: the demo buyer agent. It stands in for Perplexity, Copilot or any
 * assistant a buyer might use, and talks to Dukkan only through the public HTTP API
 * (/api/catalog, /api/checkout), exactly as an outside agent would.
 *
 * Streams Server-Sent Events (see src/lib/sse.ts).
 * Payment stays with the human: the agent hands over a PayPal link, it never pays by itself.
 */

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(8000) })).min(1).max(40),
  agentName: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = await parseBody(req, Body);
  } catch (err) {
    return errorResponse(err);
  }
  const agentName = body.agentName?.trim() || "Dukkan demo agent";
  // Server-to-server calls never take their target from the request (a forged Host header would
  // turn this public route into an SSRF). APP_URL when set, otherwise this server on loopback.
  const base = process.env.APP_URL?.replace(/\/$/, "") || `http://127.0.0.1:${process.env.PORT ?? 3000}`;
  const headers = { "X-Agent": agentName, Accept: "application/json" };

  return agentStream({
    logTag: "agent",
    max_tokens: 4000,
    max_iterations: 8,
    system:
      `You are ${agentName}, an AI shopping agent acting for one buyer. You are shopping at a small handmade-goods shop through its agent API.\n` +
      `- Find what the buyer asks for with search_catalog. Try a second, simpler query if the first finds nothing. Use get_product for details.\n` +
      `- Be brief and concrete: name, price, what it is. No marketing voice. Mention stock if low.\n` +
      `- Before buying, state exactly what you will order and the total, and ask the buyer to confirm. Only after a clear yes, call checkout.\n` +
      `- After checkout, give the buyer the pay link in a markdown link exactly as returned (payUrl) and say they finish the payment with PayPal. You never pay yourself and never ask for card or account details.\n` +
      `- If nothing matches, say so plainly and suggest what to ask the shop for.`,
    messages: body.messages.map((m) => ({ role: m.role, content: m.text })),
    tools: (tool) => [
      tool({
        name: "search_catalog",
        description: "Search the shop's catalogue. Returns matching products with id, title, price, stock, details and description.",
        inputSchema: z.object({ query: z.string().describe("What the buyer wants, in plain English, e.g. 'embroidered cushion'") }),
        run: async ({ query }) => {
          const res = await fetch(`${base}/api/catalog?q=${encodeURIComponent(query)}`, { headers, cache: "no-store" });
          return res.json();
        },
      }),
      tool({
        name: "get_product",
        description: "Get one product by id, with full details and photos.",
        inputSchema: z.object({ productId: z.string() }),
        run: async ({ productId }) => {
          const res = await fetch(`${base}/api/catalog/${encodeURIComponent(productId)}`, { headers, cache: "no-store" });
          return res.json();
        },
      }),
      tool({
        name: "checkout",
        description:
          "Create a PayPal order for the chosen items. Returns the total and a pay link. Only call this after the buyer has confirmed what to buy. The buyer completes payment in PayPal; you cannot pay for them.",
        inputSchema: z.object({
          items: z.array(z.object({ productId: z.string(), qty: z.number().int().min(1) })).min(1),
        }),
        run: async ({ items }) => {
          const res = await fetch(`${base}/api/checkout`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ items, agent: agentName }),
            cache: "no-store",
          });
          return res.json();
        },
      }),
    ],
  });
}
