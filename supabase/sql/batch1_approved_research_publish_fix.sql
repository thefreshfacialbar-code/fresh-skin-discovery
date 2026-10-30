-- Batch 1: Approved Manufacturer Research Publication Fix
--
-- Purpose:
-- Allow approved Fresh Desk recommendation drafts to publish
-- revised manufacturer research without permitting ordinary
-- updates to overwrite previously approved research.
--
-- Requirements:
-- 1. Preserve previous approved research in an audit history.
-- 2. Keep the existing research protection trigger enabled.
-- 3. Restrict research replacement to authorized publication.
-- 4. Preserve atomic publication of research, recommendation
--    profiles, and experience assignments.
-- 5. Do not modify existing approved research during migration.
--
-- PostgreSQL version: 17.6
--
-- IMPORTANT:
-- This migration must be reviewed and tested before execution.
-- Preserve snapshots of manufacturer research before revision.
-- This table does not alter existing research records.
-- Apply all corrective changes atomically.
BEGIN;
CREATE TABLE IF NOT EXISTS public.product_vendor_research_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL,
  product_id uuid NOT NULL,
  previous_record jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  published_draft_id uuid NOT NULL
    REFERENCES public.product_recommendation_profile_drafts(id)
);
-- Restrict access to archived manufacturer research.

ALTER TABLE public.product_vendor_research_history
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.product_vendor_research_history
FROM PUBLIC, anon, authenticated, service_role;
-- Prevent duplicate archives for the same research record
-- during publication of a particular approved draft.

CREATE UNIQUE INDEX IF NOT EXISTS
  product_vendor_research_history_unique_publication
ON public.product_vendor_research_history
  (research_id, published_draft_id);
CREATE OR REPLACE FUNCTION public.publish_product_recommendation_draft(p_draft_id uuid)

RETURNS public.product_recommendation_profile_drafts

LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$

DECLARE
   
d public.product_recommendation_profile_drafts%ROWTYPE;

  s jsonb;

  assignments jsonb;

  a jsonb;

  rules jsonb;

  research jsonb;
  existing_research public.product_vendor_research%ROWTYPE;
  published_time timestamptz := now();

  updated_count integer;
  v_product_id uuid;

