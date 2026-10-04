import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";
import CheckInButton from "./CheckInButton";
import Link from "next/link";

import { requireFreshDeskEmployee } from "@/lib/requireFreshDeskEmployee";

export default async function FreshDeskEventsPage() {
  const employeeSession = await requireFreshDeskEmployee();

  if (!employeeSession) {
    redirect("/fresh-desk/login");
  }
const { data: events, error: eventsError } = await supabaseAdmin
  .from("events")
  .select(`
  id,
  name,
  event_date,
  start_time,
  end_time,
  location_name,
  address,
  capacity,
  refund_deadline,
  active,
  event_registrations (
  id,
  customer_id,
  purchaser_first_name,
  purchaser_last_name,
  purchaser_email,
  purchaser_phone,
  ticket_quantity,
  current_ticket_quantity,
  registration_status,
  checked_in_quantity
)
`)
  .eq("business_id", employeeSession.employee.business_id)
  .order("event_date", { ascending: true });
  return (
    <main className="min-h-screen bg-[#FAF7F1] px-6 py-10 text-[#302C2A]">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/fresh-desk"
          className="inline-flex items-center text-sm font-semibold text-[#5A5553] transition hover:text-[#2F2A28]"
        >
          ← Back to Fresh Desk
        </Link>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.22em] text-[#908A9B]">
          Fresh Facial Bar
        </p>

        <h1
          className="mt-3 text-4xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Events
        </h1>

        <p className="mt-3 text-[#5A5553]">
          Manage event registrations and attendance.
        </p>
        {eventsError ? (
  <p className="mt-10 text-red-700">
    Unable to load events.
  </p>
) : events && events.length > 0 ? (
  <div className="mt-10 space-y-5">
    {events.map((event) => {
  const ticketsSold = (event.event_registrations ?? [])
    .filter(
      (registration) =>
        registration.registration_status === "registered"
    )
    .reduce(
      (total, registration) =>
        total + registration.current_ticket_quantity,
      0
    );

  const spotsRemaining =
    event.capacity !== null
      ? Math.max(event.capacity - ticketsSold, 0)
      : null;
const formattedEventDate = new Date(
  `${event.event_date}T12:00:00`
).toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const formatTime = (time: string | null) => {
  if (!time) {
    return null;
  }

  const [hourString, minute] = time.split(":");
  const hour = Number(hourString);

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
};

const formattedStartTime = formatTime(event.start_time);
const formattedEndTime = formatTime(event.end_time);
  return (
      <div
        key={event.id}
        className="rounded-[1.75rem] border border-[#DAD6DB] bg-[#FFFDFC] p-6 shadow-[0_12px_30px_rgba(61,52,48,0.04)]"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#908A9B]">
          {event.active ? "Upcoming Event" : "Inactive Event"}
        </p>

        <h2
          className="mt-3 text-2xl text-[#302C2A]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {event.name}
        </h2>

        <div className="mt-5 space-y-2 text-sm text-[#5A5553]">
          <p>Date: {formattedEventDate}</p>

          <p>
  Time: {formattedStartTime ?? "—"}
  {formattedEndTime ? ` – ${formattedEndTime}` : ""}
</p>

          <p>
            Location: {event.location_name ?? "—"}
          </p>

          {event.address ? <p>{event.address}</p> : null}
{event.refund_deadline ? (
  <p>
    Refund Deadline:{" "}
    {new Date(
      `${event.refund_deadline}T12:00:00`
    ).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}
  </p>
) : null}
          
           <div className="mt-6 grid gap-3 sm:grid-cols-3">
  <div className="rounded-2xl bg-[#F4F0EA] p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
      Capacity
    </p>
    <p className="mt-2 text-2xl font-semibold text-[#302C2A]">
      {event.capacity ?? "—"}
    </p>
  </div>

  <div className="rounded-2xl bg-[#F4F0EA] p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
      Tickets Sold
    </p>
    <p className="mt-2 text-2xl font-semibold text-[#302C2A]">
      {ticketsSold}
    </p>
  </div>

  <div className="rounded-2xl bg-[#F4F0EA] p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
      Spots Remaining
    </p>
    <p className="mt-2 text-2xl font-semibold text-[#302C2A]">
      {spotsRemaining ?? "—"}
    </p>
  </div>
</div>
          
        </div>
        <div className="mt-8 border-t border-[#E5E1DD] pt-6">
  <div className="flex items-center justify-between gap-4">
    <h3
      className="text-xl text-[#302C2A]"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      Registrations
    </h3>

    <p className="text-sm font-semibold text-[#908A9B]">
      {event.event_registrations?.length ?? 0}{" "}
      {(event.event_registrations?.length ?? 0) === 1
        ? "order"
        : "orders"}
    </p>
  </div>

  {(event.event_registrations?.length ?? 0) === 0 ? (
    <p className="mt-4 text-sm text-[#5A5553]">
      No registrations yet.
    </p>
  ) : null}
  {(event.event_registrations?.length ?? 0) > 0 ? (
  <div className="mt-5 space-y-3">
    {event.event_registrations.map((registration) => {
      const purchaserName =
        [
          registration.purchaser_first_name,
          registration.purchaser_last_name,
        ]
          .filter(Boolean)
          .join(" ") || "Guest";

      return (
        <div
          key={registration.id}
          className="rounded-2xl border border-[#E5E1DD] bg-[#FAF7F1] p-4"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-[#302C2A]">
                {purchaserName}
              </p>

              {registration.purchaser_email ? (
                <p className="mt-1 text-sm text-[#5A5553]">
                  {registration.purchaser_email}
                </p>
              ) : null}
            </div>

            <div className="text-sm text-[#5A5553] sm:text-right">
              <p>
                Tickets: {registration.current_ticket_quantity}
              </p>

              <p className="mt-1">
                Checked In: {registration.checked_in_quantity}
              </p>
            </div>
            {registration.registration_status === "registered" &&
registration.checked_in_quantity <
  registration.current_ticket_quantity ? (
  <CheckInButton registrationId={registration.id} />
) : null}
          </div>
        </div>
      );
    })}
  </div>
) : null}
</div>
            </div>
            
    );
})}
  </div>
  
) : (
  <p className="mt-10 text-[#5A5553]">
    No events found.
  </p>
)}
      </div>
      
    </main>
  );
}