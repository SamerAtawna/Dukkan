import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function CameraIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function UploadIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

export function PlayIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M7 4.5v15l13-7.5z" />
    </svg>
  );
}

export function PauseIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <rect x="6" y="4.5" width="4.5" height="15" rx="1.5" />
      <rect x="13.5" y="4.5" width="4.5" height="15" rx="1.5" />
    </svg>
  );
}

/** Placeholder artwork standing in for the seller's photos (from the design files). */
export function CushionArt({ size = 64, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" {...rest}>
      <rect x="8" y="8" width="48" height="48" rx="10" fill="#F6F0E3" stroke="#D9CDB2" />
      <path d="M32 18l14 14-14 14-14-14z" stroke="#B4382E" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 26l6 6-6 6-6-6z" stroke="#1E232B" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 18l4 4M46 18l-4 4M18 46l4-4M46 46l-4-4" stroke="#B4382E" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function CushionDetailArt({ size = 64, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" {...rest}>
      <rect x="8" y="8" width="48" height="48" rx="10" fill="#F6F0E3" stroke="#D9CDB2" />
      <path d="M20 32h24M32 20v24" stroke="#1E232B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 24l16 16M40 24L24 40" stroke="#B4382E" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
