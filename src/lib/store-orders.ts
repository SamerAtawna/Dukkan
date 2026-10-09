import { create } from "zustand";
import { api } from "@/lib/api";
import type { Order } from "@/lib/types";

export type Carrier = "Israel Post" | "DHL" | "Other";

type OrdersState = {
  orders: Order[];
  loaded: boolean;
  /** Progress step the seller last saw per order: the line only redraws when it changed. */
  seenStep: Record<string, number>;
  load: () => Promise<void>;
  markShipped: (id: string, shipment: { carrier: Carrier; tracking: string }) => Promise<void>;
  unship: (id: string) => Promise<void>;
  markSeen: (id: string, step: number) => void;
};

let inflight: Promise<void> | null = null;

export const useOrders = create<OrdersState>((set, get) => ({
  orders: [],
  loaded: false,
  seenStep: {},
  load: () => {
    if (inflight) return inflight;
    inflight = api
      .get<Order[]>("/api/orders")
      .then((orders) => set({ orders, loaded: true }))
      .catch(() => set({ loaded: true }))
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
  markShipped: async (id, { carrier, tracking }) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, status: "shipped", carrier, tracking, shippedAt: new Date().toISOString() } : o)),
    }));
    try {
      const saved = await api.patch<Order>(`/api/orders/${id}`, { action: "ship", carrier, tracking });
      set((s) => ({ orders: s.orders.map((o) => (o.id === id ? saved : o)) }));
    } catch {
      void get().load();
    }
  },
  unship: async (id) => {
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: "paid", carrier: null, tracking: null, shippedAt: null } : o)) }));
    try {
      const saved = await api.patch<Order>(`/api/orders/${id}`, { action: "unship" });
      set((s) => ({ orders: s.orders.map((o) => (o.id === id ? saved : o)) }));
    } catch {
      void get().load();
    }
  },
  markSeen: (id, step) => set((s) => ({ seenStep: { ...s.seenStep, [id]: step } })),
}));

/** Progress step on the order screen: 3 = paid (ship it), 4 = shipped or delivered. */
export function stepOf(status: Order["status"]) {
  return status === "shipped" || status === "delivered" ? 4 : status === "paid" ? 3 : 2;
}

/** Orders the seller acts on: paid and later. Carts still being built stay on the home feed.
 *  Not a store selector (it returns a new array): call it on `useOrders((s) => s.orders)` inside useMemo. */
export const selectOrders = (orders: Order[]) => orders.filter((o) => o.status !== "pending" && o.status !== "cancelled");
export const selectOrder = (id: string) => (s: OrdersState) => s.orders.find((o) => o.id === id);

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** "today 09:42", "yesterday", "Mon" (list rows and headers). */
export function whenLabel(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (sameDay(d, now)) return `today ${time}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return "yesterday";
  if (now.getTime() - d.getTime() < 6 * 24 * 60 * 60 * 1000) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function timeLabel(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** One line of what was bought, e.g. "1 item · Cotton · 45 × 45 cm". */
export function itemsLabel(o: Order, long = false) {
  const qty = o.items.reduce((s, i) => s + i.qty, 0);
  const head = `${qty} item${qty === 1 ? "" : "s"}`;
  return long && o.items.length === 1 ? head : head;
}

/** Address lines for the "Ship to" card, or null before PayPal has told us. */
export function addressLines(o: Order): string[] | null {
  const a = o.address;
  if (!a) return null;
  const lines = [a.name, a.line1, a.line2, [a.city, a.region, a.postal].filter(Boolean).join(" "), a.country].filter(
    (l): l is string => Boolean(l && l.trim())
  );
  return lines.length ? lines : null;
}
