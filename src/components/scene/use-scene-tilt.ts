"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { cn } from "@/lib/cn";

/** Resting angles of `.stage3d` (rotateY) and `.tiltX` (rotateX), as set in globals.css. */
const BASE_RY = -24;
const BASE_RX = -16;

type Options = {
  /** Dragging (mouse or touch) turns the shop within bounds; it springs back on release. */
  drag?: boolean;
  /** Called on a press that did not turn into a drag. */
  onTap?: () => void;
};

type Press = { x: number; y: number; moved: boolean };

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Pointer interaction for a `.scene`:
 *   - hover (fine pointer): quantised tilt via `hx*` / `vy*` classes, as the hero does
 *   - drag (opt-in): free turn, clamped so the two missing faces never show, spring back on release
 *   - tap (opt-in): a press without movement
 * Reduced motion disables hover and drag; taps still work.
 */
export function useSceneTilt({ drag = false, onTap }: Options = {}) {
  const [hx, setHx] = useState(0);
  const [vy, setVy] = useState(0);
  const [turn, setTurn] = useState<{ ry: number; rx: number } | null>(null);
  const press = useRef<Press | null>(null);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!drag && !onTap) return;
    press.current = { x: e.clientX, y: e.clientY, moved: false };
    if (drag && !reducedMotion()) {
      // Keeps the drag alive when the finger leaves the scene. Throws if the pointer is already gone.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (p && drag && !reducedMotion()) {
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!p.moved && Math.hypot(dx, dy) < 4) return;
      p.moved = true;
      setTurn({ ry: clamp(BASE_RY + dx * 0.25, -62, -2), rx: clamp(BASE_RX - dy * 0.12, -24, -8) });
      return;
    }
    if (e.pointerType !== "mouse" || reducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = clamp(Math.round(((e.clientX - r.left) / r.width - 0.5) * 4), -2, 2);
    const ny = clamp(Math.round(((e.clientY - r.top) / r.height - 0.5) * 2), -1, 1);
    if (nx !== hx) setHx(nx);
    if (ny !== vy) setVy(ny);
  }

  function release() {
    const p = press.current;
    press.current = null;
    if (p && !p.moved) onTap?.();
    setTurn(null);
  }

  function onPointerLeave() {
    setHx(0);
    setVy(0);
  }

  return {
    sceneProps: { onPointerDown, onPointerMove, onPointerUp: release, onPointerCancel: release, onPointerLeave },
    /** True while a drag is in progress (transitions are off so the shop follows the finger). */
    turning: turn !== null,
    tiltClass: cn("tiltX", `vy${vy}`),
    tiltStyle: turn ? ({ transform: `rotateX(${turn.rx - BASE_RX}deg)` } as CSSProperties) : undefined,
    stageClass: cn("stage3d", `hx${hx}`),
    stageStyle: turn ? ({ "--ry": `${turn.ry}deg` } as CSSProperties) : undefined,
  };
}
