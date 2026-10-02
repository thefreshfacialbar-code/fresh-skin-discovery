import { getShopifyProducts } from "@/lib/shopifyAdmin";
import { productCatalog } from "@/data/productCatalog";
import { cgcProductCatalog } from "@/data/cgcProductCatalog";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
const cgcPrivateLabelProductIds = new Set([
  "clean-slate",
  "thirsty-face",
  "second-wind",
  "zero-in",
  "deep-clean",
  "long-night",
]);
const shopifyTitleOverrides: Record<string, string> = {
  "clean-slate": "Clean Slate Soothing & Calming Facial Cleanser",
  "thirsty-face": "Thirsty Face Hydrating Moisturizer",
  "second-wind": "Second Wind Firming Moisturizer with ReVita-D",
  "zero-in": "Zero In Booster Serum",
  "deep-clean": "Deep Clean Charcoal Exfoliator & Cleanser",
  "long-night": "Long Night Cucumber Herbal Eye Cream",
};
const cgcPrivateLabelProducts = cgcProductCatalog.filter(
  (product) => cgcPrivateLabelProductIds.has(product.id)
);
export async function POST(request: Request) {
      const syncSecret = process.env.SHOPIFY_SYNC_SECRET;
  const providedSecret = request.headers.get("x-shopify-sync-secret");

  if (!syncSecret || providedSecret !== syncSecret) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
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
      error: "Could not find Fresh Facial Bar business",
      details: businessError?.message ?? null,
    },
    { status: 500 }
  );
}
  const shopifyProducts = await getShopifyProducts();

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const syncCatalog = [
  ...productCatalog,
  ...cgcPrivateLabelProducts,
];

const matches = syncCatalog.map((freshProduct) => {
  const shopifyTitle =
    shopifyTitleOverrides[freshProduct.id] ?? freshProduct.name;

  const shopifyProduct = shopifyProducts.find(
    (product) =>
      normalize(product.title) === normalize(shopifyTitle)
  );

    return {
      freshProductId: freshProduct.id,
      freshProductName: freshProduct.name,
      freshMethodCategory: freshProduct.category,
      primaryJourney: freshProduct.primaryJourney,
supportingJourney: freshProduct.supportingJourney,
recommendationRole: freshProduct.role,
guestBenefit: freshProduct.guestBenefit,
intensity: freshProduct.intensity,
usageType: freshProduct.usageType ?? null,
requiresFarmacistReview: freshProduct.requiresFarmacistReview ?? false,
calmSensitiveCaution: freshProduct.calmSensitiveCaution ?? false,
excluded: freshProduct.excluded ?? false,
      matched: Boolean(shopifyProduct),
      shopifyProductId: shopifyProduct?.id ?? null,
      shopifyTitle: shopifyProduct?.title ?? null,
      shopifyVariantId: shopifyProduct?.variants.nodes[0]?.id ?? null,
      brand: shopifyProduct?.vendor ?? null,
    category: shopifyProduct?.productType ?? null,  
        price: shopifyProduct?.variants.nodes[0]?.price ?? null,
        productUrl: shopifyProduct?.onlineStoreUrl ?? null,
    inStock: shopifyProduct?.variants.nodes[0]?.availableForSale ?? null,
    };
  });

  const matched = matches.filter((item) => item.matched);
 const syncResults = [];

for (const product of matched) {
  const productRecord = {
    business_id: business.id,
    fresh_product_id: product.freshProductId,
    shopify_product_id: product.shopifyProductId,
    shopify_variant_id: product.shopifyVariantId,
    name: product.freshProductName,
    brand: product.brand,
    category: product.category,
    price: product.price ? Number(product.price) : null,
    product_url: product.productUrl,
    active: true,
    in_stock: product.inStock,
    recommendable: true,
    recommendation_status: "approved",
    updated_at: new Date().toISOString(),
  };

  const { data: existingProduct, error: lookupError } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("business_id", business.id)
    .eq("fresh_product_id", product.freshProductId)
    .maybeSingle();

  if (lookupError) {
    return Response.json(
      {
        error: `Could not check existing product: ${product.freshProductName}`,
        details: lookupError.message,
      },
      { status: 500 }
    );
  }
let savedProductId: string;
  if (existingProduct) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .update(productRecord)
      .eq("id", existingProduct.id)
      .select()
      .single();

    if (error) {
      return Response.json(
        {
          error: `Could not update product: ${product.freshProductName}`,
          details: error.message,
        },
        { status: 500 }
      );
    }
savedProductId = data.id;
    syncResults.push({
      action: "updated",
      product: data,
    });
    } else {
        const { data, error } = await supabaseAdmin
        .from("products")
        .insert(productRecord)
        .select()
        .single();

        if (error) {
        return Response.json(
            {
            error: `Could not insert product: ${product.freshProductName}`,
            details: error.message,
            },
            { status: 500 }
        );
        }
savedProductId = data.id;
        syncResults.push({
        action: "inserted",
        product: data,
        });
    }
