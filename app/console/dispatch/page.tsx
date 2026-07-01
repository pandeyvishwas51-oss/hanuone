import { and, desc, eq, inArray } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { PageHeader } from "@/components/portal/ui";
import DispatchList from "@/components/console/DispatchList";

export const dynamic = "force-dynamic";

export default async function ConsoleDispatch() {
  let requested: typeof schema.serviceVisits.$inferSelect[] = [];
  let assigned: typeof schema.serviceVisits.$inferSelect[] = [];
  if (HAS_DB) {
    [requested, assigned] = await Promise.all([
      db().select().from(schema.serviceVisits).where(eq(schema.serviceVisits.status, "requested")).orderBy(desc(schema.serviceVisits.createdAt)).limit(50),
      db().select().from(schema.serviceVisits).where(and(inArray(schema.serviceVisits.status, ["assigned", "on_the_way", "arrived", "in_progress"]))).orderBy(desc(schema.serviceVisits.updatedAt)).limit(20)
    ]);
  }

  return (
    <div>
      <PageHeader title="Dispatch" subtitle="Match home-visit requests to verified providers — gender-safe auto-assignment." />
      <DispatchList requested={JSON.parse(JSON.stringify(requested))} assigned={JSON.parse(JSON.stringify(assigned))} />
    </div>
  );
}
