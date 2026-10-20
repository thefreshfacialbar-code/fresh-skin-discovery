
import { NextResponse } from "next/server";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  fetchVendorProduct,
  searchVendorProducts,
  findVendorProductMatches,
  findUniqueVendorProductMatch,
  findPotentialVendorProductMatches
} from "@/lib/vendorProductResearch";

export const dynamic = "force-dynamic";


    export async function POST(request: Request) {
    const employeeSession = await requireFreshDeskOwnerAdmin();

    if (!employeeSession) {
        return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
        );
    }

    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 }
        );
    }

    if (!body || typeof body !== "object") {
        return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
        );
    }

    const { productId, manufacturerProductId } =
  body as Record<string, unknown>;
  const hasSelectedManufacturerProduct =
  typeof manufacturerProductId === "string" &&
  manufacturerProductId.trim().length > 0;
  if (
  manufacturerProductId !== undefined &&
  (
    typeof manufacturerProductId !== "string" ||
    !/^\d+$/.test(manufacturerProductId) ||
    manufacturerProductId.length > 30
  )
) {
  return NextResponse.json(
    {
      success: false,
      error: "Invalid manufacturer product ID.",
    },
    { status: 400 }
  );
}
    console.log("Vendor Research API productId:", {
    value: productId,
    type: typeof productId,
    length: typeof productId === "string" ? productId.length : null,
    });

    const validProductId =
    typeof productId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        productId
    );

    if (!validProductId) {
    return NextResponse.json(
        { success: false, error: "Invalid product ID" },
        { status: 400 }
    );
    }
    const { data: product, error: productError } =
        await supabaseAdmin
        .from("products")
        .select("id, name, brand, product_url")
        .eq("id", productId)
        .maybeSingle();

    if (productError || !product) {
        return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
        );
    }

    const { data: vendor, error: vendorError } =
        await supabaseAdmin
        .from("product_vendors")
        .select("vendor_name, website_url")
        .eq("brand_code", product.brand)
        .maybeSingle();

    if (vendorError || !vendor) {
        return NextResponse.json(
        { success: false, error: "Vendor website not found" },
        { status: 404 }
        );
    }
    let candidateHandle: string | null = null;

    if (product.product_url) {
    try {
        const shopifyUrl = new URL(product.product_url);

        if (
        shopifyUrl.protocol === "https:" &&
        shopifyUrl.hostname === "shop.thefreshfacialbar.com"
        ) {
        const match = shopifyUrl.pathname.match(
            /^\/products\/([a-z0-9-]+)\/?$/
        );
candidateHandle = match?.[1] ?? null;
            }
    } catch {
        candidateHandle = null;
    }
    }
let verifiedCandidateResearch: Awaited<
  ReturnType<typeof fetchVendorProduct>
> | null = null;
let candidateVerification = null;

if (product.brand === "FHF" && candidateHandle) {
  try {
    const candidate = await fetchVendorProduct(
      vendor.website_url,
      candidateHandle
    );

    const normalizeName = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, "");


const nameMatches =
  normalizeName(candidate.vendorProductName) ===
  normalizeName(product.name);

const brandMatches =
  normalizeName(candidate.vendorName) ===
  normalizeName(vendor.vendor_name);

const normalizeProductName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/\b(serum|moisturizer|cleanser|mask)\b$/i, "")
    .replace(/[^a-z0-9]/g, "");

const normalizedNameMatches =
  normalizeProductName(candidate.vendorProductName) ===
  normalizeProductName(product.name);

const handleMatches =
  candidate.vendorProductUrl ===
  `${new URL(vendor.website_url).origin}/products/${candidateHandle}`;

candidateVerification = {
  manufacturerName: candidate.vendorProductName,
  manufacturerBrand: candidate.vendorName,
  manufacturerProductUrl: candidate.vendorProductUrl,
  nameMatches,
  normalizedNameMatches,
  brandMatches,
  handleMatches,
  verifiedMatch:
  brandMatches &&
  (nameMatches || (normalizedNameMatches && handleMatches)),
};

if (
  brandMatches &&
  (nameMatches || (normalizedNameMatches && handleMatches))
) {
  verifiedCandidateResearch = candidate;
}

  } catch (error) {
    console.error("Candidate verification failed:", error);
  }
}
let selectedManufacturerResearch: Awaited<
  ReturnType<typeof fetchVendorProduct>
