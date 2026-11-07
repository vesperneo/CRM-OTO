-- ============================================================
-- OTOCLIC CRM — Phase 2
-- Calendrier RDV, confirmation J-1, cadence de relances, SLA & escalades
-- Fichier: supabase/migrations/00004_phase2_rdv_sla_cadence.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. Colonnes de priorité / escalade sur les leads
-- ------------------------------------------------------------
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priorite    SMALLINT    NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS escalade_le TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS leads_priorite_idx
  ON leads (priorite DESC, created_at ASC)
  WHERE statut NOT IN ('gagne', 'perdu', 'ne_pas_rappeler', 'doublon');

CREATE INDEX IF NOT EXISTS appointments_confirmation_idx
  ON appointments (debut, statut)
  WHERE statut IN ('planifie', 'confirme');

-- ------------------------------------------------------------
-- 2. Cadence de relance centralisée
--    p_tentatives = nombre de tentatives DÉJÀ effectuées.
--    Retourne l'échéance de la tentative suivante.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION cadence_prochaine_echeance(
  p_tentatives INTEGER,
  p_base       TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_base + CASE
    WHEN p_tentatives <= 0 THEN INTERVAL '0 minutes'
    WHEN p_tentatives = 1  THEN INTERVAL '180 minutes'   -- J0 + 3h
    WHEN p_tentatives = 2  THEN INTERVAL '1440 minutes'  -- J+1
    WHEN p_tentatives = 3  THEN INTERVAL '2880 minutes'  -- J+2
    WHEN p_tentatives = 4  THEN INTERVAL '5760 minutes'  -- J+4
    ELSE                        INTERVAL '43200 minutes' -- réactivation J+30
  END;
$$;