BEGIN

  -- Establish the product identity before acquiring the per-product lock.
  SELECT product_id INTO v_product_id
  FROM public.product_recommendation_profile_drafts
  WHERE id = p_draft_id;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Recommendation draft not found';
  END IF;

  -- Serialize all publications for the same product through this function.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_product_id::text, 0)
  );

  -- Re-read and lock the draft after waiting for any other publication.
  SELECT * INTO d FROM public.product_recommendation_profile_drafts
    WHERE id = p_draft_id FOR UPDATE;

  IF NOT FOUND OR d.product_id IS DISTINCT FROM v_product_id
    OR d.review_status <> 'approved' OR d.published_at IS NOT NULL THEN

    RAISE EXCEPTION 'Only an approved, unpublished draft may be published';

  END IF;

  IF d.reviewed_at IS NULL THEN
    RAISE EXCEPTION 'Approved draft has no review timestamp';
  END IF;

  -- Refuse to overwrite a configuration published after this draft's
  -- approval, or one from a more recently approved draft. Ties are rejected.
  IF EXISTS (
    SELECT 1
    FROM public.product_recommendation_profile_drafts other
    WHERE other.product_id = d.product_id
      AND other.id <> d.id
      AND other.published_at IS NOT NULL
      AND (
        other.published_at >= d.reviewed_at
        OR other.reviewed_at >= d.reviewed_at
      )
  ) THEN
    RAISE EXCEPTION 'Stale approved draft: a newer configuration has been published';
  END IF;

  s := d.proposed_settings;

  IF jsonb_typeof(s) IS DISTINCT FROM 'object' THEN

    RAISE EXCEPTION 'Invalid product configuration';

  END IF;

  IF s->>'product_category' IS NULL OR s->>'primary_journey' IS NULL

     OR s->>'recommendation_role' IS NULL OR s->>'intensity' IS NULL

     OR jsonb_typeof(s->'intensity') <> 'number'

     OR (s->>'intensity')::integer NOT BETWEEN 1 AND 4 THEN

    RAISE EXCEPTION 'Missing or invalid Fresh Method settings';

  END IF;

  IF s ? 'featured_eligible' AND jsonb_typeof(s->'featured_eligible') <> 'boolean' THEN

    RAISE EXCEPTION 'Invalid featured eligibility';

  END IF;

  IF s ? 'eligibility_rules' THEN

    rules := s->'eligibility_rules';

    IF jsonb_typeof(rules) <> 'object'

       OR rules->'version' IS DISTINCT FROM '1'::jsonb

       OR rules->>'policy' NOT IN ('none','renew_targeted','renew_quench_hydration')

       OR (SELECT count(*) FROM jsonb_object_keys(rules)) <> 2 THEN

      RAISE EXCEPTION 'Invalid eligibility rules';

    END IF;

  END IF;

  IF s ? 'experience_assignments' THEN

    assignments := s->'experience_assignments';

    IF jsonb_typeof(assignments) <> 'array' OR jsonb_array_length(assignments) <> 2

       OR (SELECT count(DISTINCT x->>'experience_id') FROM jsonb_array_elements(assignments) x) <> 2 THEN

      RAISE EXCEPTION 'Exactly two distinct experience assignments required';

    END IF;

    FOR a IN SELECT value FROM jsonb_array_elements(assignments) LOOP

      IF a->>'experience_id' NOT IN ('fresh-facial-bar-lash-lounge','gentlemens-corner')

         OR jsonb_typeof(a->'assigned') <> 'boolean'

         OR jsonb_typeof(a->'recommendation_priority') <> 'number'

         OR (a->>'recommendation_priority')::numeric <> trunc((a->>'recommendation_priority')::numeric)

         OR (a->>'recommendation_priority')::integer NOT BETWEEN 0 AND 10000 THEN

        RAISE EXCEPTION 'Invalid experience assignment';

      END IF;

    END LOOP;

  END IF;



  -- Research is part of the same approved snapshot; never publish from a separate review action.

  IF s ? 'manufacturer_research' THEN

    research := s->'manufacturer_research';

    IF jsonb_typeof(research) <> 'object' OR

      EXISTS (SELECT 1 FROM jsonb_object_keys(research) k

        WHERE k NOT IN ('research_source', 'vendor_product_name', 'vendor_product_id', 'vendor_product_url', 'vendor_category', 'vendor_description', 'professional_description', 'key_ingredients', 'skin_benefits', 'suitable_skin_types', 'skin_concerns', 'application_instructions', 'usage_frequency', 'precautions', 'routine_step', 'internal_notes', 'primary_journey', 'supporting_journey', 'recommendation_role', 'intensity', 'skin_benefit_codes', 'suitable_skin_type_codes', 'skin_concern_codes', 'application_timing')) THEN

      RAISE EXCEPTION 'Invalid manufacturer research configuration';

    END IF;

    -- Manual research and staged lookup must also work for products with no

    -- previously published research row. Lock any existing row, then create one

    -- if absent; all writes remain in this publishing transaction.

     SELECT *
    INTO existing_research
    FROM public.product_vendor_research
    WHERE product_id = d.product_id
    FOR UPDATE;
    IF NOT FOUND THEN

      INSERT INTO public.product_vendor_research

        (product_id, research_source, research_status)

      VALUES (d.product_id, COALESCE(NULLIF(research->>'research_source', ''), 'manual'), 'draft');

    END IF;
    -- Preserve the previously approved research before revision.
    -- Both archival and publication must succeed or roll back together.
    IF existing_research.id IS NOT NULL
       AND existing_research.research_status = 'approved' THEN

      INSERT INTO public.product_vendor_research_history (
        research_id,
        product_id,
        previous_record,
        published_draft_id
      )
      VALUES (
        existing_research.id,
        d.product_id,
        to_jsonb(existing_research),
        d.id
      );

    END IF;
    -- Identify the approved draft for the protection trigger.
    -- This is transaction-local and will be validated by the trigger.
    PERFORM pg_catalog.set_config(
      'app.research_publishing_draft',
      d.id::text,
      true
    );
    UPDATE public.product_vendor_research r SET

      research_source = CASE WHEN research ? 'research_source' THEN research->>'research_source' ELSE r.research_source END,

      vendor_product_name = CASE WHEN research ? 'vendor_product_name' THEN research->>'vendor_product_name' ELSE r.vendor_product_name END,

      vendor_product_id = CASE WHEN research ? 'vendor_product_id' THEN research->>'vendor_product_id' ELSE r.vendor_product_id END,

      vendor_product_url = CASE WHEN research ? 'vendor_product_url' THEN research->>'vendor_product_url' ELSE r.vendor_product_url END,

      vendor_category = CASE WHEN research ? 'vendor_category' THEN research->>'vendor_category' ELSE r.vendor_category END,

      vendor_description = CASE WHEN research ? 'vendor_description' THEN research->>'vendor_description' ELSE r.vendor_description END,

      professional_description = CASE WHEN research ? 'professional_description' THEN research->>'professional_description' ELSE r.professional_description END,

      key_ingredients = CASE WHEN research ? 'key_ingredients' THEN research->>'key_ingredients' ELSE r.key_ingredients END,

      skin_benefits = CASE WHEN research ? 'skin_benefits' THEN research->>'skin_benefits' ELSE r.skin_benefits END,

      suitable_skin_types = CASE WHEN research ? 'suitable_skin_types' THEN research->>'suitable_skin_types' ELSE r.suitable_skin_types END,

      skin_concerns = CASE WHEN research ? 'skin_concerns' THEN research->>'skin_concerns' ELSE r.skin_concerns END,

      application_instructions = CASE WHEN research ? 'application_instructions' THEN research->>'application_instructions' ELSE r.application_instructions END,

      usage_frequency = CASE WHEN research ? 'usage_frequency' THEN research->>'usage_frequency' ELSE r.usage_frequency END,

      precautions = CASE WHEN research ? 'precautions' THEN research->>'precautions' ELSE r.precautions END,

      routine_step = CASE WHEN research ? 'routine_step' THEN research->>'routine_step' ELSE r.routine_step END,

      internal_notes = CASE WHEN research ? 'internal_notes' THEN research->>'internal_notes' ELSE r.internal_notes END,

      primary_journey = CASE WHEN research ? 'primary_journey' THEN research->>'primary_journey' ELSE r.primary_journey END,

      supporting_journey = CASE WHEN research ? 'supporting_journey' THEN research->>'supporting_journey' ELSE r.supporting_journey END,

      recommendation_role = CASE WHEN research ? 'recommendation_role' THEN research->>'recommendation_role' ELSE r.recommendation_role END,

      intensity = CASE WHEN research ? 'intensity' THEN (research->>'intensity')::integer ELSE r.intensity END,

      skin_benefit_codes = CASE WHEN research ? 'skin_benefit_codes' THEN research->'skin_benefit_codes' ELSE r.skin_benefit_codes END,

      suitable_skin_type_codes = CASE WHEN research ? 'suitable_skin_type_codes' THEN research->'suitable_skin_type_codes' ELSE r.suitable_skin_type_codes END,

      skin_concern_codes = CASE WHEN research ? 'skin_concern_codes' THEN research->'skin_concern_codes' ELSE r.skin_concern_codes END,

      application_timing = CASE WHEN research ? 'application_timing' THEN research->'application_timing' ELSE r.application_timing END,



      research_status = 'approved',

      reviewed_at = published_time,

      updated_at = published_time


    WHERE r.product_id = d.product_id;

    -- Capture the UPDATE count immediately.
    GET DIAGNOSTICS updated_count = ROW_COUNT;

    -- Clear the publication context.
    PERFORM pg_catalog.set_config(
      'app.research_publishing_draft',
      '',
      true
    );

    IF updated_count <> 1 THEN

      RAISE EXCEPTION 'Manufacturer research record missing or duplicated';

    END IF;

  END IF;



  UPDATE public.product_recommendation_profiles SET

    product_category = s->>'product_category',

    primary_journey = s->>'primary_journey',

    supporting_journey = s->>'supporting_journey',

    recommendation_role = s->>'recommendation_role',

    intensity = (s->>'intensity')::integer,

    eligibility_rules = CASE WHEN s ? 'eligibility_rules' THEN rules ELSE eligibility_rules END,

    featured_eligible = CASE WHEN s ? 'featured_eligible'

      THEN (s->>'featured_eligible')::boolean ELSE featured_eligible END,

    updated_at = published_time

  WHERE id = d.profile_id AND product_id = d.product_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count <> 1 THEN RAISE EXCEPTION 'Matching profile not found'; END IF;



  IF assignments IS NOT NULL THEN

    FOR a IN SELECT value FROM jsonb_array_elements(assignments) LOOP

      INSERT INTO public.product_experience_recommendations

        (product_id, experience_id, assigned, approval_status, recommendation_priority, reviewed_at, updated_at)

      VALUES

        (d.product_id, a->>'experience_id', (a->>'assigned')::boolean,

         'approved', (a->>'recommendation_priority')::integer, published_time, published_time)

      ON CONFLICT (product_id, experience_id) DO UPDATE SET

        assigned = EXCLUDED.assigned,

        approval_status = EXCLUDED.approval_status,

        recommendation_priority = EXCLUDED.recommendation_priority,

        reviewed_at = EXCLUDED.reviewed_at,

        updated_at = EXCLUDED.updated_at;

    END LOOP;

    UPDATE public.product_recommendation_profiles SET

     experience_ids = ARRAY(
  SELECT assignment_item->>'experience_id'
  FROM jsonb_array_elements(assignments) AS assignment_item
  WHERE (assignment_item->>'assigned')::boolean
), updated_at = published_time

    WHERE id = d.profile_id AND product_id = d.product_id;

  END IF;



  UPDATE public.product_recommendation_profile_drafts SET

    published_at = published_time, updated_at = published_time

  WHERE id = p_draft_id RETURNING * INTO d;

  RETURN d;

