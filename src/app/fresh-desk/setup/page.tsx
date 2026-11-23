"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

export default function FreshDeskSetupPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
const [checkingSession, setCheckingSession] = useState(true);

useEffect(() => {
  async function establishInvitationSession() {
    const hashParams = new URLSearchParams(
      window.location.hash.substring(1)
    );

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError(
          "This invitation is invalid or has expired. Please request a new invitation."
        );
        setCheckingSession(false);
        return;
      }

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError(
        "This invitation is invalid or has expired. Please request a new invitation."
      );
    }

    setCheckingSession(false);
  }

  establishInvitationSession();
}, []);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(
        "Your account could not be set up. Please open your invitation link again."
      );
      return;
    }

    router.replace("/fresh-desk");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#F7F4F1] px-6 py-16">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-[#DAD6DB] bg-[#FFFDFC] p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Fresh Method
          </p>

          <h1 className="mt-3 text-3xl font-semibold text-neutral-900">
            Set Up Fresh 360
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            Create a password for your employee account.
          </p>
{checkingSession ? (
  <p className="mt-8 text-sm text-neutral-600">
    Verifying your invitation...
  </p>
) : null}
          <form
  onSubmit={handleSubmit}
  className="mt-8 space-y-5"
  hidden={checkingSession}
>
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#DAD6DB] bg-white px-4 py-3 text-neutral-900 outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-neutral-800"
              >
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-[#DAD6DB] bg-white px-4 py-3 text-neutral-900 outline-none focus:border-neutral-500"
              />
            </div>

            {error ? (
              <p className="text-sm text-red-700">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-neutral-900 px-5 py-3 font-medium text-white disabled:opacity-60"
            >
              {loading ? "Setting Up Account..." : "Create Password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}