import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Pill button from Components.dc.html (.btn / .lime / .sel / .sm / .big).
 * Press = scale(.97) 160ms ease-out; hover shadow only on fine pointers.
 */
export const buttonVariants = cva(
  [
    "box-border inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer select-none",
    "rounded-full border border-border bg-surface",
    "font-body font-medium leading-none",
    "shadow-(--shadow-btn)",
    "transition-[transform,box-shadow] duration-[160ms,180ms] ease-(--ease-out)",
    "active:scale-[.97]",
    "[@media(hover:hover)_and_(pointer:fine)]:hover:shadow-(--shadow-btn-hover)",
    "focus-visible:outline-3 focus-visible:outline-focus focus-visible:outline-offset-3",
  ],
  {
    variants: {
      size: {
        sm: "min-h-9 px-3 text-xs",
        md: "min-h-11 px-4 text-sm md:px-[18px]",
        big: "min-h-14 px-7 text-base",
      },
      tone: {
        default: "text-text",
        lime: [
          "border-0 text-[#1C3300]",
          "bg-[radial-gradient(circle_at_35%_20%,#EDFFA6_0%,#C8FF4D_50%,#A9E42E_100%)]",
          "shadow-(--shadow-lime)",
          "[@media(hover:hover)_and_(pointer:fine)]:hover:shadow-(--shadow-lime)",
        ],
        selected: "bg-text text-white border-text",
      },
    },
    defaultVariants: { size: "md", tone: "default" },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, size, tone, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ size, tone }), className)} {...props} />;
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>;

export function ButtonLink({ className, size, tone, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ size, tone }), className)} {...props} />;
}
