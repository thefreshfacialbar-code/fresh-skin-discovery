
import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";


export default async function SkinDiscoveryActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    experience?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { experience, from, to } = await searchParams;

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  const isValidDate = (value: string | undefined) => {
    if (!value || !datePattern.test(value)) return false;

    const parsed = new Date(`${value}T12:00:00Z`);

    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  };

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const thirtyDaysAgo = new Date(`${today}T12:00:00Z`);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

  const fromDate = isValidDate(from)
    ? from!
    : thirtyDaysAgo.toISOString().slice(0, 10);

  const toDate = isValidDate(to) ? to! : today;

  const easternMidnightUtc = (date: string) => {
    const utcNoon = new Date(`${date}T12:00:00Z`);

    const easternHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(utcNoon)
    );

    const offsetHours = 12 - easternHour;

    return new Date(
      Date.parse(`${date}T00:00:00Z`) +
        offsetHours * 60 * 60 * 1000
    ).toISOString();
  };

  const dayAfterTo = new Date(`${toDate}T12:00:00Z`);
  dayAfterTo.setUTCDate(dayAfterTo.getUTCDate() + 1);

  const startTimestamp = easternMidnightUtc(fromDate);
  const endTimestamp = easternMidnightUtc(
    dayAfterTo.toISOString().slice(0, 10)
  );

  const employeeSession = await requireFreshDeskOwnerAdmin();

  if (!employeeSession) {
    redirect("/fresh-desk");
  }

  
  const validExperiences = [
    "fresh-facial-bar-lash-lounge",
    "gentlemens-corner",
  ];

  let query = supabaseAdmin
    .from("consultations")
    .select(`
      id,
      submission_id,
      customer_id,
      experience_id,
      status,
      completed_at,
      professional_review_status,
      professional_reviewed_at,
      customers (
        id,
        first_name,
        last_name,
        email
      ),
      skin_plans (
        id,
        version,
        primary_journey,
        secondary_journey
      )
    `)
    .eq("business_id", employeeSession.employee.business_id)
    .not("submission_id", "is", null);

  if (experience && validExperiences.includes(experience)) {
    query = query.eq("experience_id", experience);
  }

  query = query
    .gte("completed_at", startTimestamp)
    .lt("completed_at", endTimestamp);

  const { data: consultations, error } = await query.order(
    "completed_at",
    { ascending: false }
  );


  if (error) {
    console.error(
      "Unable to load Skin Discovery activity:",
      error.message
    );
  }

  const activity = consultations ?? [];

  const freshFacialBarCount = activity.filter(
    (consultation) =>
      consultation.experience_id ===
      "fresh-facial-bar-lash-lounge"
  ).length;

  const gentlemensCornerCount = activity.filter(
    (consultation) =>
      consultation.experience_id === "gentlemens-corner"
  ).length;

  const reviewedCount = activity.filter(
    (consultation) =>
      consultation.professional_review_status === "reviewed"
  ).length;

  return (
    <main className="min-h-screen bg-[#FAF7F1] px-6 py-10 text-[#302C2A]">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/fresh-desk/reports"
          className="text-sm font-semibold text-[#908A9B] hover:text-[#302C2A]"
        >
          ← Reports
        </Link>

        <h1
          className="mt-6 text-4xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Skin Discovery Activity
        </h1>

        <p className="mt-3 text-[#5A5553]">
          Monitor saved Skin Discoveries and professional reviews.
        </p>

<form
  key={`${experience ?? ""}-${fromDate}-${toDate}`}
  action="/fresh-desk/reports/skin-discovery"
  method="GET"
  className="mt-6 flex flex-wrap items-end gap-3"
>
  <div>
    <label
      htmlFor="experience"
      className="mb-2 block text-sm font-semibold text-[#5A5553]"
    >
      Experience
    </label>

    <select
      id="experience"
      name="experience"
      defaultValue={
        experience === "fresh-facial-bar-lash-lounge" ||
        experience === "gentlemens-corner"
          ? experience
          : ""
      }
      className="rounded-xl border border-[#DAD6DB] bg-[#FFFDFC] px-4 py-3 text-sm"
    >
      <option value="">All Experiences</option>
      <option value="fresh-facial-bar-lash-lounge">
        Fresh Facial Bar
      </option>
      <option value="gentlemens-corner">
        Gentlemen&apos;s Corner
      </option>
    </select>
  </div>

<div>
  <label
    htmlFor="from"
    className="mb-2 block text-sm font-semibold text-[#5A5553]"
  >
    From Date
  </label>

  <input
    id="from"
    name="from"
    type="date"
    defaultValue={fromDate}
    max={toDate}
    className="rounded-xl border border-[#DAD6DB] bg-[#FFFDFC] px-4 py-3 text-sm"
  />
</div>

<div>
  <label
    htmlFor="to"
    className="mb-2 block text-sm font-semibold text-[#5A5553]"
  >
    To Date
  </label>

  <input
    id="to"
    name="to"
    type="date"
    defaultValue={toDate}
    min={fromDate}
    className="rounded-xl border border-[#DAD6DB] bg-[#FFFDFC] px-4 py-3 text-sm"
  />
</div>

  <button
    type="submit"
    className="rounded-xl bg-[#6D617C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#554A63]"
  >
    Apply Filter
  </button>

<Link
  href="/fresh-desk/reports/skin-discovery"
  className="rounded-xl border border-[#DAD6DB] bg-[#FFFDFC] px-5 py-3 text-sm font-semibold text-[#5A5553] transition hover:bg-[#F4F0EA]"
>
  Reset Filters
</Link>
</form>

        {error ? (
          <p className="mt-8 text-sm text-red-700">
            Unable to load Skin Discovery activity.
          </p>
                ) : (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total Discoveries",
                value: activity.length,
              },
              {
                label: "Fresh Facial Bar",
                value: freshFacialBarCount,
              },
              {
                label: "Gentlemen's Corner",
                value: gentlemensCornerCount,
              },
              {
                label: "Reviews Completed",
                value: reviewedCount,
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#908A9B]">
                  {metric.label}
                </p>

                <p className="mt-3 text-3xl font-semibold">
                  {metric.value}
                </p>
              </div>
            ))}
          </section>
          
          <section className="mt-8 overflow-hidden rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC]">
            <div className="border-b border-[#E6E0E3] p-6">
              <h2
                className="text-2xl"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                Discovery Submissions
              </h2>

              <p className="mt-2 text-sm text-[#5A5553]">
                Individual Skin Discovery submissions, newest first.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F4F0EA] text-[#5A5553]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Submitted</th>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Experience</th>
                    <th className="px-5 py-4 font-semibold">Primary Journey</th>
                    <th className="px-5 py-4 font-semibold">Secondary Journey</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">
                      Professional Review
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E6E0E3]">
                  {activity.map((consultation) => (
                    <tr key={consultation.id}>
                      <td className="whitespace-nowrap px-5 py-4">
                        {consultation.completed_at
                          ? new Date(
                              consultation.completed_at
                            ).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone: "America/New_York",
                            })
                          : "Date unavailable"}
                      </td>

<td className="px-5 py-4">
  {(() => {
    const customer = Array.isArray(consultation.customers)
      ? consultation.customers[0]
      : consultation.customers;

    if (!customer) {
      return (
        <span className="text-[#908A9B]">
          Customer unavailable
        </span>
      );
    }

    const customerName = [
      customer.first_name,
      customer.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div>
        <Link
  href={`/fresh-desk/customers/${consultation.customer_id}/consultations/${consultation.id}`}
  className="font-semibold text-[#6D617C] underline-offset-4 hover:underline"
>
  {customerName || "Unnamed customer"}
</Link>
        <p className="mt-1 text-xs text-[#908A9B]">
          {customer.email || "No email"}
        </p>
      </div>
    );
  })()}
</td>

                      <td className="px-5 py-4">
                        {consultation.experience_id ===
                        "gentlemens-corner"
                          ? "Gentlemen's Corner"
                          : consultation.experience_id ===
                              "fresh-facial-bar-lash-lounge"
                            ? "Fresh Facial Bar"
                            : "Unknown experience"}
                      </td>

<td className="px-5 py-4">
  {(() => {
    const plans = consultation.skin_plans ?? [];

    const latestPlan = [...plans].sort(
      (a, b) => b.version - a.version
    )[0];

    return latestPlan?.primary_journey || "—";
  })()}
</td>

<td className="px-5 py-4">
  {(() => {
    const plans = consultation.skin_plans ?? [];

    const latestPlan = [...plans].sort(
      (a, b) => b.version - a.version
    )[0];

    return latestPlan?.secondary_journey || "—";
  })()}
</td>

                      <td className="px-5 py-4 capitalize">
                        {consultation.status ?? "Unknown"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            consultation.professional_review_status ===
                            "reviewed"
                              ? "font-semibold text-green-700"
                              : "text-[#908A9B]"
                          }
                        >
                          {consultation.professional_review_status ===
                          "reviewed"
                            ? "Reviewed"
                            : "Not Reviewed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {activity.length === 0 && (
              <p className="p-6 text-sm text-[#5A5553]">
                No Skin Discovery submissions found.
              </p>
            )}
                    </section>
          </>
        )}
      </div>
    </main>
  );
}