END $$;

-- Explicitly preserve service-role-only execution on fresh and existing installs.
REVOKE ALL ON FUNCTION public.review_product_recommendation_draft(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_product_recommendation_draft(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_product_recommendation_draft(uuid, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_product_recommendation_draft(uuid)
  TO service_role;
-- Preserve protection of approved research while permitting
-- publication through the privileged, validated publishing function.
CREATE OR REPLACE FUNCTION public.protect_approved_vendor_research()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_draft_id uuid;
BEGIN
  IF OLD.research_status = 'approved' THEN

    -- The publication context alone does not authorize an update.
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION
        'Approved manufacturer research cannot be overwritten.';
    END IF;

    v_draft_id := NULLIF(
      pg_catalog.current_setting(
        'app.research_publishing_draft',
        true
      ),
      ''
    )::uuid;

    IF v_draft_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.product_recommendation_profile_drafts d
      WHERE d.id = v_draft_id
        AND d.product_id = OLD.product_id
        AND d.review_status = 'approved'
        AND d.reviewed_at IS NOT NULL
        AND d.published_at IS NULL
    ) THEN
      RAISE EXCEPTION
        'Approved manufacturer research requires an authorized publication.';
    END IF;

    -- Require the previous approved version to be archived.
    IF NOT EXISTS (
      SELECT 1
      FROM public.product_vendor_research_history h
      WHERE h.research_id = OLD.id
        AND h.product_id = OLD.product_id
        AND h.published_draft_id = v_draft_id
        AND h.previous_record = to_jsonb(OLD)
    ) THEN
      RAISE EXCEPTION
        'Approved manufacturer research must be archived before publication.';
    END IF;

    IF NEW.product_id IS DISTINCT FROM OLD.product_id
       OR NEW.research_status IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION
        'Approved manufacturer research identity and status must be preserved.';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_approved_vendor_research_trigger
ON public.product_vendor_research;

CREATE TRIGGER protect_approved_vendor_research_trigger
BEFORE UPDATE ON public.product_vendor_research
FOR EACH ROW
EXECUTE FUNCTION public.protect_approved_vendor_research();
COMMIT;
