/**
 * Lightweight first-party analytics. Writes to analytics_events when a DB is
 * present; no-ops safely otherwise. Powers funnels, conversion and provider
 * scorecards without any third-party tracker.
 */
import { HAS_DB, db, schema } from "@/lib/db";

export type EventName =
  | "page_view"
  | "view_doctor"
  | "search"
  | "start_booking"
  | "book_success"
  | "ai_chat"
  | "ai_emergency"
  | "serviceability_check"
  | "demand_captured"
  | "lead_imported"
  | "provider_verified"
  | "provider_registered";

export interface TrackInput {
  name: EventName | string;
  userId?: string | null;
  anonId?: string | null;
  city?: string | null;
  pincode?: string | null;
  path?: string | null;
  props?: Record<string, unknown>;
}

export async function track(e: TrackInput): Promise<void> {
  if (!HAS_DB) return;
  try {
    await db().insert(schema.analyticsEvents).values({
      name: e.name,
      userId: e.userId ?? null,
      anonId: e.anonId ?? null,
      city: e.city ?? null,
      pincode: e.pincode ?? null,
      path: e.path ?? null,
      props: e.props ? JSON.stringify(e.props).slice(0, 4000) : null
    });
  } catch {
    /* analytics must never break a request */
  }
}
