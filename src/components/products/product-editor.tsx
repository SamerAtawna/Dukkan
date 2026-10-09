"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { formatPrice, parsePrice, type Product } from "@/lib/types";
import { useProducts } from "@/lib/store-products";
import { CheckIcon, MicIcon } from "@/components/icons";
import { PlusIcon, ProductArtwork } from "@/components/products/icons";
import { ScreenHeader } from "@/components/products/screen-header";
import { VisibilityCard } from "@/components/products/visibility-card";

/** "Saved" label stays for 1.8s (ProductEdit.dc.html). */
const SAVED_MS = 1800;

/**
 * Edit a product: photos, inline title/price/description, stock stepper, details chips,
 * visibility switch, Save → Saved, Delete with Undo toast. Draft state is local until Save.
 */
export function ProductEditor({ product }: { product: Product }) {
  const router = useRouter();
  const update = useProducts((s) => s.update);
  const remove = useProducts((s) => s.remove);
  const restore = useProducts((s) => s.restore);
  const index = useProducts((s) => s.products.findIndex((p) => p.id === product.id));

  const [title, setTitle] = useState(product.title);
  const [price, setPrice] = useState(formatPrice(product.price));
  const [stock, setStock] = useState(product.stock);
  const [details, setDetails] = useState(product.details);
  const [description, setDescription] = useState(product.description);
  const [visible, setVisible] = useState(product.visible);
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draftDetail, setDraftDetail] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (adding) addRef.current?.focus(); }, [adding]);

  /** Any edit after Save returns the button to "Save changes" (the file resets `saved`). */
  function touch<T>(set: (v: T) => void) {
    return (v: T) => { set(v); setSaved(false); };
  }

  function save() {
    const parsed = parsePrice(price);
    void update(product.id, {
      title: title.trim() || product.title,
      price: parsed ?? product.price,
      stock,
      details,
      description: description.trim(),
      visible,
    });
    if (parsed === null) setPrice(formatPrice(product.price));
    else setPrice(formatPrice(parsed));
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), SAVED_MS);
  }

  function commitDetail() {
    const v = draftDetail.trim();
    if (v && !details.includes(v)) touch(setDetails)([...details, v]);
    setDraftDetail("");
    setAdding(false);
  }

  function onDetailKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); commitDetail(); }
    if (e.key === "Escape") { setDraftDetail(""); setAdding(false); }
  }

  function del() {
    const snapshot = product;
    const at = index;
    void remove(product.id);
    router.push("/products");
    toast(`${snapshot.shortTitle} deleted`, {
      action: { label: "Undo", onClick: () => void restore(snapshot, at) },
      duration: 6000,
    });
  }

  return (
    <main className={cn("col gap-[14px] md:gap-6", saved && "saved")}>
      <ScreenHeader
        title={product.shortTitle}
        sub={`Found ${product.foundThisWeek} times this week · ${product.sold} sold`}
        backHref="/products"
        backLabel="Back to products"
        trailing={<span className={cn("tag", visible ? "ok" : "warn")}>{visible ? "Live" : "Paused"}</span>}
      />

      <div className="grid grid-cols-4 gap-2">
        {product.photos.length > 0 ? (
          product.photos.slice(0, 2).map((p, i) => (
            <div key={p.url} className="photo overflow-hidden" role="img" aria-label={p.label || `Photo ${i + 1}`} style={{ background: product.tint }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- seller photos are data URLs */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </div>
          ))
        ) : (
          <>
            <div className="photo" aria-label="Photo 1" style={{ background: product.tint }}>
              <ProductArtwork art={product.art} size={40} />
            </div>
            <div className="photo" aria-label="Photo 2" style={{ background: product.tint }}>
              <ProductArtwork art={product.art} size={40} detail />
            </div>
          </>
        )}
        <button className="photo add" type="button">
          <PlusIcon size={20} />
          <span>Add</span>
        </button>
        <button className="photo add" type="button" aria-label="Re-record the description">
          <MicIcon size={20} strokeWidth={2} />
          <span>Re-say</span>
        </button>
      </div>

      <div className="card flex flex-col gap-3 rounded-[22px] px-[18px] py-4">
        <div className="flex flex-col gap-1">
          <label className="mono" htmlFor="title">Title</label>
          <input
            className="efield hd text-base font-medium tracking-[-0.01em]"
            id="title"
            type="text"
            value={title}
            onChange={(e) => touch(setTitle)(e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <label className="mono" htmlFor="price">Price</label>
            <input
              className="efield hd h-[34px] text-[1.375rem] font-semibold tracking-[-0.02em] text-lime-ink"
              id="price"
              inputMode="decimal"
              value={price}
              onChange={(e) => touch(setPrice)(e.target.value)}
              onBlur={() => { const n = parsePrice(price); if (n !== null) setPrice(formatPrice(n)); }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="mono" id="stock-label">In stock</div>
            <div role="group" aria-labelledby="stock-label" className="flex items-center gap-2">
              <button className="step" type="button" aria-label="One fewer" onClick={() => touch(setStock)(Math.max(0, stock - 1))}>
                −
              </button>
              <span className="hd min-w-6 text-center text-xl font-semibold" aria-live="polite">
                {stock}
              </span>
              <button className="step" type="button" aria-label="One more" onClick={() => touch(setStock)(stock + 1)}>
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="mono">Details</div>
          <div className="flex flex-wrap gap-1.5">
            {details.map((d) => (
              <span className="chip" key={d}>
                {d}
                <button type="button" aria-label={`Remove ${d}`} onClick={() => touch(setDetails)(details.filter((x) => x !== d))}>
                  ×
                </button>
              </span>
            ))}
            {adding ? (
              <input
                ref={addRef}
                className="chip-input"
                type="text"
                aria-label="New detail"
                value={draftDetail}
                onChange={(e) => setDraftDetail(e.target.value)}
                onKeyDown={onDetailKey}
                onBlur={commitDetail}
              />
            ) : (
              <button
                type="button"
                className="press inline-flex min-h-[30px] cursor-pointer items-center rounded-full border border-border bg-surface px-2.5 text-[0.8125rem] font-medium text-text focus-ring"
                onClick={() => setAdding(true)}
              >
                + Add
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="mono" htmlFor="desc">Description</label>
          <textarea
            className="efield text-sm leading-[1.55]"
            id="desc"
            rows={2}
            value={description}
            onChange={(e) => touch(setDescription)(e.target.value)}
          />
        </div>
      </div>

      <VisibilityCard
        label="Visible to agents"
        ariaLabel="Visible to agents"
        hint={visible ? "Agents can find and buy it" : "Paused · hidden from agents"}
        checked={visible}
        onToggle={() => touch(setVisible)(!visible)}
      />

      <div className="flex-1" />

      <button
        type="button"
        onClick={save}
        className="lime big press focus-ring inline-flex cursor-pointer items-center justify-center rounded-full font-body font-medium leading-none"
        aria-live="polite"
      >
        <span className="lbl saveL" aria-hidden={saved}>Save changes</span>
        <span className="lbl savedL" aria-hidden={!saved}>
          <CheckIcon size={18} />
          <span>Saved</span>
        </span>
        <span className="invisible">Save changes</span>
      </button>
      <button type="button" onClick={del} className="ghost press focus-ring inline-flex cursor-pointer items-center justify-center self-center rounded-full px-4 text-sm font-medium">
        Delete this product
      </button>
    </main>
  );
}
