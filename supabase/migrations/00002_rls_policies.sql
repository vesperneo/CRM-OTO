-- ============================================================
-- OTOCLIC CRM — RLS Policies
-- Fichier: supabase/migrations/00002_rls_policies.sql
-- ============================================================

-- Activer RLS
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites               ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_commerciaux    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_dispositions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_queues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_scripts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls               ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_status        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnc_list            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_relances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Fonctions helper (SECURITY DEFINER évite la récursion RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_team_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION is_crc()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','superviseur_crc','agent_crc'));
$$;

CREATE OR REPLACE FUNCTION is_sup_crc()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','superviseur_crc'));
$$;

CREATE OR REPLACE FUNCTION is_commercial()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','responsable_site','commercial'));
$$;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_select_active" ON profiles FOR SELECT
  USING (actif = TRUE OR id = auth.uid() OR is_admin());

CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_all_admin" ON profiles FOR ALL
  USING (is_admin());

-- ============================================================
-- TEAMS — lecture pour tous, écriture admin
-- ============================================================
CREATE POLICY "teams_select" ON teams FOR SELECT USING (TRUE);
CREATE POLICY "teams_all_admin" ON teams FOR ALL USING (is_admin());

-- ============================================================
-- SITES
-- ============================================================
CREATE POLICY "sites_select" ON sites FOR SELECT USING (TRUE);
CREATE POLICY "sites_all_admin" ON sites FOR ALL USING (is_admin());

CREATE POLICY "site_commerciaux_select" ON site_commerciaux FOR SELECT USING (TRUE);
CREATE POLICY "site_commerciaux_admin"  ON site_commerciaux FOR ALL USING (is_admin());

-- ============================================================
-- LEADS
-- ============================================================

-- Admin : tout
CREATE POLICY "leads_all_admin" ON leads FOR ALL USING (is_admin());

-- Superviseur CRC : tout voir, tout modifier
CREATE POLICY "leads_sup_crc_select" ON leads FOR SELECT USING (is_sup_crc());
CREATE POLICY "leads_sup_crc_update" ON leads FOR UPDATE USING (is_sup_crc());

-- Agent CRC : ses leads + file commune (non assignée) + leads qu'il verrouille
CREATE POLICY "leads_agent_crc_select" ON leads FOR SELECT
  USING (
    auth_role() = 'agent_crc'
    AND (
      assigne_crc_a = auth.uid()
      OR assigne_crc_a IS NULL
      OR verrouille_par = auth.uid()
    )
  );

CREATE POLICY "leads_agent_crc_insert" ON leads FOR INSERT
  WITH CHECK (auth_role() IN ('agent_crc','superviseur_crc','admin'));

CREATE POLICY "leads_agent_crc_update" ON leads FOR UPDATE
  USING (
    auth_role() = 'agent_crc'
    AND (assigne_crc_a = auth.uid() OR verrouille_par = auth.uid())
  );

-- Commercial/Responsable site
CREATE POLICY "leads_commercial_select" ON leads FOR SELECT
  USING (
    is_commercial()
    AND (
      assigne_commercial_a = auth.uid()
      OR site_prefere_id IN (
        SELECT site_id FROM site_commerciaux WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "leads_commercial_update" ON leads FOR UPDATE
  USING (
    auth_role() IN ('responsable_site','commercial')
    AND assigne_commercial_a = auth.uid()
  );

-- Lecture seule
CREATE POLICY "leads_lecture_seule_select" ON leads FOR SELECT
  USING (
    auth_role() = 'lecture_seule'
    AND assigne_commercial_a = auth.uid()
  );

-- lead_tags : mêmes droits que leads
CREATE POLICY "lead_tags_select" ON lead_tags FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM leads l WHERE l.id = lead_tags.lead_id)
  );
CREATE POLICY "lead_tags_insert" ON lead_tags FOR INSERT
  WITH CHECK (is_crc() OR is_admin());
CREATE POLICY "lead_tags_delete" ON lead_tags FOR DELETE
  USING (is_crc() OR is_admin());

-- ============================================================
-- CALLS
-- ============================================================
CREATE POLICY "calls_select_crc" ON calls FOR SELECT
  USING (
    is_sup_crc()
    OR (auth_role() = 'agent_crc' AND agent_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "calls_insert" ON calls FOR INSERT
  WITH CHECK (is_crc() AND agent_id = auth.uid());

CREATE POLICY "calls_update" ON calls FOR UPDATE
  USING (is_sup_crc() OR (auth_role() = 'agent_crc' AND agent_id = auth.uid()));

-- ============================================================
-- QUALIFICATION ANSWERS
-- ============================================================
CREATE POLICY "qa_select" ON qualification_answers FOR SELECT
  USING (is_crc() OR is_admin());
CREATE POLICY "qa_insert" ON qualification_answers FOR INSERT
  WITH CHECK (is_crc() AND agent_id = auth.uid());

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE POLICY "appointments_select_crc" ON appointments FOR SELECT
  USING (is_crc());

CREATE POLICY "appointments_select_commercial" ON appointments FOR SELECT
  USING (
    is_commercial()
    AND (
      assigne_a_id = auth.uid()
      OR site_id IN (SELECT site_id FROM site_commerciaux WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "appointments_insert_crc" ON appointments FOR INSERT
  WITH CHECK (is_crc());

CREATE POLICY "appointments_update_crc" ON appointments FOR UPDATE
  USING (is_crc());

CREATE POLICY "appointments_update_commercial" ON appointments FOR UPDATE
  USING (
    is_commercial()
    AND assigne_a_id = auth.uid()
  );

CREATE POLICY "appointments_all_admin" ON appointments FOR ALL USING (is_admin());

-- ============================================================
-- TASKS_RELANCES
-- ============================================================
CREATE POLICY "tasks_select" ON tasks_relances FOR SELECT
  USING (
    assigne_a = auth.uid()
    OR is_sup_crc()
    OR is_admin()
    OR (is_commercial() AND assigne_a = auth.uid())
  );

CREATE POLICY "tasks_insert" ON tasks_relances FOR INSERT
  WITH CHECK (is_crc() OR is_admin());

CREATE POLICY "tasks_update" ON tasks_relances FOR UPDATE
  USING (assigne_a = auth.uid() OR is_sup_crc() OR is_admin());

-- ============================================================
-- AGENT_STATUS
-- ============================================================
CREATE POLICY "agent_status_select" ON agent_status FOR SELECT
  USING (is_crc() OR is_admin());

CREATE POLICY "agent_status_upsert_self" ON agent_status FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "agent_status_update" ON agent_status FOR UPDATE
  USING (agent_id = auth.uid() OR is_sup_crc() OR is_admin());

-- ============================================================
-- ACTIVITIES
-- ============================================================
CREATE POLICY "activities_select" ON activities FOR SELECT
  USING (
    is_admin()
    OR is_sup_crc()
    OR EXISTS (
      SELECT 1 FROM leads l WHERE l.id = activities.lead_id
        AND (
          l.assigne_crc_a = auth.uid()
          OR l.assigne_commercial_a = auth.uid()
          OR l.verrouille_par = auth.uid()
          OR (is_commercial() AND l.site_prefere_id IN (
              SELECT site_id FROM site_commerciaux WHERE profile_id = auth.uid()
            ))
        )
    )
  );

CREATE POLICY "activities_insert" ON activities FOR INSERT
  WITH CHECK (auteur_id = auth.uid() OR auth.uid() IS NOT NULL);

-- ============================================================
-- TABLES RÉFÉRENTIELLES (sources, tags, scripts, etc.)
-- ============================================================
CREATE POLICY "sources_select"       ON sources             FOR SELECT USING (TRUE);
CREATE POLICY "sources_admin"        ON sources             FOR ALL    USING (is_admin());
CREATE POLICY "tags_select"          ON tags                FOR SELECT USING (TRUE);
CREATE POLICY "tags_admin"           ON tags                FOR ALL    USING (is_admin());
CREATE POLICY "dispositions_select"  ON call_dispositions   FOR SELECT USING (TRUE);
CREATE POLICY "dispositions_admin"   ON call_dispositions   FOR ALL    USING (is_admin() OR is_sup_crc());
CREATE POLICY "queues_select"        ON call_queues         FOR SELECT USING (is_crc() OR is_admin());
CREATE POLICY "queues_admin"         ON call_queues         FOR ALL    USING (is_admin() OR is_sup_crc());
CREATE POLICY "scripts_select"       ON call_scripts        FOR SELECT USING (is_crc() OR is_admin());
CREATE POLICY "scripts_admin"        ON call_scripts        FOR ALL    USING (is_admin() OR is_sup_crc());
CREATE POLICY "templates_select"     ON message_templates   FOR SELECT USING (TRUE);
CREATE POLICY "templates_admin"      ON message_templates   FOR ALL    USING (is_admin());
CREATE POLICY "automation_select"    ON automation_rules    FOR SELECT USING (is_admin());
CREATE POLICY "automation_admin"     ON automation_rules    FOR ALL    USING (is_admin());

-- ============================================================
-- DNC LIST
-- ============================================================
CREATE POLICY "dnc_select" ON dnc_list FOR SELECT USING (is_crc() OR is_admin());
CREATE POLICY "dnc_insert" ON dnc_list FOR INSERT WITH CHECK (is_crc() OR is_admin());
CREATE POLICY "dnc_admin"  ON dnc_list FOR ALL    USING (is_admin());

-- ============================================================
-- AUDIT LOG — admin uniquement
-- ============================================================
CREATE POLICY "audit_select_admin" ON audit_log FOR SELECT USING (is_admin());
