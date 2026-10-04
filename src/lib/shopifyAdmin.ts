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
  metafields: {
  nodes: Array<{
    namespace: string;
    key: string;
    value: string;
  }>;
};
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
export type ShopifyOrder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  email: string | null;
    phone: string | null;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  subtotalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  } | null;
  totalTaxSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  } | null;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  } | null;
  customer: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  lineItems: {
    nodes: Array<{
      id: string;
      name: string;
      sku: string | null;
quantity: number;
currentQuantity: number;
originalUnitPriceSet: {
        shopMoney: {
          amount: string;
          currencyCode: string;
        };
      };
      product: {
        id: string;
      } | null;
      variant: {
        id: string;
        title: string;
      } | null;
    }>;
  };
};

type ShopifyOrdersPage = {
  orders: {
    nodes: ShopifyOrder[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
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

metafields(first: 25, namespace: "custom") {
  nodes {
    namespace
    key
    value
  }
}

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
  export async function getShopifyOrders(): Promise<ShopifyOrder[]> {
  const orders: ShopifyOrder[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const pageData: ShopifyOrdersPage =
      await shopifyAdminGraphQL<ShopifyOrdersPage>(
        `
          query GetOrders($after: String) {
            orders(first: 100, after: $after, sortKey: CREATED_AT, reverse: true) {
              nodes {
                id
                name
                createdAt
                updatedAt
                email
                phone
                displayFinancialStatus
                displayFulfillmentStatus

                subtotalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }

                totalTaxSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }

                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }

                customer {
                  firstName
                  lastName
                  email
                  phone
                }

                lineItems(first: 100) {
                  nodes {
                    id
                    name
                    sku
quantity
currentQuantity

originalUnitPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }

                    product {
                      id
                    }

                    variant {
                      id
                      title
                    }
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

    orders.push(...pageData.orders.nodes);

    hasNextPage = pageData.orders.pageInfo.hasNextPage;
    cursor = pageData.orders.pageInfo.endCursor;
  }

  return orders;
}