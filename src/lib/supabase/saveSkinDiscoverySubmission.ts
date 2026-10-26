
import "server-only";

import type { SkinDiscoverySubmission } from "@/types/skinDiscoverySubmission";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type SaveSkinDiscoveryResult = {
  success: boolean;
  businessId?: string;
  customerId?: string;
  consultationId?: string;
  skinPlanId?: string;
  skinPlanVersion?: number;
  alreadyProcessed?: boolean;
  error?: string;
};

export async function saveSkinDiscoverySubmission(
  submission: SkinDiscoverySubmission
): Promise<SaveSkinDiscoveryResult> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "save_skin_discovery_submission",
      {
        p_submission: submission,
      }
    );

    if (error) {
      console.error("Skin Discovery persistence RPC failed:", error);

      return {
        success: false,
        error: "Skin Discovery submission could not be saved.",
      };
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      console.error("Invalid Skin Discovery RPC response:", data);

      return {
        success: false,
        error: "Invalid response from Skin Discovery persistence.",
      };
    }

    const result = data as SaveSkinDiscoveryResult;

    if (result.success !== true) {
      return {
        success: false,
        error: result.error ?? "Skin Discovery persistence failed.",
      };
    }

    return result;
  } catch (error) {
    console.error("Unexpected Skin Discovery persistence error:", error);

    return {
      success: false,
      error: "Unexpected Skin Discovery persistence error.",
    };
  }
}
