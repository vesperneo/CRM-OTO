-- ============================================================
-- OTOCLIC CRM — Phase 4
-- Analytique, exports, conformité CNDP / RGPD
-- Fichier: supabase/migrations/00006_phase4_analytics_compliance.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. Demandes de droits (CNDP / RGPD)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_requests (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id            UUID REFERENCES leads(id) ON DELETE SET NULL,
  type               TEXT NOT NULL
                     CHECK (type IN ('acces', 'rectification', 'effacement', 'opposition')),
  statut             TEXT NOT NULL DEFAULT 'nouvelle'
                     CHECK (statut IN ('nouvelle', 'en_cours', 'traitee', 'refusee')),
  demandeur_nom      TEXT NOT NULL,
  demandeur_contact  TEXT NOT NULL,
  motif              TEXT,
  reponse            TEXT,
  traite_par         UUID REFERENCES profiles(id),
  traite_le          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS data_requests_statut_idx ON data_requests (statut, created_at DESC);

CREATE TRIGGER trg_data_requests_updated_at
  BEFORE UPDATE ON data_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_requests_admin" ON data_requests FOR ALL USING (is_admin());
CREATE POLICY "data_requests_sup_select" ON data_requests FOR SELECT USING (is_sup_crc());

-- ------------------------------------------------------------
-- 2. Anonymisation d'un lead (droit à l'effacement)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION anonymiser_lead(p_lead_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suffix TEXT;
BEGIN
  IF NOT (is_admin() OR is_sup_crc()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  v_suffix := replace(p_lead_id::TEXT, '-', '');

  UPDATE leads
    SET nom                  = 'Contact anonymisé',
        prenom               = NULL,
        telephone            = 'ANON-' || v_suffix,
        telephone_normalise  = 'ANON-' || v_suffix,
        whatsapp             = NULL,
        email                = NULL,
        ville                = NULL,
        besoin_details       = NULL,
        notes                = NULL,
        consentement_contact = FALSE,
        statut               = 'perdu',
        perdu_raison         = 'Anonymisation CNDP / RGPD',
        verrouille_par       = NULL,
        verrouille_jusqu_a   = NULL
    WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE activities
    SET contenu = jsonb_build_object('anonymise', TRUE)
    WHERE lead_id = p_lead_id;

  UPDATE calls
    SET notes = NULL, enregistrement_url = NULL
    WHERE lead_id = p_lead_id;

  UPDATE appointments
    SET notes_crc = NULL, notes_commercial = NULL
    WHERE lead_id = p_lead_id;

  DELETE FROM message_logs WHERE lead_id = p_lead_id;
  DELETE FROM qualification_answers WHERE lead_id = p_lead_id;

  INSERT INTO activities (lead_id, type, contenu, auteur_id)
  VALUES (
    p_lead_id,
    'systeme',
    jsonb_build_object(
      'action', 'anonymisation',
      'texte', 'Données personnelles effacées suite à une demande CNDP / RGPD'
    ),
    auth.uid()
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION anonymiser_lead(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anonymiser_lead(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 3. Vues analytiques (security_invoker = RLS conservée)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_leads_funnel
WITH (security_invoker = TRUE) AS
SELECT
  statut,
  COUNT(*)                                            AS total,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS trente_jours
FROM leads
GROUP BY statut;

CREATE OR REPLACE VIEW v_leads_daily
WITH (security_invoker = TRUE) AS
SELECT
  date_trunc('day', created_at)::DATE AS jour,
  COUNT(*)                            AS total
FROM leads
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY 1
ORDER BY 1;

CREATE OR REPLACE VIEW v_calls_daily
WITH (security_invoker = TRUE) AS
SELECT
  date_trunc('day', debut)::DATE AS jour,
  COUNT(*)                       AS appels,
  COALESCE(ROUND(AVG(duree_secondes)), 0) AS duree_moyenne,
  COUNT(DISTINCT agent_id)       AS agents_actifs
FROM calls
WHERE debut >= NOW() - INTERVAL '90 days'
GROUP BY 1
ORDER BY 1;

CREATE OR REPLACE VIEW v_appointments_daily
WITH (security_invoker = TRUE) AS
SELECT
  date_trunc('day', debut)::DATE AS jour,
  COUNT(*)                       AS total,
  COUNT(*) FILTER (WHERE statut = 'confirme') AS confirmes,
  COUNT(*) FILTER (WHERE statut = 'effectue') AS effectues,
  COUNT(*) FILTER (WHERE statut = 'absent')   AS absents
FROM appointments
WHERE debut >= NOW() - INTERVAL '90 days'
GROUP BY 1
ORDER BY 1;

CREATE OR REPLACE VIEW v_sources_performance
WITH (security_invoker = TRUE) AS
SELECT
  COALESCE(s.nom, 'Direct') AS source,
  COUNT(l.id)                                                   AS leads,
  COUNT(l.id) FILTER (WHERE l.statut IN ('qualifie', 'rdv_planifie', 'rdv_confirme', 'rdv_effectue', 'proposition', 'gagne')) AS qualifies,
  COUNT(l.id) FILTER (WHERE l.statut IN ('rdv_planifie', 'rdv_confirme', 'rdv_effectue', 'proposition', 'gagne'))              AS rdv,
  COUNT(l.id) FILTER (WHERE l.statut = 'gagne')                 AS gagnes,
  ROUND(
    CASE WHEN COUNT(l.id) = 0 THEN 0
         ELSE 100.0 * COUNT(l.id) FILTER (WHERE l.statut IN ('rdv_planifie', 'rdv_confirme', 'rdv_effectue', 'proposition', 'gagne')) / COUNT(l.id)
    END, 1
  ) AS taux_rdv
FROM leads l
LEFT JOIN sources s ON s.id = l.source_id
GROUP BY 1
ORDER BY leads DESC;

CREATE OR REPLACE VIEW v_agent_performance
WITH (security_invoker = TRUE) AS
SELECT
  p.id,
  TRIM(CONCAT_WS(' ', p.prenom, p.nom)) AS agent,
  p.role,
  COUNT(DISTINCT c.id)   AS appels,
  COUNT(DISTINCT a.id)   AS rdv_pris,
  COUNT(DISTINCT l.id)   AS leads_traites
FROM profiles p
LEFT JOIN calls c        ON c.agent_id = p.id AND c.debut >= NOW() - INTERVAL '30 days'
LEFT JOIN appointments a ON a.pris_par_id = p.id AND a.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN leads l        ON l.assigne_crc_a = p.id AND l.updated_at >= NOW() - INTERVAL '30 days'
WHERE p.role IN ('agent_crc', 'superviseur_crc')
GROUP BY p.id, p.prenom, p.nom, p.role
ORDER BY appels DESC;

-- ------------------------------------------------------------
-- 4. Index de conformité
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS leads_consentement_idx
  ON leads (consentement_contact, consentement_date);

CREATE INDEX IF NOT EXISTS leads_escalade_idx
  ON leads (escalade_le)
  WHERE escalade_le IS NOT NULL;

-- ------------------------------------------------------------
-- 5. Paramètres de rétention par défaut
-- ------------------------------------------------------------
INSERT INTO integration_settings (cle, valeur) VALUES
  (
    'conformite',
    '{"retention_leads_mois": 36, "retention_appels_mois": 24, "retenion_audit_mois": 60, "responsable": "Délégué à la protection des données Otoclic"}'::JSONB
  )
ON CONFLICT (cle) DO NOTHING;