import {
  getShopifyOrders,
  getShopifyProducts,
} from "@/lib/shopifyAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
function getMetafieldValue(
  metafields: Array<{
    namespace: string;
    key: string;
    value: string;
  }>,
  key: string
): string | null {
  return (
    metafields.find(
      (metafield) =>
        metafield.namespace === "custom" &&
        metafield.key === key
    )?.value ?? null
  );
}
function convertEventTimeTo24Hour(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  const match = value
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = match[2];
  const period = match[3].toUpperCase();

  if (period === "AM" && hour === 12) {
    hour = 0;
  }

  if (period === "PM" && hour !== 12) {
    hour += 12;
  }

  return `${String(hour).padStart(2, "0")}:${minute}:00`;
}
export async function POST(request: Request) {
  const syncSecret = process.env.SHOPIFY_SYNC_SECRET;
  const providedSecret = request.headers.get("x-shopify-sync-secret");

  if (!syncSecret || providedSecret !== syncSecret) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
const { data: business, error: businessError } = await supabaseAdmin
  .from("businesses")
  .select("id")
  .eq("name", "Fresh Facial Bar")
  .single();

if (businessError || !business) {
  return Response.json(
    {
      success: false,
      error: "Could not find Fresh Facial Bar business",
      details: businessError?.message ?? null,
    },
    { status: 500 }
  );
}
  try {
    const orders = await getShopifyOrders();
    const products = await getShopifyProducts();

const eventProducts = products
  .filter((product) =>
    product.variants.nodes.some((variant) =>
      variant.sku?.startsWith("EVENT-")
    )
  )
  .map((product) => ({
    id: product.id,
    title: product.title,
    variants: product.variants.nodes,
    metafields: product.metafields.nodes,
  }));
  for (const product of products) {
  const eventVariant = product.variants.nodes.find((variant) =>
    variant.sku?.startsWith("EVENT-")
  );

  if (!eventVariant?.sku) {
    continue;
  }

  const eventName = getMetafieldValue(
    product.metafields.nodes,
    "event_name"
  );

  const eventDate = getMetafieldValue(
    product.metafields.nodes,
    "event_date"
  );

  const eventCapacity = getMetafieldValue(
    product.metafields.nodes,
    "event_capacity"
  );

  if (!eventName || !eventDate) {
    throw new Error(
      `Event product ${product.title} is missing required event metadata`
    );
  }

  const { error: eventError } = await supabaseAdmin
    .from("events")
    .upsert(
      {
        business_id: business.id,

        shopify_product_id: product.id,
        shopify_variant_id: eventVariant.id,

        sku: eventVariant.sku,

        name: eventName,
event_date: eventDate,

start_time: convertEventTimeTo24Hour(
  getMetafieldValue(
    product.metafields.nodes,
    "event_start_time"
  )
),

end_time: convertEventTimeTo24Hour(
  getMetafieldValue(
    product.metafields.nodes,
    "event_end_time"
  )
),

location_name: getMetafieldValue(
          product.metafields.nodes,
          "event_location"
        ),

        address: getMetafieldValue(
          product.metafields.nodes,
          "event_address"
        ),

        capacity: eventCapacity
          ? Number(eventCapacity)
          : null,

        refund_deadline: getMetafieldValue(
          product.metafields.nodes,
          "event_refund_deadline"
        ),

        active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "business_id,sku",
      }
    );

  if (eventError) {
    throw new Error(
      `Could not import Shopify event ${eventName}: ${eventError.message}`
    );
  }
}
let importedOrderCount = 0;

for (const order of orders) {
  const customerEmail =
    order.customer?.email ??
    order.email ??
    null;

  const customerPhone =
    order.customer?.phone ??
    order.phone ??
    null;
let freshDeskCustomerId: string | null = null;

if (customerEmail) {
  const { data: matchingCustomer, error: customerError } =
    await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("business_id", business.id)
      .ilike("email", customerEmail)
      .maybeSingle();

  if (customerError) {
    throw new Error(
      `Could not match Shopify customer for ${order.name}: ${customerError.message}`
    );
  }

  freshDeskCustomerId = matchingCustomer?.id ?? null;
}

if (!freshDeskCustomerId && customerPhone) {
  const { data: matchingCustomer, error: customerError } =
    await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("business_id", business.id)
      .eq("mobile_phone", customerPhone)
      .maybeSingle();

  if (customerError) {
    throw new Error(
      `Could not match Shopify customer by phone for ${order.name}: ${customerError.message}`
    );
  }

  freshDeskCustomerId = matchingCustomer?.id ?? null;
}

  const { data: importedOrder, error: orderError } = await supabaseAdmin
    .from("shopify_orders")
    .upsert(
      
      {
        business_id: business.id,
        customer_id: freshDeskCustomerId,
        shopify_order_id: order.id,
        shopify_order_number: order.name,

        customer_email: customerEmail,
        customer_first_name: order.customer?.firstName ?? null,
        customer_last_name: order.customer?.lastName ?? null,
        customer_phone: customerPhone,

        financial_status: order.displayFinancialStatus,
        fulfillment_status: order.displayFulfillmentStatus,

        subtotal: order.subtotalPriceSet?.shopMoney.amount ?? null,
        total_tax: order.totalTaxSet?.shopMoney.amount ?? null,
        total_price: order.totalPriceSet?.shopMoney.amount ?? null,
        currency:
          order.totalPriceSet?.shopMoney.currencyCode ??
          order.subtotalPriceSet?.shopMoney.currencyCode ??
          null,

        order_created_at: order.createdAt,
        order_updated_at: order.updatedAt,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "business_id,shopify_order_id",
      }
    )
.select("id")
.single();
 if (orderError || !importedOrder) {
  throw new Error(
    `Could not import Shopify order ${order.name}: ${
      orderError?.message ?? "No order record returned"
    }`
  );
}

for (const item of order.lineItems.nodes) {
  const unitPrice = Number(
    item.originalUnitPriceSet.shopMoney.amount
  );

  const totalPrice = unitPrice * item.quantity;

  const itemType =
    item.sku?.startsWith("EVENT-") ? "event" : "product";

  const { data: savedOrderItem, error: itemError } =
  await supabaseAdmin
    .from("shopify_order_items")
    .upsert(
      {
        shopify_order_id: importedOrder.id,
        shopify_line_item_id: item.id,

        shopify_product_id: item.product?.id ?? null,
        shopify_variant_id: item.variant?.id ?? null,

        sku: item.sku,
        product_name: item.name,
        variant_name: item.variant?.title ?? null,

        quantity: item.quantity,
        current_quantity: item.currentQuantity,

        unit_price: unitPrice,
        total_price: totalPrice,

        item_type: itemType,

        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "shopify_order_id,shopify_line_item_id",
      }
      )
    .select("id")
    .single();

  if (itemError) {
    throw new Error(
      `Could not import Shopify line item ${item.name}: ${itemError.message}`
    );
  }
  if (itemType === "event" && item.sku) {
  const { data: event, error: eventLookupError } =
    await supabaseAdmin
      .from("events")
      .select("id")
      .eq("business_id", business.id)
      .eq("sku", item.sku)
      .maybeSingle();

  if (eventLookupError) {
    throw new Error(
      `Could not find event for ${item.sku}: ${eventLookupError.message}`
    );
  }

  if (!event) {
    throw new Error(
      `No Fresh Desk event exists for Shopify event SKU ${item.sku}`
    );
  }

const registrationStatus =
  item.currentQuantity > 0 ? "registered" : "refunded";

const { error: registrationError } = await supabaseAdmin
  .from("event_registrations")
  .upsert(
    {
      business_id: business.id,
      event_id: event.id,
      customer_id: freshDeskCustomerId,

      shopify_order_id: importedOrder.id,
      shopify_order_item_id: savedOrderItem.id,

      purchaser_first_name:
        order.customer?.firstName ?? null,

      purchaser_last_name:
        order.customer?.lastName ?? null,

      purchaser_email: customerEmail,
      purchaser_phone: customerPhone,

      ticket_quantity: item.quantity,
      current_ticket_quantity: item.currentQuantity,

      registration_status: registrationStatus,

      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "shopify_order_item_id",
    }
  );

if (registrationError) {
  throw new Error(
    `Could not import event registration for ${item.sku}: ${registrationError.message}`
  );
}

  } // closes event block

} // closes line-item loop

importedOrderCount += 1;

} // closes order loop

return Response.json({
      success: true,
      importedOrderCount,
      orderCount: orders.length,
      sampleOrders: orders.slice(0, 3).map((order) => ({
        id: order.id,
        name: order.name,
        createdAt: order.createdAt,
        financialStatus: order.displayFinancialStatus,
        fulfillmentStatus: order.displayFulfillmentStatus,
        customer: order.customer,
        lineItems: order.lineItems.nodes.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
quantity: item.quantity,
currentQuantity: item.currentQuantity,
productId: item.product?.id ?? null,
          variantId: item.variant?.id ?? null,
        })),
      })),
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Shopify order sync error",
      },
      { status: 500 }
    );
  }
}