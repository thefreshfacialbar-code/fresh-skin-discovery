import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRecommendationActive } from './productActivationPolicy.ts';
const ffb = 'fresh-facial-bar-lash-lounge';
const cgc = 'gentlemens-corner';
const product = (overrides = {}) => ({
  recommendationEnabled: true,
  experienceRecommendations: [
    { experienceId: ffb, assigned: true, approvalStatus: 'approved', enabled: true },
    { experienceId: cgc, assigned: true, approvalStatus: 'approved', enabled: true },
  ], ...overrides,
});
test('globally disabled is blocked for both experiences', () => {
  for (const experience of [ffb, cgc]) assert.equal(isRecommendationActive(product({ recommendationEnabled: false }), experience), false);
});
test('per-experience disable is isolated', () => {
  const p = product(); p.experienceRecommendations[1].enabled = false;
  assert.equal(isRecommendationActive(p, ffb), true);
  assert.equal(isRecommendationActive(p, cgc), false);
});
test('unapproved, unassigned, and missing assignments are blocked', () => {
  for (const patch of [{ approvalStatus: 'pending' }, { assigned: false }, { enabled: false }]) {
    const p = product(); Object.assign(p.experienceRecommendations[0], patch);
    assert.equal(isRecommendationActive(p, ffb), false);
  }
  assert.equal(isRecommendationActive(product({ experienceRecommendations: [] }), ffb), false);
});
test('excluded products remain blocked and re-enable restores eligibility', () => {
  assert.equal(isRecommendationActive(product({ excluded: true }), ffb), false);
  assert.equal(isRecommendationActive(product(), ffb), true);
});