> | null = null;
let manufacturerSearchResults = null;

if (product.brand === "FHF") {
  try {
    manufacturerSearchResults = await searchVendorProducts(
      vendor.website_url,
      product.name
    );
  } catch (error) {
    console.error("Manufacturer search failed:", error);
  }
}
if (hasSelectedManufacturerProduct) {
  if (product.brand !== "FHF" || !manufacturerSearchResults) {
    return NextResponse.json(
      {
        success: false,
        error: "Selected manufacturer product could not be verified.",
      },
      { status: 400 }
    );
  }

  const selectedMatch = manufacturerSearchResults.find(
    (match) =>
      String(match.manufacturerProductId) === manufacturerProductId
  );

  if (!selectedMatch) {
    return NextResponse.json(
      {
        success: false,
        error: "Selected product was not found in manufacturer results.",
      },
      { status: 400 }
    );
  }
  const eligibleMatches = findPotentialVendorProductMatches(
  product.name,
  product.brand,
  manufacturerSearchResults
);

const isEligibleMatch = eligibleMatches.some(
  (match) =>
    String(match.manufacturerProductId) ===
    String(selectedMatch.manufacturerProductId)
);

if (!isEligibleMatch) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Selected manufacturer product is not an eligible match for this product.",
    },
    { status: 400 }
  );
}
  try {
  const selectedProduct = await fetchVendorProduct(
    vendor.website_url,
    selectedMatch.manufacturerHandle
  );

  if (
    String(selectedProduct.vendorProductId) !==
    String(selectedMatch.manufacturerProductId)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Manufacturer product identity verification failed.",
      },
      { status: 400 }
    );
  }
  if (
  selectedProduct.vendorCategory?.trim().toLowerCase() ===
  "gift sets"
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Gift sets cannot be selected as individual skincare products.",
    },
    { status: 400 }
  );
}
  selectedManufacturerResearch = selectedProduct;
} catch (error) {
  console.error("Selected manufacturer product verification failed:", error);

  return NextResponse.json(
    {
      success: false,
      error: "Could not verify selected manufacturer product.",
    },
    { status: 502 }
  );
}
}
    let research: Awaited<
  ReturnType<typeof fetchVendorProduct>
