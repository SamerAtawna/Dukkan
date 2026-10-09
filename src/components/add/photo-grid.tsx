"use client";

import { useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/cn";
import { fileToDataUrl } from "@/lib/image";
import { useDraft } from "@/lib/store-draft";
import { CameraIcon, UploadIcon } from "@/components/add/icons";

const MAX_PHOTOS = 4;

/** Photo tiles: the seller's photos, an "Add photo" tile (camera on phones), and (desktop) a drop target. */
export function PhotoGrid() {
  const photos = useDraft((s) => s.photos);
  const addPhoto = useDraft((s) => s.addPhoto);
  const removePhoto = useDraft((s) => s.removePhoto);
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  async function take(files: FileList | File[] | null) {
    if (!files) return;
    setBusy(true);
    try {
      const room = MAX_PHOTOS - useDraft.getState().photos.length;
      for (const file of Array.from(files).slice(0, Math.max(0, room))) {
        if (!file.type.startsWith("image/")) continue;
        const url = await fileToDataUrl(file);
        addPhoto({ url, label: `Photo ${useDraft.getState().photos.length + 1}` });
      }
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    void take(e.dataTransfer.files);
  }

  const full = photos.length >= MAX_PHOTOS;

  return (
    <div className="flex flex-col gap-2.5 md:gap-3">
      <div className="mono">Photos</div>
      <div className="grid grid-cols-3 gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))] md:gap-3.5">
        {photos.map((p, i) => (
          <div key={p.url} className="tile photo relative overflow-hidden" role="img" aria-label={p.label}>
            {/* eslint-disable-next-line @next/next/no-img-element -- just-taken photos are data URLs */}
            <img src={p.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="mono n relative">{i + 1}</span>
            <button
              type="button"
              className="press absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(16,19,26,.7)] text-sm leading-none text-white"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => removePhoto(p.url)}
            >
              ×
            </button>
          </div>
        ))}
        {!full && (
          <button className="tile add" type="button" onClick={() => input.current?.click()} aria-busy={busy} disabled={busy}>
            <CameraIcon className="h-6 w-6 md:h-7 md:w-7" />
            <span>{busy ? "Adding…" : photos.length ? "Add photo" : "Take a photo"}</span>
          </button>
        )}
        {!full && (
          <button
            className={cn("tile add hidden md:flex", over && "over")}
            type="button"
            aria-label="Drop a photo here"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
          >
            <UploadIcon className="h-7 w-7" />
            <span>Drop here</span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="vh"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void take(e.target.files)}
      />
    </div>
  );
}
