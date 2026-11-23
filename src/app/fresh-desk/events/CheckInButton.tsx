"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type CheckInButtonProps = {
  registrationId: string;
};

export default function CheckInButton({
  registrationId,
}: CheckInButtonProps) {
    const router = useRouter();
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    async function handleCheckIn() {
  setIsCheckingIn(true);
  setError(null);

  try {
    const response = await fetch("/api/fresh-desk/events/check-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registrationId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Could not check in guest.");
    }

    router.refresh();
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Could not check in guest."
    );
  } finally {
    setIsCheckingIn(false);
  }
}
  return (
  <div className="flex flex-col items-start gap-2 sm:items-end">
    <button
      type="button"
      onClick={handleCheckIn}
      disabled={isCheckingIn}
      className="rounded-full bg-[#302C2A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4A4542] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isCheckingIn ? "Checking In..." : "Check In"}
    </button>

    {error ? (
      <p className="max-w-64 text-xs text-red-700">
        {error}
      </p>
    ) : null}
  </div>
);
}