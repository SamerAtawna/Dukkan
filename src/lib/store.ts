import { create } from "zustand";
import { api } from "@/lib/api";
import type { SellerLang, Shop } from "@/lib/types";

/**
 * Shop state shared across routes: the seller's settings (from /api/shop) plus the
 * purely visual agent count on the home hero (2 normally, 3 while a fresh payment lands).
 */
type ShopState = Shop & {
  /** Settings have been fetched at least once. */
  loaded: boolean;
  /** The backend is not configured (.env.local missing keys). */
  offline: boolean;
  agents: 2 | 3;
  load: () => Promise<void>;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setAgents: (n: 2 | 3) => void;
  setLang: (lang: SellerLang) => void;
  setName: (name: string) => void;
  toggleNotify: (key: "notifyPaid" | "notifyNoMatch" | "notifyWeekly") => void;
  save: (patch: Partial<Shop>) => Promise<void>;
};

const defaults: Shop = {
  name: "My shop",
  lang: "ar",
  open: true,
  paypalEmail: null,
  onboarded: false,
  notifyPaid: true,
  notifyNoMatch: true,
  notifyWeekly: false,
};

let inflight: Promise<void> | null = null;

export const useShop = create<ShopState>((set, get) => ({
  ...defaults,
  loaded: false,
  offline: false,
  agents: 2,
  load: () => {
    if (inflight) return inflight;
    inflight = api
      .get<Shop>("/api/shop")
      .then((shop) => set({ ...shop, loaded: true, offline: false }))
      .catch(() => set({ loaded: true, offline: true }))
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
  save: async (patch) => {
    set(patch);
    try {
      const shop = await api.patch<Shop>("/api/shop", patch);
      set(shop);
    } catch {
      /* optimistic value stays; the next load() reconciles */
    }
  },
  toggleOpen: () => void get().save({ open: !get().open }),
  setOpen: (open) => void get().save({ open }),
  setAgents: (agents) => set({ agents }),
  setLang: (lang) => void get().save({ lang }),
  setName: (name) => void get().save({ name }),
  toggleNotify: (key) => void get().save({ [key]: !get()[key] }),
}));

export const languages: { code: SellerLang; label: string }[] = [
  { code: "ar", label: "العربية" },
  { code: "he", label: "עברית" },
  { code: "en", label: "English" },
];
