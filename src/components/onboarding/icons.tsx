import type { SVGProps } from "react";

/** Chevron used by the onboarding back button (Onboard2). */
export function ChevronLeftIcon({ size = 20, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
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
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

/** Stylised PayPal double-P monogram: navy behind, light blue in front (PayPal brand colours). */
export function PayPalMark({ size = 22, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...rest}>
      <path
        fillRule="evenodd"
        d="M5.5 2.5h6.8a5 5 0 0 1 0 10H9.2l-1.1 6H3.9zM9.3 6.3h2.6a1.9 1.9 0 0 1 0 3.8H8.6z"
        fill="var(--pp-a, #003087)"
      />
      <path
        fillRule="evenodd"
        d="M9.1 6.2h6.4a4.6 4.6 0 0 1 0 9.2h-2.6l-1 5.6H7.6zM12.6 9.6h2.3a1.7 1.7 0 0 1 0 3.4H12z"
        fill="var(--pp-b, #009cde)"
      />
    </svg>
  );
}
