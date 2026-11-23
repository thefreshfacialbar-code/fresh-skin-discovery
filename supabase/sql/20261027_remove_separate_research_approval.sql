-- Phase 1: remove redundant manufacturer research approval dependency.
-- Review and publish still require an approved recommendation draft.
-- Does NOT yet implement unified research/experience publication.
-- Run only after confirming the corresponding API patch is deployed.
BEGIN;
CREATE OR REPLACE FUNCTION public.review_product_recommendation_draft(
  p_draft_id uuid, p_decision text, p_review_notes text DEFAULT NULL
)
RETURNS TABLE(draft_id uuid, review_status text, reviewed_at timestamptz)
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_draft public.product_recommendation_profile_drafts%ROWTYPE;
  v_reviewed_at timestamptz := now();
BEGIN
  IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Invalid review decision';
  END IF;
  IF p_decision = 'rejected' AND nullif(btrim(p_review_notes), '') IS NULL THEN
    RAISE EXCEPTION 'Review notes are required for rejection';
  END IF;
  SELECT * INTO v_draft FROM public.product_recommendation_profile_drafts
    WHERE id = p_draft_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recommendation draft not found'; END IF;
  IF v_draft.review_status <> 'pending_review' THEN
    RAISE EXCEPTION 'Recommendation draft is not pending review';
  END IF;
  UPDATE public.product_recommendation_profile_drafts d SET
    review_status = p_decision,
    review_notes = nullif(btrim(p_review_notes), ''),
    reviewed_at = v_reviewed_at,
    updated_at = v_reviewed_at
  WHERE d.id = p_draft_id;
  RETURN QUERY SELECT d.id, d.review_status, d.reviewed_at
    FROM public.product_recommendation_profile_drafts d WHERE d.id = p_draft_id;
END;
$function$;
COMMIT;
