
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");

for (const line of env.split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2]
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

const shop = process.env.SHOPIFY_STORE_DOMAIN;
const clientId = process.env.SHOPIFY_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

if (!shop || !clientId || !clientSecret) {
  throw new Error("Missing Shopify credentials.");
}

const callbackUrl =
  "https://freshdesk.thefreshfacialbar.com/api/shopify-webhooks/orders-paid";

const tokenResponse = await fetch(
  `https://${shop}/admin/oauth/access_token`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  }
);

if (!tokenResponse.ok) {
  throw new Error(
    `Shopify authentication failed: ${tokenResponse.status}`
  );
}

const { access_token } = await tokenResponse.json();

const query = `
  mutation webhookSubscriptionCreate(
    $topic: WebhookSubscriptionTopic!
    $webhookSubscription: WebhookSubscriptionInput!
  ) {
    webhookSubscriptionCreate(
      topic: $topic
      webhookSubscription: $webhookSubscription
    ) {
      webhookSubscription {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const response = await fetch(
  `https://${shop}/admin/api/2026-07/graphql.json`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": access_token,
    },
    body: JSON.stringify({
      query,
      variables: {
        topic: "ORDERS_PAID",
        webhookSubscription: {
          uri: callbackUrl,
          format: "JSON",
        },
      },
    }),
  }
);

const result = await response.json();

console.log(
  JSON.stringify(
    {
      status: response.status,
      data: result.data,
      errors: result.errors,
    },
    null,
    2
  )
);
