import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const bookingUrl = process.env.SKIN_DISCOVERY_BOOKING_URL?.trim();

  if (!bookingUrl || !/^https?:\/\//i.test(bookingUrl)) {
    return NextResponse.json({ error: "Booking is unavailable." }, { status: 404 });
  }

  return NextResponse.redirect(bookingUrl);
}