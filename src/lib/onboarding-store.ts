import { create } from "zustand";
import { useShop } from "@/lib/store";
import type { SellerLang } from "@/lib/types";

/** Languages the seller can record in. Listings are always written in English. */
export const sellerLanguages = [
  { code: "ar", label: "العربية" },
  { code: "he", label: "עברית" },
  { code: "en", label: "English" },
] as const;

export type { SellerLang };

type OnboardingState = {
  shopName: string;
  lang: SellerLang;
  /** Pulled the saved shop into the draft once. */
  hydrated: boolean;
  setShopName: (name: string) => void;
  setLang: (lang: SellerLang) => void;
  /** Copy the saved shop into the draft (on first visit). */
  hydrate: () => Promise<void>;
  /** Save the draft to the shop (Continue). */
  commit: () => Promise<void>;
};

/**
 * Answers typed during setup. Kept as a draft so each keystroke does not hit the server;
 * `commit()` writes them to /api/shop.
 */
export const useOnboarding = create<OnboardingState>((set, get) => ({
  shopName: "",
  lang: "ar",
  hydrated: false,
  setShopName: (shopName) => set({ shopName }),
  setLang: (lang) => set({ lang }),
  hydrate: async () => {
    if (get().hydrated) return;
    await useShop.getState().load();
    const shop = useShop.getState();
    set({
      hydrated: true,
      shopName: shop.onboarded || shop.name !== "My shop" ? shop.name : "",
      lang: shop.lang,
    });
  },
  commit: async () => {
    const { shopName, lang } = get();
    await useShop.getState().save({ name: shopName.trim() || "My shop", lang });
  },
}));
