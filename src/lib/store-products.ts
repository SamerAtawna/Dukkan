import { create } from "zustand";
import { api } from "@/lib/api";
import type { NewProduct, Product } from "@/lib/types";

/**
 * Product state shared across /products, /products/[id] and the home empty state.
 * Optimistic: the list updates first, the request follows; a failure reloads from the server.
 */
type ProductsState = {
  products: Product[];
  loaded: boolean;
  load: () => Promise<void>;
  setVisible: (id: string, visible: boolean) => void;
  setStock: (id: string, stock: number) => void;
  update: (id: string, patch: Partial<NewProduct>) => Promise<Product | undefined>;
  remove: (id: string) => Promise<void>;
  /** Put a removed product back at its previous index (toast Undo). */
  restore: (product: Product, index: number) => Promise<void>;
  /** A freshly published product (from /add/review). */
  add: (product: Product) => void;
};

let inflight: Promise<void> | null = null;

export const useProducts = create<ProductsState>((set, get) => ({
  products: [],
  loaded: false,
  load: () => {
    if (inflight) return inflight;
    inflight = api
      .get<Product[]>("/api/products")
      .then((products) => set({ products, loaded: true }))
      .catch(() => set({ loaded: true }))
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
  setVisible: (id, visible) => {
    set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, visible } : p)) }));
    api.patch(`/api/products/${id}`, { visible }).catch(() => get().load());
  },
  setStock: (id, stock) => {
    const next = Math.max(0, stock);
    set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, stock: next } : p)) }));
    api.patch(`/api/products/${id}`, { stock: next }).catch(() => get().load());
  },
  update: async (id, patch) => {
    set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    try {
      const saved = await api.patch<Product>(`/api/products/${id}`, patch);
      set((s) => ({ products: s.products.map((p) => (p.id === id ? saved : p)) }));
      return saved;
    } catch {
      void get().load();
      return undefined;
    }
  },
  remove: async (id) => {
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
    try {
      await api.del(`/api/products/${id}`);
    } catch {
      void get().load();
    }
  },
  restore: async (product, index) => {
    if (get().products.some((p) => p.id === product.id)) return;
    set((s) => {
      const next = [...s.products];
      next.splice(Math.min(index, next.length), 0, product);
      return { products: next };
    });
    try {
      const body: NewProduct & { id: string } = {
        id: product.id,
        title: product.title,
        shortTitle: product.shortTitle,
        price: product.price,
        stock: product.stock,
        details: product.details,
        description: product.description,
        aiAdded: product.aiAdded,
        transcript: product.transcript,
        transcriptLang: product.transcriptLang,
        art: product.art,
        tint: product.tint,
        photos: product.photos,
        visible: product.visible,
      };
      await api.post("/api/products", body);
    } catch {
      void get().load();
    }
  },
  add: (product) => set((s) => ({ products: [product, ...s.products.filter((p) => p.id !== product.id)] })),
}));

/** Selectors */
export const hasProducts = (s: ProductsState) => s.products.length > 0;
export const visibleCount = (s: ProductsState) => s.products.filter((p) => p.visible).length;
export const selectProduct = (id: string) => (s: ProductsState) => s.products.find((p) => p.id === id);
