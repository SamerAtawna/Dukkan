import { create } from "zustand";
import type { Photo, ProductArt, SellerLang } from "@/lib/types";

/** The listing the AI wrote for the current draft (mirror of /api/listing's response). */
export type ListingDraft = {
  title: string;
  shortTitle: string;
  price: number | null;
  details: string[];
  description: string;
  aiAdded: string | null;
  question: { kind: "stock" | "price" | "size" | "other"; text: string; quick: number[] } | null;
  stock: number | null;
  art: ProductArt;
  transcript: string;
  lang: string | null;
};

/**
 * One product being added: photos and voice note on /add, the AI listing on /add/review.
 * In memory only; a reload starts over, which is what the seller expects.
 */
type DraftState = {
  photos: Photo[];
  transcript: string;
  transcriptLang: SellerLang | string | null;
  /** Length of the recording in seconds (for the voice-note card). */
  durationSecs: number;
  /** The recording itself, kept so "Record again" can be undone and the note replayed. */
  audioUrl: string | null;
  listing: ListingDraft | null;
  addPhoto: (p: Photo) => void;
  removePhoto: (url: string) => void;
  setTranscript: (t: string, lang: string | null, durationSecs: number, audioUrl: string | null) => void;
  setListing: (l: ListingDraft | null) => void;
  reset: () => void;
};

const empty = { photos: [], transcript: "", transcriptLang: null, durationSecs: 0, audioUrl: null, listing: null };

export const useDraft = create<DraftState>((set) => ({
  ...empty,
  addPhoto: (p) => set((s) => (s.photos.length >= 4 ? s : { photos: [...s.photos, p] })),
  removePhoto: (url) => set((s) => ({ photos: s.photos.filter((p) => p.url !== url) })),
  setTranscript: (transcript, transcriptLang, durationSecs, audioUrl) =>
    set({ transcript, transcriptLang, durationSecs, audioUrl, listing: null }),
  setListing: (listing) => set({ listing }),
  reset: () => set({ ...empty }),
}));
