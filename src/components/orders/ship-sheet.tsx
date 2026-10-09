"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { Carrier } from "@/lib/store-orders";
import { CloseIcon } from "@/components/orders/icons";

const CARRIERS: Carrier[] = ["Israel Post", "DHL", "Other"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  onShip: (carrier: Carrier, tracking: string) => void;
  /** Rendered inside the page root so the route-scoped CSS applies. */
  container: RefObject<HTMLElement | null>;
};

/**
 * "Add tracking number" — phone: bottom sheet (500ms --ease-drawer, draggable), desktop: centred modal.
 * Base UI Dialog owns focus trapping, scroll lock and dismissal; the CSS handles the enter/exit.
 */
export function ShipSheet({ open, onOpenChange, onOpenChangeComplete, onShip, container }: Props) {
  const [carrier, setCarrier] = useState<Carrier>("Israel Post");
  const [tracking, setTracking] = useState("RR 123 456 789 IL");
  const reduced = useReducedMotion();
  const y = useMotionValue(0);
  const phone = useRef(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => {
      phone.current = !mq.matches;
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Reopening after Undo: the panel must start where the CSS transition expects it.
  useEffect(() => {
    if (open) y.set(0);
  }, [open, y]);

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setTracking(text.trim());
    } catch {
      /* clipboard not available: the field stays editable */
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)} onOpenChangeComplete={onOpenChangeComplete}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop className="scrim" />
        {/* Focus lands on the panel itself, not the Close button, so no ring shows on open. */}
        <Dialog.Popup className="sheet" aria-labelledby="sheet-title" initialFocus={panelRef}>
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className="sheet-panel outline-none"
            style={{ y }}
            drag={reduced ? false : "y"}
            dragDirectionLock
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (!phone.current) {
                animate(y, 0, { duration: 0.2 });
                return;
              }
              const carried = Math.abs(info.velocity.y) > 200;
              if (info.offset.y > 120 || info.velocity.y > 600) {
                onOpenChange(false);
                return;
              }
              // Settle back. Bounce only when the gesture carried momentum.
              animate(y, 0, { type: "spring", duration: 0.5, bounce: carried ? 0.2 : 0 });
            }}
          >
            <div className="handle" aria-hidden="true" />
            <div className="flex items-center justify-between gap-3">
              <Dialog.Title id="sheet-title" className="hd m-0 text-lg font-medium tracking-[-0.01em]">
                Add tracking number
              </Dialog.Title>
              <Dialog.Close className="icon !h-10 !w-10" aria-label="Close">
                <CloseIcon />
              </Dialog.Close>
            </div>
            <div className="flex flex-col gap-2">
              <div className="mono" id="carrier-label">
                Carrier
              </div>
              <div role="group" aria-labelledby="carrier-label" className="flex flex-wrap gap-2">
                {CARRIERS.map((c) => (
                  <Button
                    key={c}
                    className="carrier"
                    tone={carrier === c ? "selected" : "default"}
                    aria-pressed={carrier === c}
                    onClick={() => setCarrier(c)}
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="mono" htmlFor="trk">
                Tracking number
              </label>
              <div className="flex gap-2">
                <input
                  className="trk"
                  id="trk"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  placeholder="Paste or type"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                />
                <Button className="min-h-14 flex-none !rounded-[18px]" onClick={paste}>
                  Paste
                </Button>
              </div>
              <div className="text-[0.8125rem] leading-normal text-text-2">
                The buyer&apos;s agent gets the number the moment you mark it shipped.
              </div>
            </div>
            <Button tone="lime" size="big" className="w-full" onClick={() => onShip(carrier, tracking.trim())}>
              Mark as shipped
            </Button>
          </motion.div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
