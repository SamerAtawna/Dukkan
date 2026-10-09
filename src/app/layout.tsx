import type { Metadata, Viewport } from "next";
import { Unbounded, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { PayPalGate } from "@/components/paypal-gate";
import "./globals.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Self-hosted (variable, Latin + Arabic, OFL in ./fonts): next/font/google fails the Turbopack
// production build on Readex Pro with "queries have exactly one entry" (Next 16.4).
const readex = localFont({
  variable: "--font-readex",
  src: "./fonts/ReadexPro.woff2",
  weight: "160 700",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dukkan",
  description:
    "A shop that AI shopping agents can search and buy from, paid through PayPal. Add products with photos and a voice note.",
};

export const viewport: Viewport = {
  themeColor: "#F2F3EF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${unbounded.variable} ${readex.variable} ${jetbrains.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Suspense fallback={null}>
          <PayPalGate />
        </Suspense>
        <Toaster
          position="bottom-center"
          offset={88}
          mobileOffset={88}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "card flex w-full items-center gap-3 rounded-full px-4 py-3 font-body text-sm text-text shadow-(--shadow-card)",
              actionButton: "ml-auto inline-flex min-h-9 items-center rounded-full bg-text px-3 text-xs font-medium text-surface",
            },
          }}
        />
      </body>
    </html>
  );
}
