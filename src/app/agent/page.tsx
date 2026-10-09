"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/icons";
import { readSse } from "@/lib/sse";
import { formatPrice, type CatalogItem } from "@/lib/types";
import "./agent.css";

/**
 * The demo buyer agent. Stands in for Perplexity, Copilot or any assistant a buyer uses.
 * It is deliberately not part of the seller product: plain chat, one accent, no tab bar.
 * It talks to Dukkan only through /api/catalog and /api/checkout, like an outside agent would.
 */

type Step = { id: string; name: string; input: unknown; output?: unknown };
type Turn = { role: "user" | "assistant"; text: string; steps?: Step[]; streaming?: boolean; error?: string };

const AGENT_NAME = "Dukkan demo agent";

const SUGGESTIONS = [
  "I want a hand-embroidered cushion cover.",
  "Anything carved from olive wood?",
  "Do they sell olive oil soap?",
];

export default function AgentPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput("");
    setBusy(true);
    const history = [...turns.filter((t) => !t.error), { role: "user" as const, text: msg }];
    setTurns([...history, { role: "assistant", text: "", steps: [], streaming: true }]);

    const patch = (fn: (t: Turn) => Turn) =>
      setTurns((prev) => {
        const next = [...prev];
        next[next.length - 1] = fn(next[next.length - 1]);
        return next;
      });

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((t) => ({ role: t.role, text: t.text })), agentName: AGENT_NAME }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Agent failed (${res.status})`);
      }
      await readSse(res.body, (ev) => {
        if (ev.type === "text") patch((t) => ({ ...t, text: t.text + ev.delta }));
        else if (ev.type === "tool") patch((t) => ({ ...t, text: "", steps: [...(t.steps ?? []), { id: ev.id, name: ev.name, input: ev.input }] }));
        else if (ev.type === "result")
          patch((t) => ({ ...t, steps: (t.steps ?? []).map((s) => (s.id === ev.id ? { ...s, output: ev.output } : s)) }));
        else if (ev.type === "done") patch((t) => ({ ...t, text: ev.text || t.text, streaming: false }));
        else if (ev.type === "error") patch((t) => ({ ...t, error: ev.message, streaming: false }));
      });
      patch((t) => ({ ...t, streaming: false }));
    } catch (err) {
      patch((t) => ({ ...t, error: err instanceof Error ? err.message : "Agent failed", streaming: false }));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <div className="r-agent flex h-dvh flex-col bg-ground text-text">
      <header className="flex items-center justify-between gap-3 px-5 pt-5 md:mx-auto md:w-full md:max-w-[720px] md:px-0 md:pt-8">
        <div className="flex flex-col gap-0.5">
          <span className="hd text-base font-semibold tracking-[-0.01em]">{AGENT_NAME}</span>
          <span className="mono">Buyer side · talks to Dukkan over its public API</span>
        </div>
        <a href="/" className="mono" target="_blank" rel="noreferrer">
          Seller app ↗
        </a>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-5 md:mx-auto md:w-full md:max-w-[720px] md:px-0">
        {turns.length === 0 && (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-[0.9375rem] leading-normal text-text-2">
              This is a buyer&apos;s shopping agent. Ask it for something. It searches the shop, builds the cart and hands you a PayPal link. You pay; it never does.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-3.5">
          {turns.map((t, i) => (
            <TurnView key={i} turn={t} />
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="px-5 pb-5 md:mx-auto md:w-full md:max-w-[720px] md:px-0 md:pb-8">
        <div className="card flex items-end gap-2.5 rounded-[26px] p-2.5">
          <label className="vh" htmlFor="ask">
            Tell the agent what you want
          </label>
          <textarea
            ref={inputRef}
            id="ask"
            className="ask"
            rows={1}
            placeholder={busy ? "Working…" : "What do you want to buy?"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={busy}
            autoFocus
          />
          <Button tone="lime" className="!h-11 !w-11 !p-0" type="submit" aria-label="Send" disabled={busy || !input.trim()}>
            <ArrowRightIcon size={20} />
          </Button>
        </div>
      </form>
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  if (turn.role === "user") {
    return (
      <div className="self-end">
        <div className="bubble me">{turn.text}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 self-start">
      {turn.steps?.map((s) => (
        <StepView key={s.id} step={s} />
      ))}
      <ProductCards steps={turn.steps ?? []} />
      {(turn.text || turn.streaming) && (
        <div className={cn("bubble", turn.streaming && !turn.text && "thinking")} aria-live="polite">
          {turn.text ? <Markdownish text={turn.text} /> : <span className="shimmer">Thinking…</span>}
        </div>
      )}
      {turn.error && (
        <div className="q px-4 py-3 text-[0.875rem]" role="alert">
          <span className="mono text-saffron-ink">Agent error · </span>
          {turn.error}
        </div>
      )}
    </div>
  );
}

function StepView({ step }: { step: Step }) {
  const input = step.input as Record<string, unknown>;
  const out = step.output as Record<string, unknown> | undefined;
  let label = step.name;
  let result: string | null = null;
  if (step.name === "search_catalog") {
    label = `Searching the shop for “${String(input.query)}”`;
    if (out) result = typeof out.count === "number" ? (out.count === 0 ? "nothing found" : `${out.count} found`) : "done";
  } else if (step.name === "get_product") {
    label = `Reading ${String(input.productId)}`;
    if (out) result = out.error ? "not available" : "ok";
  } else if (step.name === "checkout") {
    const items = (input.items as { productId: string; qty: number }[]) ?? [];
    label = `Creating a PayPal order · ${items.reduce((s, i) => s + i.qty, 0)} item${items.length === 1 && items[0]?.qty === 1 ? "" : "s"}`;
    if (out) result = out.error ? String(out.error) : `order ${String(out.orderId)}`;
  }
  return (
    <div className="step">
      <span className={cn("sdot", out ? (out.error ? "miss" : "ok") : "live")} aria-hidden="true" />
      <span className="mono normal-case tracking-normal">{label}</span>
      {result && <span className="mono">· {result}</span>}
    </div>
  );
}

/** Every product the agent looked at this turn, once each, in the order it first saw them. */
function productsFrom(steps: Step[]): CatalogItem[] {
  const seen = new Map<string, CatalogItem>();
  for (const s of steps) {
    const out = s.output as { items?: CatalogItem[]; id?: string; error?: string } | undefined;
    if (!out || out.error) continue;
    const found = s.name === "search_catalog" ? (out.items ?? []) : s.name === "get_product" && out.id ? [out as CatalogItem] : [];
    for (const p of found) if (!seen.has(p.id)) seen.set(p.id, p);
  }
  return [...seen.values()].slice(0, 6);
}

/** What the agent found, as the buyer would see it in any shopping assistant: photo, name, price. */
function ProductCards({ steps }: { steps: Step[] }) {
  const products = productsFrom(steps);
  if (!products.length) return null;
  return (
    <ul className="pcards m-0 list-none p-0" aria-label="Products the agent found">
      {products.map((p, i) => (
        <li key={p.id} className="pcard" style={{ animationDelay: `${i * 50}ms` }}>
          <span className="pphoto">
            {p.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- served by our own catalogue photo route
              <img src={p.photos[0].url} alt={p.title} loading="lazy" />
            ) : (
              <span className="mono">No photo</span>
            )}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5 px-3 pb-3 pt-2.5">
            <span className="ptitle text-[0.875rem] font-medium leading-[1.3]">{p.title}</span>
            <span className="flex items-baseline justify-between gap-2">
              <span className="amt text-[0.9375rem] font-semibold">{formatPrice(p.price, p.currency)}</span>
              {p.inStock <= 3 && <span className="mono">{p.inStock} left</span>}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Just enough markdown for the agent: paragraphs, **bold**, [links](url), bullet lines. */
function Markdownish({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        if (isList) {
          return (
            <ul key={i} className="m-0 flex list-disc flex-col gap-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l.replace(/^\s*[-*•]\s+/, "")} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="m-0">
            {lines.map((l, j) => (
              <span key={j}>
                <Inline text={l} />
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

function Inline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|(https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] && m[2]) {
      parts.push(
        <a key={m.index} href={m[2]} target="_blank" rel="noreferrer" className="paylink">
          {m[1]}
        </a>
      );
    } else if (m[3]) {
      parts.push(<strong key={m.index}>{m[3]}</strong>);
    } else if (m[4]) {
      parts.push(
        <a key={m.index} href={m[4]} target="_blank" rel="noreferrer" className="paylink">
          {m[4]}
        </a>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
