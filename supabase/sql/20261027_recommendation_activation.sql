-- Apply only after checking existing constraints and backing up the database.
-- Activation is separate from the approved configuration lifecycle.
ALTER TABLE public.product_recommendation_profiles
  ADD COLUMN IF NOT EXISTS recommendation_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.product_experience_recommendations
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;
-- Existing assignments retain their current status and are enabled by default.
-- This migration does not touch products.active, Shopify records or customer history.
