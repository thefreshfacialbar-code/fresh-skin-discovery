/** Shared eligibility gate for Featured and More Fresh Picks. */
export type ActivationCandidate = {
  excluded?: boolean;
  recommendationEnabled?: boolean;
  experienceRecommendations?: Array<{
    experienceId: string;
    assigned: boolean;
    approvalStatus: string;
    enabled?: boolean;
  }>;
};

export function isRecommendationActive(
  product: ActivationCandidate,
  selectedExperience?: string,
): boolean {
  if (product.excluded === true || product.recommendationEnabled === false) return false;
  if (!selectedExperience) return true;
  const assignment = product.experienceRecommendations?.find(
    (item) => item.experienceId === selectedExperience,
  );
  return assignment?.assigned === true &&
    assignment.approvalStatus === "approved" &&
    assignment.enabled !== false;
}
