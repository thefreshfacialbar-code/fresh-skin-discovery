"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Experience = { experienceId: string; assigned: boolean; enabled: boolean };

export default function ProductRecommendationActivation({ productId, enabled, experiences }: {
  productId: string;
  enabled: boolean;
  experiences: Experience[];
}) {
  const router = useRouter();
  const [globalEnabled, setGlobalEnabled] = useState(enabled);
  const [items, setItems] = useState(experiences);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update(next: boolean, experienceId?: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/fresh-desk/product-recommendation-activation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, enabled: next, ...(experienceId ? { experienceId } : {}) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? "Unable to update activation");
      if (experienceId) setItems((old) => old.map((item) => item.experienceId === experienceId ? { ...item, enabled: next } : item));
      else setGlobalEnabled(next);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update activation");
    } finally { setBusy(false); }
  }

  return <section className="mt-6 rounded-xl border border-[#E5DFD8] bg-white p-5">
    <h3 className="text-lg font-semibold">Skin Discovery Activation</h3>
    <p className="mt-2 text-sm text-[#77716D]">Operational switches take effect immediately. They do not change Shopify listings, approved settings, or draft review status.</p>
    <label className="mt-4 flex items-center gap-3 text-sm font-medium">
      <input type="checkbox" disabled={busy} checked={globalEnabled} onChange={(event) => void update(event.target.checked)} />
      Product enabled for recommendations (all experiences)
    </label>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map((item) => <label key={item.experienceId} className="rounded-lg border p-3 text-sm">
        <span className="flex items-center gap-2">
          <input type="checkbox" checked={item.enabled} disabled={busy || !item.assigned}
            onChange={(event) => void update(event.target.checked, item.experienceId)} />
          {item.experienceId === "gentlemens-corner" ? "Gentlemen's Corner" : "Fresh Facial Bar & Lash Lounge"}
        </span>
        <span className="mt-1 block text-xs text-[#77716D]">{!item.assigned ? "Assign and publish this experience first" : !globalEnabled ? "Globally disabled" : item.enabled ? "Enabled" : "Disabled"}</span>
      </label>)}
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
}
