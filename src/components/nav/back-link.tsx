import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Round back button used by every sub-screen (`.icon` from the design files). */
export function BackLink({ href, label = "Back", className }: { href: string; label?: string; className?: string }) {
  return (
    <Link href={href} className={cn("icon", className)} aria-label={label}>
      <ArrowLeftIcon size={20} />
    </Link>
  );
}
