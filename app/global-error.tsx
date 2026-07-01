"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
          <h2 style={{ color: "#01586C" }}>Something went wrong</h2>
          <p style={{ color: "#5C6B73" }}>Please refresh the page. Our team has been notified.</p>
          <a href="/" style={{ color: "#FE7D15", fontWeight: 600 }}>Go to homepage</a>
        </div>
      </body>
    </html>
  );
}
