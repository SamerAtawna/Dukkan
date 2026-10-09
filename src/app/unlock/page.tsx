"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/icons";

/** Seller sign-in for hosted deployments: paste the seller key once, it becomes a cookie. */
export default function UnlockPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("That key did not match.");
      return;
    }
    router.replace("/");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ground text-text">
      <main className="col flex-1 justify-center">
        <form onSubmit={submit} className="card mx-auto flex w-full max-w-[420px] flex-col gap-4 rounded-[26px] p-6">
          <div className="flex flex-col gap-1.5">
            <div className="mono">Seller sign-in</div>
            <h1 className="hd m-0 text-xl font-medium tracking-[-0.01em]">This is your shop.</h1>
            <p className="m-0 text-sm leading-normal text-text-2">Paste the seller key from the deployment to open it on this device.</p>
          </div>
          <label className="vh" htmlFor="key">
            Seller key
          </label>
          <input
            id="key"
            className="field"
            type="password"
            autoComplete="current-password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoFocus
          />
          {error && (
            <div className="mono text-saffron-ink" role="alert">
              {error}
            </div>
          )}
          <Button type="submit" tone="lime" size="big" disabled={busy || !key.trim()} aria-busy={busy}>
            <span>Open my shop</span>
            <ArrowRightIcon size={18} strokeWidth={2.4} />
          </Button>
        </form>
      </main>
    </div>
  );
}
