"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Route-segment error boundary. Catches throws from page/segment rendering and
 * keeps the app shell (header/nav) intact — only this route shows the fallback,
 * with a one-tap retry. Errors in the root layout fall back to global-error.tsx.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="card animate-fade-in-up max-w-md p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
          <AlertTriangle size={26} />
        </span>
        <h2 className="mt-4 text-xl font-bold text-ink">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted">
          This page hit an unexpected error. You can try again — the rest of Hanuone is still working.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <button onClick={() => reset()} className="btn-primary inline-flex items-center gap-2">
            <RotateCcw size={16} /> Try again
          </button>
          <Link href="/" className="btn-outline">Go to homepage</Link>
        </div>
        {error.digest ? <p className="mt-4 text-[11px] text-muted/60">Ref: {error.digest}</p> : null}
      </div>
    </div>
  );
}