-- ------------------------------------------------------------
-- 3. Escalade automatique des SLA
--    Nouveau lead sans premier appel depuis > 60 min.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION escalader_leads_sla(p_seuil_minutes INTEGER DEFAULT 60)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, assigne_crc_a
    FROM leads
    WHERE statut = 'nouveau'
      AND nb_tentatives_appel = 0
      AND escalade_le IS NULL
      AND created_at < NOW() - (p_seuil_minutes || ' minutes')::INTERVAL
  LOOP
    UPDATE leads
      SET priorite = GREATEST(priorite, 2),
          escalade_le = NOW()
      WHERE id = r.id;

    INSERT INTO activities (lead_id, type, contenu, auteur_id)
    VALUES (
      r.id,
      'systeme',
      jsonb_build_object(
        'action', 'escalade_sla',
        'seuil_minutes', p_seuil_minutes,
        'texte', 'SLA premier appel dépassé — lead escaladé automatiquement'
      ),
      NULL
    );

    IF r.assigne_crc_a IS NOT NULL THEN
      INSERT INTO tasks_relances
        (lead_id, assigne_a, type, echeance, statut, notes, regle_origine)
      VALUES (
        r.id, r.assigne_crc_a, 'rappel_appel', NOW(), 'en_attente',
        'Escalade SLA : premier appel en retard de plus de '
          || p_seuil_minutes || ' minutes',
        'sla_escalade'
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ------------------------------------------------------------
-- 4. Génération automatique des tâches de confirmation J-1
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION generer_confirmations_j1()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_jour  DATE := (CURRENT_DATE + 1);
  r RECORD;
BEGIN
  FOR r IN
    SELECT a.id, a.lead_id, COALESCE(a.pris_par_id, a.cree_par) AS responsable
    FROM appointments a
    WHERE a.statut = 'planifie'
      AND a.debut >= v_jour::TIMESTAMPTZ
      AND a.debut <  (v_jour + 1)::TIMESTAMPTZ
      AND NOT EXISTS (
        SELECT 1
        FROM tasks_relances t
        WHERE t.lead_id = a.lead_id
          AND t.type = 'confirmation_rdv'
          AND t.statut = 'en_attente'
          AND t.echeance >= v_jour::TIMESTAMPTZ
          AND t.echeance <  (v_jour + 1)::TIMESTAMPTZ
      )
  LOOP
    INSERT INTO tasks_relances
      (lead_id, assigne_a, type, echeance, statut, notes, regle_origine)
    VALUES (
      r.lead_id,
      r.responsable,
      'confirmation_rdv',
      v_jour::TIMESTAMPTZ + INTERVAL '9 hours',
      'en_attente',
      'Confirmation automatique du rendez-vous de demain (J-1)',
      'confirmation_j1'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ------------------------------------------------------------
-- 5. Confirmation publique d'un RDV via token (lien WhatsApp)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_appointment_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', a.id,
    'debut', a.debut,
    'fin', a.fin,
    'type', a.type,
    'statut', a.statut,
    'token_public', a.token_public,
    'notes_crc', a.notes_crc,
    'site', jsonb_build_object(
      'id', s.id, 'nom', s.nom, 'ville', s.ville,
      'adresse', s.adresse, 'telephone', s.telephone
    ),
    'lead', jsonb_build_object(
      'prenom', l.prenom, 'nom', l.nom, 'telephone', l.telephone
    ),
    'commercial', jsonb_build_object(
      'prenom', p.prenom, 'nom', p.nom
    )
  )
  INTO v_result
  FROM appointments a
  JOIN leads l  ON l.id = a.lead_id
  LEFT JOIN sites s    ON s.id = a.site_id
  LEFT JOIN profiles p ON p.id = a.assigne_a_id
  WHERE a.token_public = p_token;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION confirm_appointment_by_token(
  p_token  UUID,
  p_action TEXT DEFAULT 'confirmer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt   appointments%ROWTYPE;
  v_statut appointment_status;
BEGIN
  SELECT * INTO v_appt
  FROM appointments
  WHERE token_public = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rendez-vous introuvable');
  END IF;

  IF v_appt.statut IN ('annule', 'effectue', 'absent') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ce rendez-vous ne peut plus être modifié',
      'statut', v_appt.statut
    );
  END IF;

  v_statut := CASE p_action
    WHEN 'annuler'     THEN 'annule'::appointment_status
    WHEN 'replanifier' THEN 'replanifie'::appointment_status
    ELSE                    'confirme'::appointment_status
  END;

  UPDATE appointments
    SET statut = v_statut,
        confirme_par_crc_le = CASE
          WHEN v_statut = 'confirme' THEN NOW()
          ELSE confirme_par_crc_le
        END
    WHERE id = v_appt.id;

  UPDATE leads
    SET statut = CASE
      WHEN v_statut = 'confirme'   THEN 'rdv_confirme'::lead_status
      WHEN v_statut = 'annule'     THEN 'a_rappeler'::lead_status
      ELSE                              'rdv_planifie'::lead_status
    END
    WHERE id = v_appt.lead_id;

  INSERT INTO activities (lead_id, type, contenu, auteur_id)
  VALUES (
    v_appt.lead_id,
    'rdv',
    jsonb_build_object(
      'action', 'confirmation_publique',
      'rdv_id', v_appt.id,
      'resultat', v_statut
    ),
    NULL
  );

  UPDATE tasks_relances
    SET statut = 'terminee', termine_a = NOW()
    WHERE lead_id = v_appt.lead_id
      AND type = 'confirmation_rdv'
      AND statut = 'en_attente';

  RETURN jsonb_build_object('success', true, 'statut', v_statut);
END;
$$;

REVOKE ALL ON FUNCTION get_appointment_by_token(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION confirm_appointment_by_token(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_appointment_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION confirm_appointment_by_token(UUID, TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 6. Planification pg_cron (si l'extension est disponible)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'otoclic_sla_escalade') THEN
      PERFORM cron.unschedule('otoclic_sla_escalade');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'otoclic_confirmations_j1') THEN
      PERFORM cron.unschedule('otoclic_confirmations_j1');
    END IF;

    PERFORM cron.schedule(
      'otoclic_sla_escalade',
      '*/10 * * * *',
      $job$ SELECT escalader_leads_sla(); $job$
    );
    PERFORM cron.schedule(
      'otoclic_confirmations_j1',
      '0 8 * * *',
      $job$ SELECT generer_confirmations_j1(); $job$
    );
  END IF;
END;
$$;