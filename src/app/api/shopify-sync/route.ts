import { getShopifyProducts } from "@/lib/shopifyAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";


export async function POST(request: Request) {
      const dryRun =
    new URL(request.url).searchParams.get("dryRun") === "true";
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

  let insertedCount = 0;
  let updatedCount = 0;
  let profilesCreatedCount = 0;
  const preview = {
  productsToInsert: [] as string[],
  productsToUpdate: [] as string[],
  productsSkipped: [] as string[],
};

  for (const shopifyProduct of shopifyProducts) {
  // Event tickets are handled by the Shopify orders
  // and event reporting workflows.
  if (
  shopifyProduct.variants.nodes.some((variant) =>
    variant.sku?.startsWith("EVENT-")
  )
) {
  if (dryRun) {
    preview.productsSkipped.push(shopifyProduct.title);
  }

  continue;
}


    const { data: existingProduct, error: lookupError } =
      await supabaseAdmin
        .from("products")
        .select("id, shopify_variant_id")
        .eq("business_id", business.id)
        .eq("shopify_product_id", shopifyProduct.id)
        .maybeSingle();

    if (lookupError) {
      return Response.json(
        {
          error: `Could not look up ${shopifyProduct.title}`,
          details: lookupError.message,
        },
        { status: 500 }
      );
    }
// Preserve the existing Shopify variant mapping when possible.
const existingVariant = existingProduct?.shopify_variant_id
  ? shopifyProduct.variants.nodes.find(
      (variant) => variant.id === existingProduct.shopify_variant_id
    )
  : null;

// Never silently replace an existing variant mapping.
if (existingProduct?.shopify_variant_id && !existingVariant) {
  return Response.json(
    {
      error: `Existing Shopify variant not found for ${shopifyProduct.title}`,
      shopifyProductId: shopifyProduct.id,
      expectedVariantId: existingProduct.shopify_variant_id,
    },
    { status: 409 }
  );
}

const variant =
  existingVariant ?? shopifyProduct.variants.nodes[0] ?? null;

const commerceData = {
  shopify_variant_id: variant?.id ?? null,
  sku: variant?.sku ?? null,
  name: shopifyProduct.title,
  brand: shopifyProduct.vendor || null,
  category: shopifyProduct.productType || null,
  price: variant ? Number(variant.price) : null,
  product_url: shopifyProduct.onlineStoreUrl,
  in_stock: variant?.availableForSale ?? null,
};
    let productId: string;
if (dryRun) {
  if (existingProduct) {
    preview.productsToUpdate.push(shopifyProduct.title);
  } else {
    preview.productsToInsert.push(shopifyProduct.title);
  }

  continue;
}
    if (existingProduct) {
      const { error } = await supabaseAdmin
        .from("products")
        .update(commerceData)
        .eq("id", existingProduct.id)
        .eq("business_id", business.id);

      if (error) {
        return Response.json(
          {
            error: `Could not update ${shopifyProduct.title}`,
            details: error.message,
          },
          { status: 500 }
        );
      }

      productId = existingProduct.id;
      updatedCount++;
    } else {
      // Shopify product IDs provide stable identifiers without
      // relying on product titles or hardcoded catalogs.
      const freshProductId = `shopify-${shopifyProduct.id
        .split("/")
        .pop()}`;

      const { data, error } = await supabaseAdmin
        .from("products")
        .insert({
          business_id: business.id,
          shopify_product_id: shopifyProduct.id,
          fresh_product_id: freshProductId,
          ...commerceData,
          active: true,
          recommendable: false,
          recommendation_status: "needs_review",
        })
        .select("id")
        .single();

      if (error || !data) {
        return Response.json(
          {
            error: `Could not import ${shopifyProduct.title}`,
            details: error?.message ?? null,
          },
          { status: 500 }
        );
      }

      productId = data.id;
      insertedCount++;
    }

    // Preserve all existing Fresh Desk recommendation profiles.
    const { data: existingProfile, error: profileLookupError } =
      await supabaseAdmin
        .from("product_recommendation_profiles")
        .select("id")
        .eq("product_id", productId)
        .maybeSingle();

    if (profileLookupError) {
      return Response.json(
        {
          error: `Could not check profile for ${shopifyProduct.title}`,
          details: profileLookupError.message,
        },
        { status: 500 }
      );
    }

    if (!existingProfile) {
      const { error } = await supabaseAdmin
        .from("product_recommendation_profiles")
        .insert({
          product_id: productId,
          experience_ids: [],
          recommendation_enabled: false,
          featured_eligible: false,
        });

      if (error) {
        return Response.json(
          {
            error: `Could not initialize profile for ${shopifyProduct.title}`,
            details: error.message,
          },
          { status: 500 }
        );
      }

      profilesCreatedCount++;
    }
  }
if (dryRun) {
  return Response.json({
    success: true,
    dryRun: true,
    shopifyProductCount: shopifyProducts.length,
    productsToInsert: preview.productsToInsert,
    productsToUpdate: preview.productsToUpdate,
    productsSkipped: preview.productsSkipped,
    insertCount: preview.productsToInsert.length,
    updateCount: preview.productsToUpdate.length,
    skippedCount: preview.productsSkipped.length,
  });
}
  return Response.json({
    success: true,
    shopifyProductCount: shopifyProducts.length,
    insertedCount,
    updatedCount,
    profilesCreatedCount,
  });
}