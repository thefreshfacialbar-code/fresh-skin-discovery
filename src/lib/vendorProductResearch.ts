
type VendorProductData = {
  id: number;
  title: string;
  vendor: string;
  type: string;
  handle: string;
  description: string;
};

export async function fetchVendorProduct(
  vendorWebsite: string,
  productHandle: string
) {
  const allowedHosts = new Set([
    "farmhousefreshgoods.com",
    "tizoskin.com",
    "sorellaapothecary.com",
  ]);

  const baseUrl = new URL(vendorWebsite);

  if (
    baseUrl.protocol !== "https:" ||
    !allowedHosts.has(baseUrl.hostname)
  ) {
    throw new Error("Vendor website is not allowed.");
  }

  if (!/^[a-z0-9-]+$/.test(productHandle)) {
    throw new Error("Invalid product handle.");
  }

  const productUrl =
    `${baseUrl.origin}/products/${productHandle}`;

  const response = await fetch(`${productUrl}.js`, {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Vendor product lookup failed: ${response.status}`
    );
  }

  const product =
    (await response.json()) as VendorProductData;

  if (
    !product ||
    typeof product.id !== "number" ||
    typeof product.title !== "string" ||
    product.handle !== productHandle
  ) {
    throw new Error("Invalid vendor product response.");
  }

  return {
    vendorProductId: String(product.id),
    vendorProductName: product.title,
    vendorCategory: product.type || null,
    vendorDescription: product.description || null,
    vendorProductUrl: productUrl,
    vendorName: product.vendor,
  };
}

type VendorSearchProduct = {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  type: string;
};

type VendorSearchResponse = {
  resources: {
    results: {
      products: VendorSearchProduct[];
    };
  };
};

export async function searchVendorProducts(
  vendorWebsite: string,
  searchTerm: string
) {
  const allowedHosts = new Set([
    "farmhousefreshgoods.com",
    "tizoskin.com",
    "sorellaapothecary.com",
  ]);

  const baseUrl = new URL(vendorWebsite);

  if (
    baseUrl.protocol !== "https:" ||
    !allowedHosts.has(baseUrl.hostname) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.port ||
    baseUrl.pathname !== "/" ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error("Vendor website is not allowed.");
  }

  const term = searchTerm.trim();

  if (!term || term.length > 120) {
    throw new Error("Invalid manufacturer search term.");
  }

  const searchUrl = new URL(
    "/search/suggest.json",
    baseUrl.origin
  );

  searchUrl.searchParams.set("q", term);
  searchUrl.searchParams.set(
    "resources[type]",
    "product"
  );
  searchUrl.searchParams.set(
    "resources[limit]",
    "10"
  );

  const response = await fetch(searchUrl.toString(), {
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Manufacturer search failed: ${response.status}`
    );
  }

  const data =
    (await response.json()) as VendorSearchResponse;

  const products = data?.resources?.results?.products;

  if (!Array.isArray(products)) {
    throw new Error("Invalid manufacturer search response.");
  }

  return products
    .filter(
      (product) =>
        typeof product.id === "number" &&
        typeof product.title === "string" &&
        typeof product.handle === "string" &&
        /^[a-z0-9-]+$/.test(product.handle) &&
        typeof product.vendor === "string"
    )
    .map((product) => ({
      manufacturerProductId: String(product.id),
      manufacturerName: product.title,
      manufacturerHandle: product.handle,
      manufacturerBrand: product.vendor,
      manufacturerCategory: product.type || null,
      manufacturerUrl:
        `${baseUrl.origin}/products/${product.handle}`,
    }));
}

export function normalizeVendorProductName(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function findVendorProductMatches(
  productName: string,
  vendorName: string,
  searchResults: Awaited<
    ReturnType<typeof searchVendorProducts>
  >
) {
  const normalizedProductName =
    normalizeVendorProductName(productName);

  const normalizedVendorName =
    normalizeVendorProductName(vendorName);

  return searchResults.filter((candidate) => {
    const nameMatches =
      normalizeVendorProductName(candidate.manufacturerName) ===
      normalizedProductName;

    const brandMatches =
      normalizeVendorProductName(candidate.manufacturerBrand) ===
      normalizedVendorName;

    return nameMatches && brandMatches;
  });
}

export function findUniqueVendorProductMatch(
  productName: string,
  vendorName: string,
  searchResults: Awaited<
    ReturnType<typeof searchVendorProducts>
  >
) {
  const matches = findVendorProductMatches(
    productName,
    vendorName,
    searchResults
  );

  return matches.length === 1 ? matches[0] : null;
}

export function findPotentialVendorProductMatches(
  productName: string,
  vendorName: string,
  searchResults: Awaited<
    ReturnType<typeof searchVendorProducts>
  >
) {
  const normalizedProduct =
    normalizeVendorProductName(productName);

  const normalizedVendor = normalizeVendorProductName(
  vendorName === "FHF" ? "FarmHouse Fresh" : vendorName
);

  return searchResults.filter((candidate) => {
    const normalizedCandidate =
      normalizeVendorProductName(candidate.manufacturerName);

    const brandMatches =
      normalizeVendorProductName(candidate.manufacturerBrand) ===
      normalizedVendor;

    const nameStartsWithCandidate =
      normalizedCandidate.length >= 8 &&
      normalizedProduct.startsWith(normalizedCandidate);

    return brandMatches && nameStartsWithCandidate;
  });
}
