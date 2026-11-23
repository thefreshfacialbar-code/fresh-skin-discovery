
import crypto from "node:crypto";

const secret = process.env.SHOPIFY_CLIENT_SECRET;
const shop = process.env.SHOPIFY_STORE_DOMAIN;

if (!secret || !shop) {
  throw new Error("Missing Shopify credentials.");
}

// Simulated webhook payload. No real order is involved.
const payload = JSON.stringify({
  id: 0,
  test: true,
});

const signature = crypto
  .createHmac("sha256", secret)
  .update(payload, "utf8")
  .digest("base64");

const response = await fetch(
  "https://freshdesk.thefreshfacialbar.com/api/shopify-webhooks/orders-paid",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Hmac-Sha256": signature,
     "X-Shopify-Topic": "orders/paid",
      "X-Shopify-Shop-Domain": shop,
    },
    body: payload,
  }
);

console.log("HTTP status:", response.status);
console.log("Response:", await response.text());
