"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EmployeeRole = "owner_admin" | "professional";

type Props = {
  employeeId: string;
  role: EmployeeRole;
};

export default function FreshDeskEmployeeRoleEditor({
  employeeId,
  role,
}: Props) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<EmployeeRole>(role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveRole() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        "/api/fresh-desk/employees/role",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId,
            role: selectedRole,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ?? "Employee permissions could not be updated."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Employee permissions could not be updated."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <select
        aria-label="Employee permission"
        value={selectedRole}
        onChange={(event) => setSelectedRole(event.target.value as EmployeeRole)}
        disabled={saving}
        className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm"
      >
        <option value="professional">Professional</option>
        <option value="owner_admin">Owner / Admin</option>
      </select>

      <button
        type="button"
        onClick={saveRole}
        disabled={saving || selectedRole === role}
        className="rounded-full bg-gray-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Permission"}
      </button>

      {error ? (
        <p className="w-full text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
