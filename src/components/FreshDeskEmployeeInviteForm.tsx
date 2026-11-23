"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function FreshDeskEmployeeInviteForm() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("professional");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/fresh-desk/employees/invite",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            role,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "Employee invitation could not be sent."
        );
      }

      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("professional");
      setMessage("Employee invitation sent.");

      router.refresh();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Employee invitation could not be sent."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-5"
    >
      <h2
        className="text-2xl"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        Invite Employee
      </h2>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <input
          type="text"
          required
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="First name"
          className="rounded-xl border border-[#DAD6DB] bg-white px-4 py-3"
        />

        <input
          type="text"
          required
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          placeholder="Last name"
          className="rounded-xl border border-[#DAD6DB] bg-white px-4 py-3"
        />

        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="rounded-xl border border-[#DAD6DB] bg-white px-4 py-3"
        />

        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="rounded-xl border border-[#DAD6DB] bg-white px-4 py-3"
        >
          <option value="professional">Professional</option>
          <option value="owner_admin">Owner / Admin</option>
        </select>
      </div>

      {message && (
        <p className="mt-4 text-sm font-semibold">{message}</p>
      )}

      {error && (
        <p className="mt-4 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 rounded-full bg-[#2F2A28] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Sending Invitation..." : "Send Invitation"}
      </button>
    </form>
  );
}