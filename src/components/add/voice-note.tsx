"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { clock } from "@/lib/add-config";
import { PauseIcon, PlayIcon } from "@/components/add/icons";
import { DESKTOP, useMedia } from "@/components/add/use-media";

/**
 * The recorded voice note: lime play button, still waveform, duration.
 * Plays the real recording; bars turn lime-ink left to right as it plays.
 * Phone shows 34 bars (10 played at rest), desktop 70 (18 played), as in the files.
 */
export function VoiceNote({
  audioUrl,
  durationSecs,
  variant = "card",
}: {
  audioUrl: string;
  durationSecs: number;
  variant?: "card" | "inset";
}) {
  const desktop = useMedia(DESKTOP);
  const total = desktop ? 70 : 34;
  const restPlayed = desktop ? 18 : 10;

  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState<number | null>(null);
  const [duration, setDuration] = useState(durationSecs);

  useEffect(() => {
    const a = new Audio(audioUrl);
    audio.current = a;
    const onTime = () => {
      const d = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : duration || 1;
      setPlayed(Math.min(total, Math.floor((a.currentTime / d) * total)));
    };
    const onEnd = () => {
      setPlaying(false);
      setPlayed(null);
    };
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("loadedmetadata", onMeta);
      audio.current = null;
    };
    // `duration` only seeds the fallback; a new URL rebuilds the element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, total]);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    setPlayed(0);
    void a.play().then(
      () => setPlaying(true),
      () => setPlaying(false)
    );
  }

  const shown = played ?? restPlayed;

  return (
    <div
      className={cn(
        "flex items-center",
        variant === "card"
          ? "card gap-3 rounded-full py-2.5 pl-2.5 pr-3.5"
          : "gap-3.5 rounded-full border border-border bg-ground py-2 pl-2 pr-4"
      )}
    >
      <button
        className="icon play"
        type="button"
        aria-label={playing ? "Pause your voice note" : "Play your voice note"}
        aria-pressed={playing}
        onClick={toggle}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="wave still flex-1 justify-start overflow-hidden" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn("bar", i < shown && "played")} />
        ))}
      </div>
      <span className="mono">{clock(duration)}</span>
    </div>
  );
}
