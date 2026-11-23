import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const FRESH_BUSINESS_ID = "fe7198ae-61f5-4e7b-892f-138e41d713d4";

export async function GET() {
    try {
        const { data: orders, error } = await supabaseAdmin
            .from("boulevard_orders")
            .select("boulevard_order_id,boulevard_order_number,completed_at")
            .eq("business_id", FRESH_BUSINESS_ID)
            .order("completed_at", { ascending: false })
            .limit(25);

        if (error) {
            throw new Error(
                `Could not load Boulevard orders for reconciliation: ${error.message}`
            );
        }

        return Response.json({
            success: true,
            orderCount: orders?.length ?? 0,
            orders: orders ?? [],
        });
    } catch (error) {
        console.error("Boulevard reconciliation error:", error);

        return Response.json(
            {
                success: false,
                error: "Could not load Boulevard orders for reconciliation.",
            },
            { status: 500 }
        );
    }
}