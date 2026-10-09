import type { SVGProps } from "react";
import type { Order } from "@/lib/types";

export type ThumbArt = "cushion" | "cushionAlt" | "spoons";

/** Placeholder thumbnail for an order, from what was bought. */
export function thumbFor(order: Pick<Order, "items">): ThumbArt {
  const title = (order.items[0]?.title ?? "").toLowerCase();
  if (title.includes("spoon") || title.includes("wood")) return "spoons";
  if (title.includes("rug") || title.includes("soap")) return "cushionAlt";
  return "cushion";
}

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function TruckIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

export function CloseIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** Product thumbnail art from the design files (placeholder until real photos). */
export function ThumbArtSvg({ art, size = 28 }: { art: ThumbArt; size?: number }) {
  if (art === "spoons") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="14" y="10" width="36" height="44" rx="8" fill="#F1F4EA" stroke="#C9D2B6" />
        <path d="M24 22h16M24 32h16M24 42h10" stroke="#6B7F4E" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (art === "cushionAlt") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="8" y="8" width="48" height="48" rx="10" fill="#F6F0E3" stroke="#D9CDB2" />
        <path d="M20 32h24M32 20v24" stroke="#1E232B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="48" height="48" rx="10" fill="#F6F0E3" stroke="#D9CDB2" />
      <path d="M32 18l14 14-14 14-14-14z" stroke="#B4382E" strokeWidth="2.5" strokeLinejoin="round" />
      {size >= 40 && <path d="M32 26l6 6-6 6-6-6z" stroke="#1E232B" strokeWidth="2.5" strokeLinejoin="round" />}
    </svg>
  );
}
