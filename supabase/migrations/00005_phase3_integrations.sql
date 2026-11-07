-- ============================================================
-- OTOCLIC CRM — Phase 3
-- Supervision temps réel, WhatsApp Cloud API, téléphonie VoIP,
-- synchronisation Google Calendar.
-- Fichier: supabase/migrations/00005_phase3_integrations.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. Journal des messages sortants (WhatsApp / SMS / Email)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id             UUID REFERENCES leads(id) ON DELETE CASCADE,
  appointment_id      UUID REFERENCES appointments(id) ON DELETE SET NULL,
  canal               TEXT NOT NULL CHECK (canal IN ('whatsapp', 'sms', 'email')),
  destinataire        TEXT NOT NULL,
  template_nom        TEXT,
  contenu             TEXT NOT NULL,
  statut              TEXT NOT NULL DEFAULT 'queued'
                      CHECK (statut IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  provider            TEXT NOT NULL DEFAULT 'demo',
  provider_message_id TEXT,
  provider_data       JSONB NOT NULL DEFAULT '{}',
  erreur              TEXT,
  envoye_par          UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS message_logs_lead_idx ON message_logs (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS message_logs_statut_idx ON message_logs (statut, created_at DESC);

-- ------------------------------------------------------------
-- 2. Journal des événements téléphonie (VoIP / click-to-call)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telephony_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id          UUID REFERENCES leads(id) ON DELETE CASCADE,
  call_id          UUID REFERENCES calls(id) ON DELETE SET NULL,
  agent_id         UUID REFERENCES profiles(id),
  provider         TEXT NOT NULL DEFAULT 'tel-link',
  provider_call_id TEXT,
  event_type       TEXT NOT NULL,
  payload          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS telephony_events_lead_idx ON telephony_events (lead_id, created_at DESC);

-- ------------------------------------------------------------
-- 3. Paramètres d'intégration (clé/valeur)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_settings (
  cle         TEXT PRIMARY KEY,
  valeur      JSONB NOT NULL DEFAULT '{}',
  actif       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_message_logs_updated_at
  BEFORE UPDATE ON message_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_integration_settings_updated_at
  BEFORE UPDATE ON integration_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 4. RLS
-- ------------------------------------------------------------
ALTER TABLE message_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE telephony_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_logs_select" ON message_logs FOR SELECT
  USING (is_crc() OR is_admin());
CREATE POLICY "message_logs_insert" ON message_logs FOR INSERT
  WITH CHECK (is_crc() OR is_admin());
CREATE POLICY "message_logs_update" ON message_logs FOR UPDATE
  USING (is_crc() OR is_admin());
CREATE POLICY "message_logs_admin" ON message_logs FOR ALL
  USING (is_admin());

CREATE POLICY "telephony_events_select" ON telephony_events FOR SELECT
  USING (is_crc() OR is_admin());
CREATE POLICY "telephony_events_insert" ON telephony_events FOR INSERT
  WITH CHECK (is_crc() OR is_admin());

CREATE POLICY "integration_settings_admin" ON integration_settings FOR ALL
  USING (is_admin());

-- ------------------------------------------------------------
-- 5. Modèles de messages de confirmation
-- ------------------------------------------------------------
INSERT INTO message_templates (id, nom, canal, sujet, contenu, langue) VALUES
  (
    'aa111111-1111-1111-1111-111111111111',
    'Confirmation RDV J-1',
    'whatsapp',
    NULL,
    'Bonjour {{prenom}}, nous vous rappelons votre rendez-vous chez Otoclic {{site}} le {{date}} à {{heure}}. Merci de confirmer votre présence : {{lien_confirmation}}',
    'fr'
  ),
  (
    'aa222222-2222-2222-2222-222222222222',
    'Rappel RDV H-2',
    'whatsapp',
    NULL,
    'Bonjour {{prenom}}, votre rendez-vous chez Otoclic {{site}} est prévu aujourd''hui à {{heure}}. À très vite !',
    'fr'
  ),
  (
    'aa333333-3333-3333-3333-333333333333',
    'Relance prospect silencieux',
    'whatsapp',
    NULL,
    'Bonjour {{prenom}}, votre projet {{produit}} nous tient à cœur. Souhaitez-vous être rappelé par un conseiller Otoclic ?',
    'fr'
  )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 6. Realtime (si la publication Supabase existe)
-- ------------------------------------------------------------
DO $$
DECLARE
  v_table TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH v_table IN ARRAY ARRAY['agent_status', 'calls', 'appointments', 'leads', 'message_logs']
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = v_table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', v_table);
      END IF;
    END LOOP;
  END IF;
END;
$$;