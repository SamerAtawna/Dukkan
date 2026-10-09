import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { claude, CLAUDE_MODEL } from "@/lib/server/ai";
import type { StreamEvent } from "@/lib/sse";

/**
 * One Claude tool-runner turn as a Server-Sent Events response. Shared by the buyer agent
 * (/api/agent) and the seller assistant (/api/assistant): text deltas as they stream, each
 * tool call and its result, then `done` with the final text, or `error`.
 */

type ToolSpec<S extends z.ZodType> = {
  name: string;
  description: string;
  inputSchema: S;
  run: (input: z.infer<S>) => Promise<unknown>;
};

export type ToolFactory = <S extends z.ZodType>(spec: ToolSpec<S>) => BetaRunnableTool;

type AgentParams = {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  /** Tools are built per request so each can report through the stream. */
  tools: (tool: ToolFactory) => BetaRunnableTool[];
  max_tokens?: number;
  max_iterations?: number;
  /** Shown when the model refuses. */
  refusalText?: string;
  logTag: string;
};

export function agentStream(params: AgentParams): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      let toolSeq = 0;
      const tool: ToolFactory = (spec) =>
        betaZodTool({
          name: spec.name,
          description: spec.description,
          inputSchema: spec.inputSchema,
          run: async (input) => {
            const id = `${spec.name}-${++toolSeq}`;
            send({ type: "tool", id, name: spec.name, input });
            try {
              const output = await spec.run(input);
              send({ type: "result", id, name: spec.name, output });
              return JSON.stringify(output);
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              send({ type: "result", id, name: spec.name, output: { error: message } });
              return JSON.stringify({ error: message });
            }
          },
        });

      try {
        const runner = claude().beta.messages.toolRunner({
          model: CLAUDE_MODEL,
          max_tokens: params.max_tokens ?? 4000,
          stream: true,
          max_iterations: params.max_iterations ?? 8,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low" },
          system: params.system,
          tools: params.tools(tool),
          messages: params.messages,
        });

        let finalText = "";
        for await (const messageStream of runner) {
          messageStream.on("text", (delta) => {
            send({ type: "text", delta });
          });
          const message = await messageStream.finalMessage();
          if (message.stop_reason === "pause_turn") {
            runner.pushMessages({ role: "assistant", content: message.content });
          }
          const text = message.content
            .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
            .map((b) => b.text)
            .join("");
          if (text) finalText = text;
          if (message.stop_reason === "refusal") {
            finalText = finalText || params.refusalText || "I can't help with that one.";
            break;
          }
        }
        send({ type: "done", text: finalText });
      } catch (err) {
        console.error(`[${params.logTag}]`, err);
        send({ type: "error", message: err instanceof Error ? err.message : "Agent failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" },
  });
}
