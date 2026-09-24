import "server-only";

import type { SkinDiscoverySubmission } from "@/types/skinDiscoverySubmission";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type SaveSkinDiscoveryResult = {
  success: boolean;
  businessId?: string;
  error?: string;
};

export async function saveSkinDiscoverySubmission(
  submission: SkinDiscoverySubmission
): Promise<SaveSkinDiscoveryResult> {
  try {
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("name", "Fresh Facial Bar")
      .single();

    if (businessError || !business) {
      console.error(
        "Unable to find Fresh Facial Bar business:",
        businessError
      );

      return {
        success: false,
        error: "Fresh Facial Bar business could not be found.",
      };
    }

const email = submission.guest.email.trim().toLowerCase();
const firstName = submission.guest.firstName.trim();
const lastName = submission.guest.lastName.trim();
const mobilePhone = submission.guest.phone?.trim() || null;

// Look for an existing Fresh customer by email.
const { data: existingCustomer, error: lookupError } = await supabaseAdmin
  .from("customers")
  .select("id")
  .eq("business_id", business.id)
  .ilike("email", email)
  .maybeSingle();

if (lookupError) {
  console.error("Unable to look up customer:", lookupError);

  return {
    success: false,
    error: "Customer lookup failed.",
  };
}

let customerId: string;

if (existingCustomer) {
  customerId = existingCustomer.id;
} else {
  const { data: newCustomer, error: customerError } = await supabaseAdmin
    .from("customers")
    .insert({
      business_id: business.id,
      first_name: firstName,
      last_name: lastName,
      email,
      mobile_phone: mobilePhone,
      active: true,
    })
    .select("id")
    .single();

  if (customerError || !newCustomer) {
    console.error("Unable to create customer:", customerError);

    return {
      success: false,
      error: "Customer could not be created.",
    };
  }

  customerId = newCustomer.id;
}

console.log("Fresh Customer 360 customer resolved:", customerId);
const { data: location, error: locationError } = await supabaseAdmin
  .from("locations")
  .select("id")
  .eq("business_id", business.id)
  .eq("active", true)
  .limit(1)
  .maybeSingle();

if (locationError) {
  console.error("Unable to find Fresh location:", locationError);

  return {
    success: false,
    error: "Fresh location lookup failed.",
  };
}

const { data: consultation, error: consultationError } = await supabaseAdmin
  .from("consultations")
  .insert({
    business_id: business.id,
    customer_id: customerId,
    location_id: location?.id ?? null,
    questionnaire_version: submission.experience || "skin-discovery",
    status: "completed",
    consultation_source: "web",
    started_at: submission.createdAt,
    completed_at: submission.createdAt,
  })
  .select("id")
  .single();

if (consultationError || !consultation) {
  console.error("Unable to create consultation:", consultationError);

  return {
    success: false,
    error: "Consultation could not be created.",
  };
}

console.log(
  "Fresh Customer 360 consultation created:",
  consultation.id
);
const consultationAnswers = [
  {
    consultation_id: consultation.id,
    question_key: "primary_motivation",
    question_text: "Primary Motivation",
    answer_key: submission.discovery.primaryMotivation,
    answer_text: submission.discovery.primaryMotivation,
    answer_keys: [],
  },
  {
    consultation_id: consultation.id,
    question_key: "skin_experience",
    question_text: "Skin Experience",
    answer_key: null,
    answer_text: null,
    answer_keys: submission.discovery.skinExperience,
  },
  {
    consultation_id: consultation.id,
    question_key: "desired_outcomes",
    question_text: "Desired Outcomes",
    answer_key: null,
    answer_text: null,
    answer_keys: submission.discovery.desiredOutcomes,
  },
];

const { error: answersError } = await supabaseAdmin
  .from("consultation_answers")
  .insert(consultationAnswers);

if (answersError) {
  console.error(
    "Unable to save consultation answers:",
    answersError
  );

  return {
    success: false,
    error: "Consultation answers could not be saved.",
  };
}

console.log(
  "Fresh Customer 360 consultation answers saved:",
  consultation.id
);

const journeyScores = submission.journey.scores;

const rankedJourneys = Object.entries(journeyScores)
  .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

const journeyScoreRows = rankedJourneys.map(
  ([journey, score], index) => {
    let role: "primary" | "secondary" | "supporting" = "supporting";

    if (
      submission.journey.primaryJourneys.includes(
        journey as (typeof submission.journey.primaryJourneys)[number]
      )
    ) {
      role = "primary";
    } else if (submission.journey.secondaryJourney === journey) {
      role = "secondary";
    }

    return {
      consultation_id: consultation.id,
      journey,
      score,
      rank: index + 1,
      role,
    };
  }
);

const { error: journeyScoresError } = await supabaseAdmin
  .from("consultation_journey_scores")
  .insert(journeyScoreRows);

if (journeyScoresError) {
  console.error(
    "Unable to save consultation journey scores:",
    journeyScoresError
  );

  return {
    success: false,
    error: "Journey scores could not be saved.",
  };
}

console.log(
  "Fresh Customer 360 journey scores saved:",
  consultation.id
);
const primaryJourney =
  submission.journey.primaryJourneys[0] ?? null;

const secondaryJourney =
  submission.journey.primaryJourneys.length > 1
    ? submission.journey.primaryJourneys[1]
    : submission.journey.secondaryJourney;

const resultSummary = [
  `Result type: ${submission.journey.resultType}`,
  `Primary journeys: ${submission.journey.primaryJourneys.join(", ")}`,
  secondaryJourney
    ? `Secondary journey: ${secondaryJourney}`
    : null,
]
  .filter(Boolean)
  .join(". ");

const { error: resultError } = await supabaseAdmin
  .from("consultation_results")
  .insert({
    consultation_id: consultation.id,
    primary_journey: primaryJourney,
    secondary_journey: secondaryJourney,
    result_summary: resultSummary,
    recommendation_engine_version: "fresh-method-v1",
  });

if (resultError) {
  console.error(
    "Unable to save consultation result:",
    resultError
  );

  return {
    success: false,
    error: "Consultation result could not be saved.",
  };
}

console.log(
  "Fresh Customer 360 consultation result saved:",
  consultation.id
);

const { data: latestPlan } = await supabaseAdmin
  .from("skin_plans")
  .select("version")
  .eq("customer_id", customerId)
  .order("version", { ascending: false })
  .limit(1)
  .maybeSingle();

const nextPlanVersion = (latestPlan?.version ?? 0) + 1;
const { error: supersedeError } = await supabaseAdmin
  .from("skin_plans")
  .update({
    status: "superseded",
  })
  .eq("customer_id", customerId)
  .eq("status", "active");

if (supersedeError) {
  console.error(
    "Unable to supersede previous Skin Plan:",
    supersedeError
  );

  return {
    success: false,
    error: "Previous Skin Plan could not be superseded.",
  };
}
const { data: skinPlan, error: skinPlanError } = await supabaseAdmin
  .from("skin_plans")
  .insert({
    business_id: business.id,
    customer_id: customerId,
    consultation_id: consultation.id,
    version: nextPlanVersion,
    status: "active",
    primary_journey: primaryJourney,
    secondary_journey: secondaryJourney,
    plan_summary: resultSummary,
    recommendation_engine_version: "fresh-method-v1",
    activated_at: new Date().toISOString(),
  })
  .select("id, version")
  .single();

if (skinPlanError || !skinPlan) {
  console.error(
    "Unable to create Skin Plan:",
    skinPlanError
  );

  return {
    success: false,
    error: "Skin Plan could not be created.",
  };
}

console.log(
  `Fresh Customer 360 Skin Plan v${skinPlan.version} created:`,
  skinPlan.id
);
    return {
      success: true,
      businessId: business.id,
    };
  } catch (error) {
    console.error("Unable to save Skin Discovery submission:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unexpected Skin Discovery persistence error.",
    };
  }
}