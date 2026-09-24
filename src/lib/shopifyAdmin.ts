import "server-only";

type ShopifyAccessTokenResponse = {
  access_token: string;
  scope: string;
  expires_in: number;
};

export async function getShopifyAdminAccessToken(): Promise<string> {
  const shop = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!shop || !clientId || !clientSecret) {
    throw new Error("Missing Shopify environment variables");
  }

  const response = await fetch(
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
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Shopify authentication failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as ShopifyAccessTokenResponse;

  if (!data.access_token) {
    throw new Error("Shopify did not return an access token");
  }

  return data.access_token;
}
export async function shopifyAdminGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const shop = process.env.SHOPIFY_STORE_DOMAIN;

  if (!shop) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN");
  }

  const accessToken = await getShopifyAdminAccessToken();

  const response = await fetch(
    `https://${shop}/admin/api/2026-07/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Shopify GraphQL request failed: ${response.status} ${response.statusText}`
    );
  }

  if (data.errors) {
    throw new Error(
      `Shopify GraphQL errors: ${JSON.stringify(data.errors)}`
    );
  }

  return data.data as T;
}
type ShopifyProductsPage = {
  products: {
    nodes: ShopifyProduct[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};
export type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  onlineStoreUrl: string | null;
  variants: {
    nodes: Array<{
      id: string;
      title: string;
      sku: string | null;
      price: string;
      availableForSale: boolean;
    }>;
  };
};

export async function getShopifyProducts(): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const pageData: ShopifyProductsPage =
  await shopifyAdminGraphQL<ShopifyProductsPage>(
      `
        query GetProducts($after: String) {
          products(first: 250, after: $after) {
            nodes {
              id
              title
              handle
              vendor
              productType
              onlineStoreUrl
              variants(first: 25) {
                nodes {
                  id
                  title
                  sku
                  price
                  availableForSale
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
      {
        after: cursor,
      }
    );

    products.push(...pageData.products.nodes);

    hasNextPage = pageData.products.pageInfo.hasNextPage;
    cursor = pageData.products.pageInfo.endCursor;
  }

  return products;
}
  