> | null = selectedManufacturerResearch;
if (!hasSelectedManufacturerProduct) {
if (
  product.brand === "FHF" &&
  product.id === "73deb05e-11f8-4777-981e-5e33e50cc4d3"
) {
  try {
    research = await fetchVendorProduct(
      vendor.website_url,
      "bluephoria-mask"
    );
  } catch (error) {
    console.error("Bluephoria manufacturer lookup failed:", error);
  }
}

    if (
    product.brand === "FHF" &&
    product.id === "179c5960-929c-4403-858f-9e939b1923bd"
    ) {
    try {
        research = await fetchVendorProduct(
        vendor.website_url,
        "chocolate-fig-vitamin-recovery-serum"
        );
    } catch (error) {
        console.error("Vendor research failed:", error);
    }
    }

if (
  product.brand === "FHF" &&
  product.id === "fc8f3ef5-86cd-4f25-a28b-5172bf3217d4"
) {
  try {
    research = await fetchVendorProduct(
      vendor.website_url,
      "make-it-melt-silky-milk-cleansing-balm"
    );
  } catch (error) {
    console.error("Make It Melt manufacturer lookup failed:", error);
  }
}

if (
  product.brand === "FHF" &&
  product.id === "ea9c39d0-6943-40fc-bf56-ec2a4504eed8"
) {
  try {
    research = await fetchVendorProduct(
      vendor.website_url,
      "eyem-revived"
    );
  } catch (error) {
    console.error(
      "Eye'm Revived manufacturer lookup failed:",
      error
    );
  }
}

if (
  product.brand === "FHF" &&
  product.id === "b32bcc08-9838-47a6-99c5-fd7a29b6f71f"
) {
  try {
    research = await fetchVendorProduct(
      vendor.website_url,
      "c-the-future"
    );
  } catch (error) {
    console.error(
      "C The Future manufacturer lookup failed:",
      error
    );
  }
}

if (!research && verifiedCandidateResearch) {
  research = verifiedCandidateResearch;
}

if (!research && manufacturerSearchResults) {
  const uniqueMatch = findUniqueVendorProductMatch(
    product.name,
    vendor.vendor_name,
    manufacturerSearchResults
  );

  if (uniqueMatch) {
    try {
      const candidate = await fetchVendorProduct(
        vendor.website_url,
        uniqueMatch.manufacturerHandle
      );

      const normalize = (value: string) =>
        value.toLowerCase().replace(/[^a-z0-9]/g, "");

      if (
        candidate.vendorProductId ===
          uniqueMatch.manufacturerProductId &&
        normalize(candidate.vendorProductName) ===
          normalize(product.name) &&
        normalize(candidate.vendorName) ===
          normalize(vendor.vendor_name)
      ) {
        research = candidate;
      }
    } catch (error) {
      console.error(
        "Unique manufacturer match lookup failed:",
        error
      );
    }
  }
}

if (!research && manufacturerSearchResults) {
  const potentialMatches = findPotentialVendorProductMatches(
    product.name,
    vendor.vendor_name,
    manufacturerSearchResults
  );

  if (potentialMatches.length === 1) {
    const match = potentialMatches[0];

    try {
      const candidate = await fetchVendorProduct(
        vendor.website_url,
        match.manufacturerHandle
      );

      const normalize = (value: string) =>
        value.toLowerCase().replace(/[^a-z0-9]/g, "");

      const identityMatches =
        candidate.vendorProductId === match.manufacturerProductId &&
        normalize(candidate.vendorProductName) ===
          normalize(match.manufacturerName) &&
        normalize(candidate.vendorName) ===
          normalize(vendor.vendor_name);

      if (identityMatches) {
        research = candidate;
      }
    } catch (error) {
      console.error(
        "Potential manufacturer match verification failed:",
        error
      );
    }
  }
}
}
    if (research) {
    const { data: existingResearch, error: lookupError } =
        await supabaseAdmin
        .from("product_vendor_research")
        .select("research_status")
        .eq("product_id", product.id)
        .maybeSingle();

    if (lookupError) {
        return NextResponse.json(
        { success: false, error: "Could not check research status." },
        { status: 500 }
        );
    }

    if (existingResearch?.research_status === "approved") {
        return NextResponse.json(
        {
            success: false,
            error: "Approved research cannot be overwritten automatically.",
        },
        { status: 409 }
        );
    }


    const { error: saveError } = await supabaseAdmin
        .from("product_vendor_research")
        .upsert(
        {
            product_id: product.id,
            vendor_product_name: research.vendorProductName,
            vendor_product_id: research.vendorProductId,
            vendor_product_url: research.vendorProductUrl,
            vendor_category: research.vendorCategory,
            vendor_description: research.vendorDescription,
professional_description: null,
rejection_reason: null,
research_status: "draft",
            researched_at: new Date().toISOString(),
            reviewed_at: null,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id" }
        );

    if (saveError) {
        console.error("Vendor research save failed:", saveError);

        return NextResponse.json(
        { success: false, error: "Could not save vendor research." },
        { status: 500 }
        );
    }
    }

const potentialManufacturerMatches = manufacturerSearchResults
  ? findPotentialVendorProductMatches(
      product.name,
      vendor.vendor_name,
      manufacturerSearchResults
    )
  : [];

const manufacturerMatches = manufacturerSearchResults
  ? findVendorProductMatches(
      product.name,
      vendor.vendor_name,
      manufacturerSearchResults
    )
  : [];

const uniqueManufacturerMatch = manufacturerSearchResults
  ? findUniqueVendorProductMatch(
      product.name,
      vendor.vendor_name,
      manufacturerSearchResults
    )
  : null;

    return NextResponse.json({
        success: true,
        product: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        },
        vendor: {
        name: vendor.vendor_name,
        websiteUrl: vendor.website_url,
        },
        research,
        candidateHandle,
        candidateVerification,
        manufacturerSearchResults,
        manufacturerMatches,
        uniqueManufacturerMatch,
        potentialManufacturerMatches,
    });
    }
