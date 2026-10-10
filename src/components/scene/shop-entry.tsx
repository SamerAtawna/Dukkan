"use client";

import { createContext, Suspense, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { usePathname, useRouter } from "next/navigation";
import "./shop-entry.css";

const EntryContext = createContext<{ entering: boolean; enter: (scene: HTMLElement) => void }>({
  entering: false,
  enter: () => {},
});

export const useShopEntry = () => useContext(EntryContext);

const OPEN_SHOP_HOLD_MS = 2000;

/** Isolate runtime URL access so dynamic product/order routes can still prerender. */
function EntryRouteObserver({ current }: { current: RefObject<AbortController | null> }) {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/onboarding/open" && pathname !== "/") current.current?.abort();
  }, [pathname, current]);
  return null;
}

/** Wait for the real home hero, including its data-dependent empty/populated branch. */
function homeHero(signal: AbortSignal): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const stop = () => {
      observer.disconnect();
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
    };
    const abort = () => { stop(); reject(new Error("Shop entry interrupted")); };
    const check = () => {
      const hero = document.querySelector<HTMLElement>(".shop-route [data-shop-hero]");
      if (hero) { stop(); resolve(hero); }
    };
    const observer = new MutationObserver(check);
    const timeout = window.setTimeout(abort, 4000);
    signal.addEventListener("abort", abort, { once: true });
    observer.observe(document.body, { childList: true, subtree: true });
    if (signal.aborted) abort();
    else check();
  });
}

/** Keep the actual rendered shop above both routes; no second model or screenshot morph. */
function snapshot(scene: HTMLElement) {
  const clone = scene.cloneNode(true) as HTMLElement;
  const originals = [scene, ...scene.querySelectorAll<HTMLElement>("*")];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
  originals.forEach((node, i) => {
    const style = getComputedStyle(node);
    // Freeze any in-flight entrance/tilt at the exact frame the seller pressed the link.
    copies[i].style.transform = style.transform;
    copies[i].style.opacity = style.opacity;
    copies[i].style.animation = "none";
    copies[i].style.transition = "none";
    copies[i].removeAttribute("id");
  });
  clone.className = "scene shop-entry-scene";
  clone.style.setProperty("--s", getComputedStyle(scene).getPropertyValue("--s"));
  return clone;
}

