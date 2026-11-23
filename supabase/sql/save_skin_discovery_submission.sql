BEGIN;
CREATE OR REPLACE FUNCTION public.save_skin_discovery_submission(
  p_submission jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_submission_id text;
  v_business_id uuid;
  v_customer_id uuid;
  v_location_id uuid;
  v_consultation_id uuid;
  v_skin_plan_id uuid;
  v_existing_consultation_id uuid;
  v_existing_plan_id uuid;
  v_next_version integer;
  v_email text;
  v_primary_journey text;
  v_secondary_journey text;
  v_result_summary text;
  v_journey_record record;
  v_journey_rank integer := 0;
  v_journey_role text;
  v_product_record record;
  v_product_id uuid;
  v_product_name text;
  v_product_brand text;
  v_product_price numeric;
  v_product_guidance text;
  v_product_usage_type text;
  v_product_timing text[];
  v_product_frequency text;
  v_product_order integer := 0;
  v_product_count integer := 0;
BEGIN
  v_submission_id := NULLIF(
    BTRIM(p_submission->>'submissionId'),
    ''
  );

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'Skin Discovery submissionId is required';
  END IF;

  -- Resolve the Fresh Facial Bar business.
  SELECT id
  INTO v_business_id
  FROM public.businesses
  WHERE name = 'Fresh Facial Bar';

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Fresh Facial Bar business could not be found';
  END IF;

  -- Transactional persistence will be added in the next steps.
  -- Normalize and validate the customer's email.
  v_email := LOWER(BTRIM(p_submission #>> '{guest,email}'));

  IF NULLIF(v_email, '') IS NULL THEN
    RAISE EXCEPTION 'Skin Discovery customer email is required';
  END IF;
  -- Require a submission timestamp.
  IF NULLIF(BTRIM(p_submission->>'createdAt'), '') IS NULL THEN
    RAISE EXCEPTION 'Skin Discovery createdAt is required';
  END IF;
  -- Serialize retries of the same submission.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_submission_id, 0)
  );

  -- Check for an existing submission.
  SELECT id INTO v_existing_consultation_id
  FROM public.consultations
  WHERE business_id = v_business_id
    AND submission_id = v_submission_id;

  IF v_existing_consultation_id IS NOT NULL THEN
    SELECT id INTO v_existing_plan_id
    FROM public.skin_plans
    WHERE consultation_id = v_existing_consultation_id
    ORDER BY version DESC
    LIMIT 1;

    IF v_existing_plan_id IS NULL THEN
      RAISE EXCEPTION 'Existing submission has no Skin Plan';
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'alreadyProcessed', true,
      'businessId', v_business_id,
      'consultationId', v_existing_consultation_id,
      'skinPlanId', v_existing_plan_id
    );
  END IF;

  -- Resolve an existing customer by normalized email.
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE business_id = v_business_id
    AND LOWER(BTRIM(email)) = v_email;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (
      business_id, first_name, last_name, email, mobile_phone, active
    ) VALUES (
      v_business_id,
      BTRIM(p_submission #>> '{guest,firstName}'),
      BTRIM(p_submission #>> '{guest,lastName}'),
      v_email,
      NULLIF(BTRIM(p_submission #>> '{guest,phone}'), ''),
      true
    )
    ON CONFLICT (business_id, (LOWER(BTRIM(email))))
      WHERE NULLIF(BTRIM(email), '') IS NOT NULL
    DO UPDATE SET email = EXCLUDED.email
    RETURNING id INTO v_customer_id;
  END IF;

  -- Recover the customer ID if a concurrent insert won.
  IF v_customer_id IS NULL THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE business_id = v_business_id
      AND LOWER(BTRIM(email)) = v_email;
  END IF;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Fresh 360 customer could not be resolved';
  END IF;
  -- Require a submission timestamp.
  IF NULLIF(BTRIM(p_submission->>'createdAt'), '') IS NULL THEN
    RAISE EXCEPTION 'Skin Discovery createdAt is required';
  END IF;
  -- Serialize Skin Plan creation for this customer.
  PERFORM 1
  FROM public.customers
  WHERE id = v_customer_id
    AND business_id = v_business_id
  FOR UPDATE;

  -- Resolve the active Fresh Facial Bar location.
  SELECT id INTO v_location_id
  FROM public.locations
  WHERE business_id = v_business_id
    AND active = true
  LIMIT 1;

  -- Create the consultation for this submission.
  INSERT INTO public.consultations (
    submission_id, business_id, customer_id, location_id,
    questionnaire_version, status, consultation_source,
    experience_id, started_at, completed_at
  ) VALUES (
    v_submission_id, v_business_id, v_customer_id, v_location_id,
    COALESCE(NULLIF(p_submission->>'experience', ''), 'skin-discovery'),
    'completed', 'web',
    NULLIF(p_submission->>'experience', ''),
    (p_submission->>'createdAt')::timestamptz,
    (p_submission->>'createdAt')::timestamptz
  )
  RETURNING id INTO v_consultation_id;

  -- Save the three Skin Discovery questionnaire answers.
  INSERT INTO public.consultation_answers (
    consultation_id, question_key, question_text,
    answer_key, answer_text, answer_keys
  ) VALUES (
    v_consultation_id, 'primary_motivation', 'Primary Motivation',
    p_submission #>> '{discovery,primaryMotivation}',
    p_submission #>> '{discovery,primaryMotivation}',
    ARRAY[]::text[]
  );

  -- Save Skin Experience selections.
  INSERT INTO public.consultation_answers (
    consultation_id, question_key, question_text, answer_keys
  ) VALUES (
    v_consultation_id, 'skin_experience', 'Skin Experience',
    ARRAY(SELECT jsonb_array_elements_text(
      COALESCE(p_submission #> '{discovery,skinExperience}', '[]'::jsonb)
    ))
  );

  -- Save Desired Outcomes selections.
  INSERT INTO public.consultation_answers (
    consultation_id, question_key, question_text, answer_keys
  ) VALUES (
    v_consultation_id, 'desired_outcomes', 'Desired Outcomes',
    ARRAY(SELECT jsonb_array_elements_text(
      COALESCE(p_submission #> '{discovery,desiredOutcomes}', '[]'::jsonb)
    ))
  );

  -- Save Fresh Method journey scores.
  FOR v_journey_record IN
    SELECT key AS journey, value::numeric AS score
    FROM jsonb_each_text(p_submission #> '{journey,scores}')
    ORDER BY value::numeric DESC, key
  LOOP
    v_journey_rank := v_journey_rank + 1;
    v_journey_role := 'supporting';
    IF COALESCE(
  (p_submission #> '{journey,primaryJourneys}')
    ? v_journey_record.journey,
  false
) THEN
      v_journey_role := 'primary';
    ELSIF p_submission #>> '{journey,secondaryJourney}'
          = v_journey_record.journey THEN
      v_journey_role := 'secondary';
    END IF;

    INSERT INTO public.consultation_journey_scores (
      consultation_id, journey, score, rank, role
    ) VALUES (
      v_consultation_id, v_journey_record.journey,
      v_journey_record.score, v_journey_rank, v_journey_role
    );
  END LOOP;

  -- Resolve the primary Fresh Method journey.
  v_primary_journey := p_submission #>> '{journey,primaryJourneys,0}';

  IF v_primary_journey IS NULL THEN
    RAISE EXCEPTION 'Primary Fresh Method journey is required';
  END IF;

  -- Resolve the secondary Fresh Method journey.
  v_secondary_journey := COALESCE(
    p_submission #>> '{journey,primaryJourneys,1}',
    p_submission #>> '{journey,secondaryJourney}'
  );
  -- Prevent duplicate primary and secondary journeys.
  IF v_secondary_journey = v_primary_journey THEN
    v_secondary_journey := NULL;
  END IF;
  -- Build the Fresh Method result summary.
  v_result_summary := 'Result type: ' ||
    COALESCE(p_submission #>> '{journey,resultType}', '') ||
    '. Primary journeys: ' ||
    COALESCE((
      SELECT string_agg(value, ', ' ORDER BY ord)
      FROM jsonb_array_elements_text(
        p_submission #> '{journey,primaryJourneys}'
      ) WITH ORDINALITY AS j(value, ord)
    ), '');

  -- Include the secondary journey when present.
  IF v_secondary_journey IS NOT NULL THEN
    v_result_summary := v_result_summary ||
      '. Secondary journey: ' || v_secondary_journey;
  END IF;

  -- Save the Fresh Method consultation result.
  INSERT INTO public.consultation_results (
    consultation_id, primary_journey, secondary_journey,
    result_summary, recommendation_engine_version
  ) VALUES (
    v_consultation_id, v_primary_journey, v_secondary_journey,
    v_result_summary, 'fresh-method-v1'
  );

  -- Calculate the next Skin Plan version.
  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_next_version
  FROM public.skin_plans
  WHERE customer_id = v_customer_id;

  -- Supersede the previous active Skin Plan.
  UPDATE public.skin_plans
  SET status = 'superseded',
      superseded_at = NOW()
  WHERE customer_id = v_customer_id
    AND status = 'active';

  -- Create the new active Skin Plan.
  INSERT INTO public.skin_plans (
    business_id, customer_id, consultation_id, version,
    status, primary_journey, secondary_journey,
    plan_summary, recommendation_engine_version, activated_at
  ) VALUES (
    v_business_id, v_customer_id, v_consultation_id, v_next_version,
    'active', v_primary_journey, v_secondary_journey,
    v_result_summary, 'fresh-method-v1', NOW()
  )
  RETURNING id INTO v_skin_plan_id;

  -- Build the ordered product recommendation list.
  FOR v_product_record IN
    SELECT routine_step, fresh_product_id
    FROM (
      VALUES
        (1, 'cleanse', p_submission #>> '{productRecommendations,featured,cleanse}'),
        (2, 'treat', p_submission #>> '{productRecommendations,featured,treat}'),
        (3, 'moisturize', p_submission #>> '{productRecommendations,featured,moisturize}'),
        (4, 'protect', p_submission #>> '{productRecommendations,featured,protect}')
    ) AS products(position, routine_step, fresh_product_id)
    WHERE NULLIF(fresh_product_id, '') IS NOT NULL
    ORDER BY position
  LOOP
    v_product_order := v_product_order + 1;
    -- Match the recommendation to the product catalog.
    v_product_id := NULL;
    SELECT id INTO v_product_id
    FROM public.products
    WHERE business_id = v_business_id
      AND fresh_product_id = v_product_record.fresh_product_id;

    -- Load the recommended product snapshot.
    SELECT name, brand, price
    INTO v_product_name, v_product_brand, v_product_price
    FROM public.products
    WHERE id = v_product_id;

    -- Load product recommendation guidance.
    v_product_guidance := NULL;
    v_product_usage_type := NULL;
    v_product_timing := NULL;
    v_product_frequency := NULL;

    SELECT customer_guidance, usage_type, timing, frequency
    INTO v_product_guidance, v_product_usage_type,
         v_product_timing, v_product_frequency
    FROM public.product_recommendation_profiles
    WHERE product_id = v_product_id
    LIMIT 1;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Recommended product not found: %',
        v_product_record.fresh_product_id;
    END IF;

    INSERT INTO public.skin_plan_products (
      skin_plan_id, product_id, routine_step, routine_order,
      recommendation_reason, customer_guidance, usage_type,
      timing, frequency, product_name_snapshot,
      brand_snapshot, price_snapshot, status
    ) VALUES (
      v_skin_plan_id, v_product_id,
      v_product_record.routine_step, v_product_order,
      NULL, v_product_guidance, v_product_usage_type,
      v_product_timing, v_product_frequency,
      v_product_name, v_product_brand, v_product_price,
      'recommended'
    );

  END LOOP;

  -- Process additional Fresh Picks in their original order.
  FOR v_product_record IN
    SELECT 'fresh-pick'::text AS routine_step,
           value AS fresh_product_id
    FROM jsonb_array_elements_text(
      COALESCE(p_submission #> '{productRecommendations,moreFreshPicks}',
               '[]'::jsonb)
    ) WITH ORDINALITY AS picks(value, position)
    WHERE NULLIF(value, '') IS NOT NULL
    ORDER BY position
  LOOP
    v_product_order := v_product_order + 1;
    -- Match this Fresh Pick to the product catalog.
    v_product_id := NULL;
    SELECT id INTO v_product_id
    FROM public.products
    WHERE business_id = v_business_id
      AND fresh_product_id = v_product_record.fresh_product_id;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Fresh Pick product not found: %',
        v_product_record.fresh_product_id;
    END IF;

    -- Load this Fresh Pick's product snapshot.
    SELECT name, brand, price
    INTO v_product_name, v_product_brand, v_product_price
    FROM public.products
    WHERE id = v_product_id;

    -- Reset guidance before loading this Fresh Pick.
    v_product_guidance := NULL;
    v_product_usage_type := NULL;
    v_product_timing := NULL;
    v_product_frequency := NULL;

    SELECT customer_guidance, usage_type, timing, frequency
    INTO v_product_guidance, v_product_usage_type,
         v_product_timing, v_product_frequency
    FROM public.product_recommendation_profiles
    WHERE product_id = v_product_id
    LIMIT 1;

    INSERT INTO public.skin_plan_products (
      skin_plan_id, product_id, routine_step, routine_order,
      customer_guidance, usage_type, timing, frequency,
      product_name_snapshot, brand_snapshot, price_snapshot, status
    ) VALUES (
      v_skin_plan_id, v_product_id, 'fresh-pick', v_product_order,
      v_product_guidance, v_product_usage_type,
      v_product_timing, v_product_frequency,
      v_product_name, v_product_brand, v_product_price, 'recommended'
    );
  END LOOP;


  -- Process recommended enhancements.
  FOR v_product_record IN
    SELECT * FROM (
      SELECT DISTINCT ON (value->>'id')
           value->>'id' AS enhancement_id,
           value->>'name' AS enhancement_name,
           value->>'guestBenefit' AS guest_benefit,
           position AS recommendation_order
    FROM jsonb_array_elements(
      COALESCE(
        p_submission->'enhancementDetails',
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', value,
              'name', value,
              'guestBenefit', NULL
            ) ORDER BY position
          )
          FROM jsonb_array_elements_text(
            COALESCE(
              p_submission->'enhancementRecommendations',
              '[]'::jsonb
            )
          ) WITH ORDINALITY AS old_items(value, position)
        ),
        '[]'::jsonb
      )
    ) WITH ORDINALITY AS items(value, position)
    ORDER BY value->>'id', position
    ) AS unique_enhancements
    ORDER BY recommendation_order
  LOOP
    INSERT INTO public.skin_plan_enhancements (
      skin_plan_id,
      enhancement_id,
      enhancement_name_snapshot,
      recommendation_order,
      recommendation_reason,
      customer_guidance,
      status
    ) VALUES (
      v_skin_plan_id,
      v_product_record.enhancement_id,
      v_product_record.enhancement_name,
      v_product_record.recommendation_order,
      NULL,
      v_product_record.guest_benefit,
      'suggested'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'alreadyProcessed', false,
    'businessId', v_business_id,
    'customerId', v_customer_id,
    'consultationId', v_consultation_id,
    'skinPlanId', v_skin_plan_id,
    'skinPlanVersion', v_next_version
  );
END;
$$;
REVOKE ALL ON FUNCTION public.save_skin_discovery_submission(jsonb)
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.save_skin_discovery_submission(jsonb)
FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.save_skin_discovery_submission(jsonb)
TO service_role;

COMMIT;
