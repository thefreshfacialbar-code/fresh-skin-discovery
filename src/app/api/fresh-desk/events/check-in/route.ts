import "server-only";

import { requireFreshDeskEmployee } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();
  const registrationId = body.registrationId as string | undefined;
  const employeeSession = await requireFreshDeskEmployee();

  if (!employeeSession) {
    return Response.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }
if (!registrationId) {
  return Response.json(
    {
      success: false,
      error: "Registration ID is required.",
    },
    { status: 400 }
  );
}
const { data: registration, error: registrationError } =
  await supabaseAdmin
    .from("event_registrations")
    .select(`
  id,
  event_id,
  current_ticket_quantity,
  checked_in_quantity,
  registration_status
`)
    .eq("id", registrationId)
    .maybeSingle();

if (registrationError) {
  return Response.json(
    {
      success: false,
      error: registrationError.message,
    },
    { status: 500 }
  );
}

if (!registration) {
  return Response.json(
    {
      success: false,
      error: "Registration not found.",
    },
    { status: 404 }
  );
}
const { data: event, error: eventError } = await supabaseAdmin
  .from("events")
  .select("id, business_id")
  .eq("id", registration.event_id)
  .maybeSingle();

if (eventError) {
  return Response.json(
    {
      success: false,
      error: eventError.message,
    },
    { status: 500 }
  );
}

if (!event) {
  return Response.json(
    {
      success: false,
      error: "Event not found.",
    },
    { status: 404 }
  );
}

if (event.business_id !== employeeSession.employee.business_id) {
  return Response.json(
    {
      success: false,
      error: "Registration does not belong to your business.",
    },
    { status: 403 }
  );
}
if (registration.registration_status !== "registered") {
  return Response.json(
    {
      success: false,
      error: "This registration is not active.",
    },
    { status: 400 }
  );
}

if (
  registration.checked_in_quantity >=
  registration.current_ticket_quantity
) {
  return Response.json(
    {
      success: false,
      error: "All active tickets for this registration are already checked in.",
    },
    { status: 400 }
  );
}
const newCheckedInQuantity =
  registration.checked_in_quantity + 1;

const { data: updatedRegistration, error: updateError } =
  await supabaseAdmin
    .from("event_registrations")
    .update({
      checked_in_quantity: newCheckedInQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", registration.id)
    .select(`
      id,
      current_ticket_quantity,
      checked_in_quantity
    `)
    .single();

if (updateError) {
  return Response.json(
    {
      success: false,
      error: updateError.message,
    },
    { status: 500 }
  );
}
return Response.json({
  success: true,
  registration: updatedRegistration,
});
}