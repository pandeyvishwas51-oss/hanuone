"use client";

import { useEffect, useState } from "react";

// Jitsi Meet embed. Join unlocks 5 minutes before the scheduled time.
// Self-host later by setting NEXT_PUBLIC_JITSI_DOMAIN to your own deployment.
const DOMAIN = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";

export default function VideoRoom({
  room,
  displayName,
  scheduledAtISO
}: {
  room: string;
  displayName: string;
  scheduledAtISO: string | null;
}) {
  const [joined, setJoined] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const scheduled = scheduledAtISO ? new Date(scheduledAtISO).getTime() : null;
  const unlockAt = scheduled ? scheduled - 5 * 60 * 1000 : null;
  const locked = unlockAt != null && now < unlockAt;

  if (joined) {
    const url = `https://${DOMAIN}/${encodeURIComponent(room)}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.prejoinPageEnabled=false`;
    return (
      <div className="overflow-hidden rounded-xl border border-primary/10">
        <iframe
          title="Video consultation"
          src={url}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="h-[70vh] w-full border-0"
        />
      </div>
    );
  }

  return (
    <div className="card p-8 text-center">
      <h2 className="h3">Video consultation</h2>
      {locked ? (
        <p className="mt-2 text-sm text-muted">
          The room opens 5 minutes before your scheduled time. Please check back shortly.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Make sure you're in a quiet, well-lit place. Allow camera and microphone access when prompted.
          </p>
          <button className="btn-primary mt-5" onClick={() => setJoined(true)}>
            Join video consultation
          </button>
        </>
      )}
    </div>
  );
}
