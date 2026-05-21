"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-red-50 hover:text-red-600">
      <LogOut size={16} /> Logout
    </button>
  );
}
