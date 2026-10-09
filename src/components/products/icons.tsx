import type { SVGProps } from "react";
import type { ProductArt } from "@/lib/types";

/** Icons and photo stand-ins for the products screens. Inline SVG only (DESIGN.md). */

export function PlusIcon({ size = 26, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Product illustration from the design files. `detail` is the second photo of the cushion. */
export function ProductArtwork({ art, size = 80, detail = false }: { art: ProductArt; size?: number; detail?: boolean }) {
  const common = { width: size, height: size, viewBox: "0 0 64 64", fill: "none", "aria-hidden": true as const };
  if (art === "cushion") {
    return (
      <svg {...common}>
        <rect x="8" y="8" width="48" height="48" rx="10" fill="#F6F0E3" stroke="#D9CDB2" />
        {detail ? (
          <path d="M24 24l16 16M40 24L24 40" stroke="#B4382E" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <>
            <path d="M32 18l14 14-14 14-14-14z" stroke="#B4382E" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M32 26l6 6-6 6-6-6z" stroke="#1E232B" strokeWidth="2.5" strokeLinejoin="round" />
          </>
        )}
      </svg>
    );
  }
  if (art === "spoons") {
    return (
      <svg {...common}>
        <rect x="14" y="10" width="36" height="44" rx="8" fill="#F1F4EA" stroke="#C9D2B6" />
        <path d="M24 22h16M24 32h16M24 42h10" stroke="#6B7F4E" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="10" y="14" width="44" height="36" rx="6" fill="#F3EBE4" stroke="#D6C3B4" />
      <path d="M16 22h32M16 30h32M16 38h32M16 46h32" stroke="#A86A4A" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