const profileRecord = {
  product_id: savedProductId,
  product_category: product.freshMethodCategory,
  primary_journey: product.primaryJourney,
  supporting_journey: product.supportingJourney,
  recommendation_role: product.recommendationRole,
  customer_guidance: product.guestBenefit,
  intensity: product.intensity,
  usage_type: product.usageType,
  requires_farmacist_review: product.requiresFarmacistReview,
  calm_sensitive_caution: product.calmSensitiveCaution,
  excluded: product.excluded,
  updated_at: new Date().toISOString(),
};

  const { data: existingProfile, error: profileLookupError } =
    await supabaseAdmin
      .from("product_recommendation_profiles")
      .select("id")
      .eq("product_id", savedProductId)
      .maybeSingle();

  if (profileLookupError) {
    return Response.json(
      {
        error: `Could not check recommendation profile: ${product.freshProductName}`,
        details: profileLookupError.message,
      },
      { status: 500 }
    );
  }

  if (existingProfile) {
    const { error: profileUpdateError } = await supabaseAdmin
      .from("product_recommendation_profiles")
      .update(profileRecord)
      .eq("id", existingProfile.id);

    if (profileUpdateError) {
      return Response.json(
        {
          error: `Could not update recommendation profile: ${product.freshProductName}`,
          details: profileUpdateError.message,
        },
        { status: 500 }
      );
    }
  } else {
    const { error: profileInsertError } = await supabaseAdmin
      .from("product_recommendation_profiles")
      .insert(profileRecord);

    if (profileInsertError) {
      return Response.json(
        {
          error: `Could not insert recommendation profile: ${product.freshProductName}`,
          details: profileInsertError.message,
        },
        { status: 500 }
      );
    }
  }

    }
    
  const unmatched = matches.filter((item) => !item.matched);
const { data: profileValidationData, error: profileValidationError } =
  await supabaseAdmin
    .from("products")
    .select(`
      fresh_product_id,
      product_recommendation_profiles (
        primary_journey,
        supporting_journey,
        recommendation_role,
        customer_guidance,
        intensity,
        usage_type,
        requires_farmacist_review,
        calm_sensitive_caution,
        excluded
      )
    `)
    .eq("business_id", business.id)
    .not("fresh_product_id", "is", null);

if (profileValidationError) {
  return Response.json(
    {
      error: "Could not load recommendation profiles for validation",
      details: profileValidationError.message,
    },
    { status: 500 }
  );
}
const validationMismatches = syncCatalog.flatMap(
  (
    catalogProduct
  ): Array<{
    productId: string;
    issue?: string;
    differences?: string[];
  }> => {
  const dbProduct = profileValidationData?.find(
    (row) => row.fresh_product_id === catalogProduct.id
  );

  const relatedProfile = dbProduct?.product_recommendation_profiles;

const profile = Array.isArray(relatedProfile)
  ? relatedProfile[0]
  : relatedProfile;

  if (!profile) {
    return [
      {
        productId: catalogProduct.id,
        issue: "Missing Supabase recommendation profile",
      },
    ];
  }

  const differences: string[] = [];

  if (profile.primary_journey !== catalogProduct.primaryJourney)
    differences.push("primaryJourney");

  if (profile.supporting_journey !== catalogProduct.supportingJourney)
    differences.push("supportingJourney");

  if (profile.recommendation_role !== catalogProduct.role)
    differences.push("role");

  if (profile.customer_guidance !== catalogProduct.guestBenefit)
    differences.push("guestBenefit");

  if (profile.intensity !== catalogProduct.intensity)
    differences.push("intensity");

  if ((profile.usage_type ?? null) !== (catalogProduct.usageType ?? null))
    differences.push("usageType");

  if (
    profile.requires_farmacist_review !==
    (catalogProduct.requiresFarmacistReview ?? false)
  )
    differences.push("requiresFarmacistReview");

  if (
    profile.calm_sensitive_caution !==
    (catalogProduct.calmSensitiveCaution ?? false)
  )
    differences.push("calmSensitiveCaution");

  if (profile.excluded !== (catalogProduct.excluded ?? false))
    differences.push("excluded");

  return differences.length
    ? [{ productId: catalogProduct.id, differences }]
    : [];
    }
);
return Response.json({
  success: true,
  freshMethodProductCount: productCatalog.length,
  shopifyProductCount: shopifyProducts.length,
  matchedCount: matched.length,
  unmatchedCount: unmatched.length,
  insertedCount: syncResults.filter(
    (result) => result.action === "inserted"
  ).length,
  updatedCount: syncResults.filter(
    (result) => result.action === "updated"
  ).length,
  validationMismatchCount: validationMismatches.length,
validationMismatches,
  unmatched,
});
}