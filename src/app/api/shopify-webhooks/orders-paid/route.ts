import "server-only";

import crypto from "crypto";

function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string | null
): boolean {
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientSecret || !hmacHeader) {
    return false;
  }

  const calculatedHmac = crypto
    .createHmac("sha256", clientSecret)
    .update(rawBody, "utf8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHmac, "utf8"),
      Buffer.from(hmacHeader, "utf8")
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const hmacHeader = request.headers.get(
    "x-shopify-hmac-sha256"
  );

  if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
    return Response.json(
      {
        success: false,
        error: "Invalid Shopify webhook signature.",
      },
      { status: 401 }
    );
  }

  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
const allowedShopDomain = "cwmyhm-si.myshopify.com";

if (shopDomain?.toLowerCase() !== allowedShopDomain) {
  return Response.json(
    {
      success: false,
      error: "Unauthorized Shopify store.",
    },
    { status: 403 }
  );
}
  console.log("Verified Shopify webhook:", {
    topic,
    shopDomain,
  });
if (topic !== "orders/paid") {
  return Response.json(
    {
      success: false,
      error: "Unsupported Shopify webhook topic.",
    },
    { status: 400 }
  );
}

const syncSecret = process.env.SHOPIFY_SYNC_SECRET;

if (!syncSecret) {
  return Response.json(
    {
      success: false,
      error: "Shopify sync secret is not configured.",
    },
    { status: 500 }
  );
}

try {
  const syncUrl = new URL(
    "/api/shopify-orders-sync",
    request.url
  );

  const syncResponse = await fetch(syncUrl, {
    method: "POST",
    headers: {
      "x-shopify-sync-secret": syncSecret,
    },
  });

  if (!syncResponse.ok) {
    throw new Error(
      `Shopify order sync failed: ${syncResponse.status}`
    );
  }
} catch (error) {
  console.error("Shopify webhook sync error:", error);

  return Response.json(
    {
      success: false,
      error: "Could not synchronize Shopify orders.",
    },
    { status: 500 }
  );
}
  return Response.json({
    success: true,
    received: true,
  });
}