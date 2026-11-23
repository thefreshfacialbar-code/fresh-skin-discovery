

import { NextResponse } from "next/server";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  searchVendorProducts,
  findVendorProductMatches,
  findPotentialVendorProductMatches,
} from "@/lib/vendorProductResearch";


export const dynamic = "force-dynamic";
const RATE_LIMIT_COOLDOWN_MS = 30 * 60 * 1000;
const MANUFACTURER_REQUEST_DELAY_MS = 2000;
let manufacturerBlockedUntil = 0;
let manufacturerResearchRunning = false;
export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageValue = url.searchParams.get("page") ?? "1";

  const page = Number(pageValue);

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 14
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid page number." },
      { status: 400 }
    );
  }

  const pageSize = 3;
  const startIndex = (page - 1) * pageSize;
    if (Date.now() < manufacturerBlockedUntil) {
    return NextResponse.json(
      {
        success: false,
        error: "Manufacturer research is temporarily paused.",
        retryAfter: new Date(manufacturerBlockedUntil).toISOString(),
      },
      { status: 429 }
    );
  }
  const employeeSession = await requireFreshDeskOwnerAdmin();

  if (!employeeSession) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  // Load existing manufacturer research records.
  const { data: researchedProducts, error: researchError } =
    await supabaseAdmin
      .from("product_vendor_research")
      .select("product_id");

  if (researchError) {
    return NextResponse.json(
      { success: false, error: "Could not load research records." },
      { status: 500 }
    );
  }

  const researchedIds = new Set(
    (researchedProducts ?? []).map((item) => item.product_id)
  );

  // Load FarmHouse Fresh products.
  const { data: products, error: productsError } =
    await supabaseAdmin
      .from("products")
      .select("id, name, brand, product_url")
      .eq("brand", "FHF")
      .order("name");

  if (productsError) {
    return NextResponse.json(
      { success: false, error: "Could not load products." },
      { status: 500 }
    );
  }

  // Exclude products that already have research.
  const pendingProducts = (products ?? []).filter(
    (product) => !researchedIds.has(product.id)
  );


const testMatches = [];
if (manufacturerResearchRunning) {
  return NextResponse.json(
    {
      success: false,
      error: "Manufacturer research is already running.",
    },
    { status: 429 }
  );
}

manufacturerResearchRunning = true;
try {
// Limit each research request to three products.
const batchProducts = pendingProducts.slice(
  startIndex,
  startIndex + pageSize
);

for (const [index, product] of batchProducts.entries()) {
  if (index > 0) {
    await new Promise<void>((resolve) =>
      setTimeout(resolve, MANUFACTURER_REQUEST_DELAY_MS)
    );
  }

  try {
    const searchResults = await searchVendorProducts(
      "https://farmhousefreshgoods.com",
      product.name
    );

    const exactMatches = findVendorProductMatches(
      product.name,
      "FarmHouse Fresh",
      searchResults
    );

    const potentialMatches = findPotentialVendorProductMatches(
      product.name,
      "FarmHouse Fresh",
      searchResults
    );

       // Combine candidates without counting exact matches twice.
    const candidates = Array.from(
      new Map(
        [...exactMatches, ...potentialMatches].map((match) => [
          match.manufacturerProductId,
          match,
        ])
      ).values()
    );

    const hasGiftSet = candidates.some(
      (match) =>
        match.manufacturerCategory?.toLowerCase() === "gift sets"
    );

    const matchStatus =
      candidates.length === 0
        ? "no_match"
        : hasGiftSet && candidates.length === 1
        ? "gift_set"
        : candidates.length > 1
        ? "ambiguous"
        : exactMatches.length === 1
        ? "exact"
        : "potential";

    testMatches.push({
      productId: product.id,
      productName: product.name,
      matchStatus,
      hasGiftSet,
      exactMatches,
      potentialMatches,
    });
 } catch (error) {
  console.error(
    `Batch preview search failed for ${product.name}:`,
    error
  );

  const isRateLimited =
    error instanceof Error &&
    /\b429\b/.test(error.message);

  testMatches.push({
    productId: product.id,
    productName: product.name,
    error: isRateLimited
      ? "Manufacturer rate limit reached"
      : "Manufacturer search failed",
  });

      if (isRateLimited) {
    manufacturerBlockedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    break;
  }
} // End catch block
} // End for loop

return NextResponse.json({
  success: true,
  mode: "preview",
  brand: "FHF",
  productCount: pendingProducts.length,
  page,
  pageSize,
  totalPages: Math.ceil(pendingProducts.length / pageSize),
  testMatches,
  });
} finally {
  manufacturerResearchRunning = false;
}
}
