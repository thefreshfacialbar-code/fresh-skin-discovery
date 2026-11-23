"use client";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

export default function FreshDeskLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/fresh-desk/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-[#DAD6DB] bg-[#FFFDFC] px-4 py-2 text-sm font-semibold text-[#5A5553] transition hover:bg-[#F4F0EA]"
    >
      Sign Out
    </button>
  );
}