import { redirect } from "next/navigation";

// The admin home now lives in the standalone Console portal.
export default function AdminRedirect() {
  redirect("/console");
}
