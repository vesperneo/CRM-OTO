-- ============================================================
-- OTOCLIC CRM — Référentiel des sources de leads
-- Fichier: supabase/migrations/00007_lead_sources.sql
-- Idempotent : peut être rejoué sans dupliquer les sources.
-- ============================================================

INSERT INTO sources (id, nom, type) VALUES
  ('51111111-1111-4111-8111-111111111111', 'Facebook Ads',        'paid'),
  ('52222222-2222-4222-8222-222222222222', 'Instagram Ads',       'paid'),
  ('53333333-3333-4333-8333-333333333333', 'TikTok Ads',          'paid'),
  ('54444444-4444-4444-8444-444444444444', 'Google Ads',          'paid'),
  ('55555555-5555-4555-8555-555555555555', 'Formulaire site web', 'organic'),
  ('56666666-6666-4666-8666-666666666666', 'Spontané (showroom)', 'direct'),
  ('57777777-7777-4777-8777-777777777777', 'WhatsApp entrant',    'direct'),
  ('58888888-8888-4888-8888-888888888888', 'Appel entrant',       'direct'),
  ('59999999-9999-4999-8999-999999999999', 'Salon / Événement',   'event'),
  ('5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Recommandation',      'referral')
ON CONFLICT (nom) DO UPDATE
  SET type = EXCLUDED.type,
      actif = TRUE;

-- Anciens libellés remplacés par le nouveau référentiel
UPDATE sources
SET actif = FALSE
WHERE nom IN ('Meta Lead Ads', 'Site Web Otoclic', 'Salon Auto');
