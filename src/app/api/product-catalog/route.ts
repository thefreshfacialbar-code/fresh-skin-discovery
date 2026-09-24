import { getSupabaseProductCatalog } from "@/lib/supabaseProductCatalog";

export async function GET() {
  try {
    const products = await getSupabaseProductCatalog();

    return Response.json({
      success: true,
      productCount: products.length,
      products,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}