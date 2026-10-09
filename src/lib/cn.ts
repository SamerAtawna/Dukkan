import { clsx, type ClassValue } from "clsx";

/** Conditional className helper (clsx). Use cva for components with real variants. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
