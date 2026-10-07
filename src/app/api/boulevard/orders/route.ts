import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const FRESH_BUSINESS_ID = "fe7198ae-61f5-4e7b-892f-138e41d713d4";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const rawOrder =
            typeof body.order === "string"
                ? JSON.parse(body.order)
                : body.order;

        const order = rawOrder?.results?.[0];

        if (!order?.id) {
            return Response.json(
                {
                    success: false,
                    error: "Boulevard order was missing from the payload.",
                },
                { status: 400 }
            );
        }
        const boulevardClientId = order.client?.id ?? null;

        let existingCustomerId: string | null = null;

        if (boulevardClientId) {
            const { data: identity, error: identityError } = await supabaseAdmin
                .from("customer_identities")
                .select("customer_id")
                .eq("source_system", "boulevard")
                .eq("source_customer_id", boulevardClientId)
                .maybeSingle();

            if (identityError) {
                throw new Error(
                    `Could not look up Boulevard customer identity: ${identityError.message}`
                );
            }

            existingCustomerId = identity?.customer_id ?? null;
        }
        if (!existingCustomerId && order.client?.email) {
            const normalizedEmail = order.client.email.trim().toLowerCase();

            const { data: emailMatches, error: emailMatchError } = await supabaseAdmin
                .from("customers")
                .select("id")
                .eq("business_id", FRESH_BUSINESS_ID)
                .ilike("email", normalizedEmail)
                .limit(2);

            if (emailMatchError) {
                throw new Error(
                    `Could not match Boulevard customer by email: ${emailMatchError.message}`
                );
            }

            if (emailMatches?.length === 1) {
                existingCustomerId = emailMatches[0].id;
            }
        }
        if (!existingCustomerId && order.client?.mobilePhone) {
            const normalizedPhone = order.client.mobilePhone.trim();

            const { data: phoneMatches, error: phoneMatchError } = await supabaseAdmin
                .from("customers")
                .select("id")
                .eq("business_id", FRESH_BUSINESS_ID)
                .eq("mobile_phone", normalizedPhone)
                .limit(2);

            if (phoneMatchError) {
                throw new Error(
                    `Could not match Boulevard customer by phone: ${phoneMatchError.message}`
                );
            }

            if (phoneMatches?.length === 1) {
                existingCustomerId = phoneMatches[0].id;
            }
        }
        if (!existingCustomerId && order.client) {
            const now = new Date().toISOString();

            const { data: newCustomer, error: createCustomerError } =
                await supabaseAdmin
                    .from("customers")
                    .insert({
                        business_id: FRESH_BUSINESS_ID,
                        first_name: order.client.firstName ?? null,
                        last_name: order.client.lastName ?? null,
                        email: order.client.email?.trim().toLowerCase() ?? null,
                        mobile_phone: order.client.mobilePhone?.trim() ?? null,
                        first_interaction_at: now,
                        last_interaction_at: now,
                    })
                    .select("id")
                    .single();

            if (createCustomerError) {
                throw new Error(
                    `Could not create Boulevard customer: ${createCustomerError.message}`
                );
            }

            existingCustomerId = newCustomer.id;
        }
        if (boulevardClientId && existingCustomerId) {
            const { error: identityUpsertError } = await supabaseAdmin
                .from("customer_identities")
                .upsert(
                    {
                        customer_id: existingCustomerId,
                        source_system: "boulevard",
                        source_customer_id: boulevardClientId,
                        source_email: order.client?.email?.trim().toLowerCase() ?? null,
                        source_phone: order.client?.mobilePhone?.trim() ?? null,
                        match_status: "confirmed",
                        match_method: "boulevard_order",
                        match_confidence: 1,
                    },
                    {
                        onConflict: "source_system,source_customer_id",
                    }
                );

            if (identityUpsertError) {
                throw new Error(
                    `Could not save Boulevard customer identity: ${identityUpsertError.message}`
                );
            }
        }
        const { data: savedOrder, error: orderUpsertError } = await supabaseAdmin
            .from("boulevard_orders")
            .upsert(
                {
                    business_id: FRESH_BUSINESS_ID,
                    customer_id: existingCustomerId,
                    boulevard_order_id: order.id,
                    boulevard_order_number: order.number ?? null,

                    boulevard_client_id: boulevardClientId,
                    customer_email: order.client?.email?.trim().toLowerCase() ?? null,
                    customer_first_name: order.client?.firstName ?? null,
                    customer_last_name: order.client?.lastName ?? null,
                    customer_phone: order.client?.mobilePhone?.trim() ?? null,

                    location_id: order.location?.id ?? null,
                    location_name: order.location?.name ?? null,

                    closed_by_id: order.closedBy?.id ?? null,
                    closed_by_name: order.closedBy?.name ?? null,

                    order_note: order.note ?? null,
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: "business_id,boulevard_order_id",
                }
            )
            .select("id")
            .single();

        if (orderUpsertError) {
            throw new Error(
                `Could not save Boulevard order: ${orderUpsertError.message}`
            );
        }
        const orderItems = (order.lineGroups ?? []).flatMap(
            (lineGroup: {
                id?: string;
                lines?: Array<{
                    id?: string;
                    name?: string;
                    quantity?: number;
                    initialPrice?: number;
                    currentPrice?: number;
                    initialDiscountAmount?: number;
                    currentDiscountAmount?: number;
                    initialSubtotal?: number;
                    currentSubtotal?: number;
                    discounts?: Array<{
                        description?: string;
                    }>;
                }>;
            }) =>
                (lineGroup.lines ?? [])
                    .filter((line) => line.id && line.name)
                    .map((line) => ({
                        boulevard_order_id: savedOrder.id,
                        boulevard_line_id: line.id!,
                        boulevard_line_group_id: lineGroup.id ?? null,

                        item_type: line.id!.startsWith("s_") ? "service" : "product",

                        item_name: line.name!,
                        quantity: line.quantity ?? 1,

                        initial_price: line.initialPrice ?? null,
                        current_price: line.currentPrice ?? null,

                        initial_discount_amount: line.initialDiscountAmount ?? null,
                        current_discount_amount: line.currentDiscountAmount ?? null,

                        initial_subtotal: line.initialSubtotal ?? null,
                        current_subtotal: line.currentSubtotal ?? null,

                        discount_description: line.discounts?.[0]?.description ?? null,

                        updated_at: new Date().toISOString(),
                    }))
        );
        if (orderItems.length > 0) {
            const { error: orderItemsUpsertError } = await supabaseAdmin
                .from("boulevard_order_items")
                .upsert(orderItems, {
                    onConflict: "boulevard_order_id,boulevard_line_id",
                });

            if (orderItemsUpsertError) {
                throw new Error(
                    `Could not save Boulevard order items: ${orderItemsUpsertError.message}`
                );
            }
        }
                const refunds = (order.refunds ?? [])
            .filter((refund: { id?: string }) => refund.id)
            .map(
                (refund: {
                    id?: string;
                    number?: string;
                    reason?: string;
                    reasonText?: string;
                    status?: string;
                    summary?: {
                        amount?: number;
                        tax?: number;
                        total?: number;
                    };
                    closedBy?: {
                        id?: string;
                        name?: string;
                    };
                }) => ({
                    boulevard_order_id: savedOrder.id,
                    boulevard_refund_id: refund.id!,
                    boulevard_refund_number: refund.number ?? null,
                    refund_reason: refund.reason ?? null,
                    refund_reason_text: refund.reasonText ?? null,
                    refund_status: refund.status ?? null,
                    amount: refund.summary?.amount ?? null,
                    tax: refund.summary?.tax ?? null,
                    total: refund.summary?.total ?? null,
                    closed_by_id: refund.closedBy?.id ?? null,
                    closed_by_name: refund.closedBy?.name ?? null,
                    updated_at: new Date().toISOString(),
                })
            );

        if (refunds.length > 0) {
            const { error: refundsUpsertError } = await supabaseAdmin
                .from("boulevard_refunds")
                .upsert(refunds, {
                    onConflict: "boulevard_refund_id",
                });

            if (refundsUpsertError) {
                throw new Error(
                    `Could not save Boulevard refunds: ${refundsUpsertError.message}`
                );
            }
        }
        return Response.json({
            success: true,
            received: true,
            boulevardOrderId: order.id,
            businessId: FRESH_BUSINESS_ID,
            existingCustomerId,
            savedOrderId: savedOrder.id,
            itemCount: orderItems.length,
            refundCount: refunds.length,
        });
    } catch (error) {
  console.error("Boulevard order webhook error:", error);

  const message =
    error instanceof Error ? error.message : "Unknown Boulevard import error.";

  return Response.json(
    {
      success: false,
      error: message,
    },
    { status: 400 }
  );
}
}