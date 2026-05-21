"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-red-50 hover:text-red-600"
    >
      <LogOut size={16} /> Logout
    </button>
  );
}
