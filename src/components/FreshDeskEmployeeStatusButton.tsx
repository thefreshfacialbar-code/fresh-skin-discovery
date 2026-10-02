"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FreshDeskEmployeeStatusButtonProps = {
  employeeId: string;
  active: boolean;
};

export default function FreshDeskEmployeeStatusButton({
  employeeId,
  active,
}: FreshDeskEmployeeStatusButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStatusChange() {
  
  setError("");
  setLoading(true);

  try {
    const response = await fetch(
      "/api/fresh-desk/employees/status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          active: !active,
        }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      setError(
        data?.error ?? "Employee access could not be updated."
      );
      return;
    }

    router.refresh();
  } catch {
    setError("Employee access could not be updated.");
  } finally {
    setLoading(false);
  }
}
    

    

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={loading}
        onClick={handleStatusChange}
        className="rounded-full border border-[#DAD6DB] bg-[#FFFDFC] px-4 py-2 text-sm font-semibold text-[#5A5553] transition hover:bg-[#F4F0EA] disabled:opacity-60"
      >
        {loading
          ? "Updating..."
          : active
            ? "Deactivate Access"
            : "Reactivate Access"}
      </button>

      {error ? (
        <p className="mt-2 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}