/** Root-layout lifetime lets the same 3D shop travel across the route boundary. */
export function ShopEntryProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [entering, setEntering] = useState(false);
  const current = useRef<AbortController | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  async function enter(scene: HTMLElement) {
    if (current.current) return;
    if (!scene.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push("/");
      return;
    }

    const controller = new AbortController();
    current.current = controller;
    const { signal } = controller;
    const animations: Animation[] = [];
    const rect = scene.getBoundingClientRect();
    // The zero-size tilt node is the model's actual origin. Pin that point in viewport
    // coordinates instead of scaling a percentage-origin copy of the whole scene.
    const anchor = scene.querySelector<HTMLElement>(".tiltX")!.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.className = "shop-entry-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.addEventListener("wheel", (event) => event.preventDefault(), { passive: false });
    const backdrop = document.createElement("div");
    backdrop.className = "shop-entry-backdrop";
    const camera = document.createElement("div");
    camera.className = "shop-entry-camera";
    Object.assign(camera.style, {
      left: `${anchor.left}px`, top: `${anchor.top}px`,
    });
    const clone = snapshot(scene);
    const sceneStyle = getComputedStyle(scene);
    Object.assign(clone.style, {
      left: `${rect.left - anchor.left}px`, top: `${rect.top - anchor.top}px`,
      width: `${rect.width}px`, height: `${rect.height}px`,
      perspective: sceneStyle.perspective, perspectiveOrigin: sceneStyle.perspectiveOrigin,
    });
    camera.append(clone);
    const message = document.createElement("div");
    message.className = "shop-entry-message";
    const title = document.createElement("h2");
    title.className = "shop-entry-title";
    title.textContent = "Opening your shop";
    const detail = document.createElement("p");
    detail.className = "shop-entry-detail";
    detail.textContent = "Getting everything in place.";
    const track = document.createElement("div");
    track.className = "shop-entry-track";
    const progress = document.createElement("span");
    track.append(progress);
    message.append(title, detail, track);
    overlay.append(backdrop, camera, message);
    document.body.append(overlay);
    const oldVisibility = scene.style.visibility;
    scene.style.visibility = "hidden";
    setEntering(true);

    const tokens = getComputedStyle(scene);
    const out = tokens.getPropertyValue("--ease-out").trim();
    const travel = tokens.getPropertyValue("--ease-in-out").trim();
    function play(node: Element, frames: Keyframe[], duration: number, delay = 0, easing = out) {
      const animation = node.animate(frames, { duration, delay, easing, fill: "forwards" });
      animations.push(animation);
      // Cancellation is normal on resize, Back, a redirect, or unmount.
      return animation.finished.catch(() => {});
    }
    const interrupt = () => controller.abort();
    const cancel = () => animations.forEach((animation) => animation.cancel());
    signal.addEventListener("abort", cancel, { once: true });
    window.addEventListener("resize", interrupt, { once: true });
    window.addEventListener("popstate", interrupt, { once: true });
    let navigated = false;
    let target: HTMLElement | undefined;

    try {
      const stage = clone.querySelector<HTMLElement>(".stage3d")!;
      const tilt = clone.querySelector<HTMLElement>(".tiltX")!;
      const door = clone.querySelector<HTMLElement>(".door")!;
      const light = clone.querySelector<HTMLElement>(".door-light")!;
      const scale = tokens.getPropertyValue("--s").trim();
      // A close-up stays inside even a narrow phone. The camera squares up to the door.
      const zoom = Math.min(1.8, (window.innerWidth - 32) / (150 * Number(scale)));
      const dy = Math.min(window.innerHeight * 0.4, 360) - anchor.top;
      const closeup = `translate3d(0px, ${dy}px, 0px)`;
      void play(backdrop, [{ opacity: 0 }, { opacity: 1 }], 200);
      void play(tilt, [{ transform: tilt.style.transform }, { transform: "rotateX(0deg)" }], 650, 0, travel);
      void play(stage, [{ transform: stage.style.transform }, { transform: `scale(${Number(scale) * zoom}) rotateX(-8deg) rotateY(-6deg)` }], 650, 0, travel);
      const doorOpening = play(door, [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-108deg)" }], 500, 160);
      void play(light, [{ opacity: 0 }, { opacity: 1 }], 500, 180);
      clone.querySelectorAll(".agent, .orbit").forEach((bot) => {
        void play(bot, [{ opacity: getComputedStyle(bot).opacity }, { opacity: 0 }], 200, 80);
      });
      await Promise.all([
        doorOpening,
        play(camera, [{ transform: "translate3d(0px, 0px, 0px)" }, { transform: closeup }], 650, 0, travel),
      ]);
      if (signal.aborted) return;

      // Measure the settled 3D floor so the message sits beneath the house at any scale.
      // On short screens, lift the entire close-up enough to leave room for the copy.
      const floor = clone.querySelector<HTMLElement>(".pedestal")!.getBoundingClientRect();
      const messageTop = floor.bottom + 28;
      const overflow = Math.max(0, messageTop + message.offsetHeight + 24 - window.innerHeight);
      const heldCloseup = `translate3d(0px, ${dy - overflow}px, 0px)`;
      if (overflow > 0) {
        await play(camera, [{ transform: closeup }, { transform: heldCloseup }], 250);
        if (signal.aborted) return;
      }
      message.style.top = `${messageTop - overflow}px`;
      void play(message, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0px)" }], 250);
      // This line marks the two-second welcome beat, not backend/network progress.
      // Keeping the hold in WAAPI also lets Back/resize cancel it with the other motion.
      await play(progress, [{ transform: "scaleX(0.04)" }, { transform: "scaleX(1)" }], OPEN_SHOP_HOLD_MS, 0, "linear");
      if (signal.aborted) return;

      router.push("/", { scroll: false });
      navigated = true;
      target = await homeHero(signal);
      window.scrollTo({ top: 0, behavior: "instant" });
      const targetTilt = target.querySelector<HTMLElement>(".tiltX")!;
      const destination = targetTilt.getBoundingClientRect();
      const landing = `translate3d(${destination.left - anchor.left}px, ${destination.top - anchor.top}px, 0px)`;
      const targetStage = target.querySelector<HTMLElement>(".stage3d")!;
      void play(message, [{ opacity: 1, transform: "translateY(0px)" }, { opacity: 0, transform: "translateY(8px)" }], 180);
      void play(tilt, [{ transform: getComputedStyle(tilt).transform }, { transform: getComputedStyle(targetTilt).transform }], 650, 0, travel);
      void play(stage, [{ transform: getComputedStyle(stage).transform }, { transform: getComputedStyle(targetStage).transform }], 650, 0, travel);
      void play(door, [{ transform: "rotateY(-108deg)" }, { transform: "rotateY(0deg)" }], 500, 100);
      void play(light, [{ opacity: 1 }, { opacity: 0 }], 300, 150);
      // Reveal the destination around the still-continuous shop, then hand it back.
      void play(backdrop, [{ opacity: 1 }, { opacity: 0 }], 300, 250);
      await play(camera, [{ transform: heldCloseup }, { transform: landing }], 650, 0, travel);
      if (signal.aborted) return;
      target.style.visibility = "visible";
      void play(target, [{ opacity: 0 }, { opacity: 1 }], 160);
      await play(camera, [{ opacity: 1 }, { opacity: 0 }], 160);
    } catch {
      // A slow load or missing hero must never trap the seller behind the transition.
    } finally {
      cancel();
      overlay.remove();
      scene.style.visibility = oldVisibility;
      target?.style.removeProperty("visibility");
      window.removeEventListener("resize", interrupt);
      window.removeEventListener("popstate", interrupt);
      signal.removeEventListener("abort", cancel);
      current.current = null;
      setEntering(false);
      // Resize skips the flourish but still completes the requested navigation.
      if (!navigated && window.location.pathname === "/onboarding/open") router.push("/");
      if (navigated && !signal.aborted) {
        requestAnimationFrame(() => {
          const heading = document.querySelector<HTMLElement>(".shop-route main h1");
          if (!heading || current.current) return;
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
          heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true });
        });
      }
    }
  }

  return (
    <EntryContext.Provider value={{ entering, enter }}>
      <Suspense fallback={null}><EntryRouteObserver current={current} /></Suspense>
      <div className="shop-route" data-entering={entering || undefined} inert={entering}>
        {children}
      </div>
      <span className="sr-only" role="status">{entering ? "Opening your shop…" : ""}</span>
    </EntryContext.Provider>
  );
}
