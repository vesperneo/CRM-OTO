-- ============================================================
-- OTOCLIC CRM — Migration complète Phase 0
-- Fichier: supabase/migrations/00001_init_schema.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'admin',
  'superviseur_crc',
  'agent_crc',
  'responsable_site',
  'commercial',
  'lecture_seule'
);

CREATE TYPE team_type AS ENUM ('crc', 'showroom', 'autre');

CREATE TYPE lead_status AS ENUM (
  'nouveau',
  'en_qualification_crc',
  'qualifie',
  'rdv_planifie',
  'rdv_confirme',
  'rdv_effectue',
  'proposition',
  'gagne',
  'perdu',
  'injoignable',
  'a_rappeler',
  'doublon',
  'ne_pas_rappeler'
);

CREATE TYPE call_direction AS ENUM ('sortant', 'entrant');
CREATE TYPE appointment_type AS ENUM ('showroom', 'appel', 'visio');

CREATE TYPE appointment_status AS ENUM (
  'planifie',
  'confirme',
  'effectue',
  'absent',
  'annule',
  'replanifie'
);

CREATE TYPE agent_availability AS ENUM (
  'disponible',
  'en_appel',
  'pause',
  'hors_ligne',
  'en_formation'
);

CREATE TYPE activity_type AS ENUM (
  'appel',
  'whatsapp',
  'email',
  'note',
  'rdv',
  'changement_statut',
  'transfert',
  'import',
  'qualification',
  'tache',
  'systeme'
);

CREATE TYPE task_type AS ENUM (
  'rappel_appel',
  'whatsapp',
  'email',
  'confirmation_rdv',
  'reactivation',
  'suivi_commercial'
);

CREATE TYPE task_status AS ENUM (
  'en_attente',
  'en_cours',
  'terminee',
  'annulee',
  'expiree'
);

CREATE TYPE disposition_action AS ENUM (
  'creer_relance',
  'changer_statut',
  'creer_rdv',
  'cloturer',
  'envoyer_whatsapp',
  'envoyer_email',
  'marquer_dnc',
  'rien'
);

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE teams (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom        TEXT NOT NULL,
  type       team_type NOT NULL DEFAULT 'autre',
  actif      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILES (étend auth.users)
-- ============================================================
CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom              TEXT NOT NULL,
  prenom           TEXT,
  email            TEXT NOT NULL,
  role             user_role NOT NULL DEFAULT 'lecture_seule',
  team_id          UUID REFERENCES teams(id),
  telephone        TEXT,
  extension_poste  TEXT,
  avatar_url       TEXT,
  actif            BOOLEAN NOT NULL DEFAULT TRUE,
  preferences      JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SITES
-- ============================================================
CREATE TABLE sites (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom              TEXT NOT NULL,
  ville            TEXT NOT NULL,
  adresse          TEXT,
  telephone        TEXT,
  email            TEXT,
  google_maps_url  TEXT,
  horaires         JSONB NOT NULL DEFAULT '{
    "lundi":    {"ouvert": true,  "debut": "09:00", "fin": "18:00"},
    "mardi":    {"ouvert": true,  "debut": "09:00", "fin": "18:00"},
    "mercredi": {"ouvert": true,  "debut": "09:00", "fin": "18:00"},
    "jeudi":    {"ouvert": true,  "debut": "09:00", "fin": "18:00"},
    "vendredi": {"ouvert": true,  "debut": "09:00", "fin": "18:00"},
    "samedi":   {"ouvert": true,  "debut": "09:00", "fin": "13:00"},
    "dimanche": {"ouvert": false, "debut": null,     "fin": null}
  }',
  duree_rdv_defaut INTEGER NOT NULL DEFAULT 60,
  actif            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE site_commerciaux (
  site_id       UUID REFERENCES sites(id) ON DELETE CASCADE,
  profile_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  est_principal BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (site_id, profile_id)
);

-- ============================================================
-- SOURCES & TAGS
-- ============================================================
CREATE TABLE sources (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom        TEXT NOT NULL UNIQUE,
  type       TEXT,
  actif      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom        TEXT NOT NULL UNIQUE,
  couleur    TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom                    TEXT NOT NULL,
  prenom                 TEXT,
  telephone              TEXT NOT NULL,
  telephone_normalise    TEXT,
  whatsapp               TEXT,
  email                  TEXT,
  ville                  TEXT,
  site_prefere_id        UUID REFERENCES sites(id),
  source_id              UUID REFERENCES sources(id),
  campagne               TEXT,
  interet_produit        TEXT,
  budget                 NUMERIC(12,2),
  budget_devise          TEXT NOT NULL DEFAULT 'MAD',
  delai_achat            TEXT,
  besoin_details         TEXT,
  reprise_vehicule       BOOLEAN,
  financement            BOOLEAN,
  score                  INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  statut                 lead_status NOT NULL DEFAULT 'nouveau',
  assigne_crc_a          UUID REFERENCES profiles(id),
  assigne_commercial_a   UUID REFERENCES profiles(id),
  perdu_raison           TEXT,
  nb_tentatives_appel    INTEGER NOT NULL DEFAULT 0,
  prochaine_tentative_a  TIMESTAMPTZ,
  dernier_contact        TIMESTAMPTZ,
  prochaine_relance      TIMESTAMPTZ,
  verrouille_par         UUID REFERENCES profiles(id),
  verrouille_jusqu_a     TIMESTAMPTZ,
  consentement_contact   BOOLEAN NOT NULL DEFAULT FALSE,
  consentement_date      TIMESTAMPTZ,
  consentement_canal     TEXT,
  notes                  TEXT,
  import_id              UUID,
  source_externe_ref     TEXT,
  created_by             UUID REFERENCES profiles(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fonction de normalisation téléphone +212
CREATE OR REPLACE FUNCTION normaliser_telephone(tel TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  t TEXT;
BEGIN
  IF tel IS NULL THEN RETURN NULL; END IF;
  t := regexp_replace(tel, '[^0-9+]', '', 'g');
  IF t ~ '^0[0-9]{9}$' THEN
    RETURN '+212' || substring(t FROM 2);
  ELSIF t ~ '^212[0-9]{9}$' THEN
    RETURN '+' || t;
  ELSIF t ~ '^\+212[0-9]{9}$' THEN
    RETURN t;
  ELSE
    RETURN t;
  END IF;
END;
$$;

-- Trigger pour normaliser le téléphone à l'insert/update
CREATE OR REPLACE FUNCTION leads_normalise_telephone()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.telephone_normalise := normaliser_telephone(NEW.telephone);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_normalise_tel
  BEFORE INSERT OR UPDATE OF telephone ON leads
  FOR EACH ROW EXECUTE FUNCTION leads_normalise_telephone();

-- Index
CREATE UNIQUE INDEX leads_telephone_norm_idx ON leads (telephone_normalise)
  WHERE statut NOT IN ('doublon', 'ne_pas_rappeler');
CREATE INDEX leads_statut_idx            ON leads (statut);
CREATE INDEX leads_assigne_crc_idx       ON leads (assigne_crc_a);
CREATE INDEX leads_prochaine_tentative   ON leads (prochaine_tentative_a)
  WHERE statut NOT IN ('gagne','perdu','ne_pas_rappeler','doublon');
CREATE INDEX leads_prochaine_relance     ON leads (prochaine_relance)
  WHERE statut NOT IN ('gagne','perdu','ne_pas_rappeler','doublon');
CREATE INDEX leads_site_prefere_idx      ON leads (site_prefere_id);
CREATE INDEX leads_source_idx            ON leads (source_id);
CREATE INDEX leads_created_at_idx        ON leads (created_at DESC);
CREATE INDEX leads_verrouille_idx        ON leads (verrouille_par, verrouille_jusqu_a);

CREATE TABLE lead_tags (
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tag_id  UUID REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

-- ============================================================
-- DISPOSITIONS D'APPEL
-- ============================================================
CREATE TABLE call_dispositions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  libelle       TEXT NOT NULL,
  type          TEXT NOT NULL,
  action        disposition_action NOT NULL DEFAULT 'rien',
  action_params JSONB NOT NULL DEFAULT '{}',
  couleur       TEXT NOT NULL DEFAULT '#6B7280',
  ordre         INTEGER NOT NULL DEFAULT 0,
  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FILES D'APPEL
-- ============================================================
CREATE TABLE call_queues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom             TEXT NOT NULL,
  team_id         UUID REFERENCES teams(id),
  regles_filtrage JSONB NOT NULL DEFAULT '{}',
  priorite        INTEGER NOT NULL DEFAULT 0,
  horaires_appel  JSONB NOT NULL DEFAULT '{
    "lundi":    {"actif": true,  "debut": "09:00", "fin": "20:00"},
    "mardi":    {"actif": true,  "debut": "09:00", "fin": "20:00"},
    "mercredi": {"actif": true,  "debut": "09:00", "fin": "20:00"},
    "jeudi":    {"actif": true,  "debut": "09:00", "fin": "20:00"},
    "vendredi": {"actif": true,  "debut": "09:00", "fin": "20:00"},
    "samedi":   {"actif": true,  "debut": "09:00", "fin": "14:00"},
    "dimanche": {"actif": false, "debut": null,     "fin": null}
  }',
  actif      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SCRIPTS D'APPEL
-- ============================================================
CREATE TABLE call_scripts (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom       TEXT NOT NULL,
  produit   TEXT,
  campagne  TEXT,
  contenu   JSONB NOT NULL DEFAULT '{
    "accroche": "",
    "questions_qualification": [],
    "objections": [],
    "closing_rdv": ""
  }',
  actif      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- APPELS
-- ============================================================
CREATE TABLE calls (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id            UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id           UUID NOT NULL REFERENCES profiles(id),
  direction          call_direction NOT NULL DEFAULT 'sortant',
  debut              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fin                TIMESTAMPTZ,
  duree_secondes     INTEGER,
  disposition_id     UUID REFERENCES call_dispositions(id),
  notes              TEXT,
  enregistrement_url TEXT,
  provider_call_id   TEXT,
  provider_data      JSONB NOT NULL DEFAULT '{}',
  script_id          UUID REFERENCES call_scripts(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX calls_lead_id_idx  ON calls (lead_id);
CREATE INDEX calls_agent_id_idx ON calls (agent_id);
CREATE INDEX calls_debut_idx    ON calls (debut DESC);

-- Trigger durée appel
CREATE OR REPLACE FUNCTION calls_calc_duree()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fin IS NOT NULL THEN
    NEW.duree_secondes := EXTRACT(EPOCH FROM (NEW.fin - NEW.debut))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calls_duree
  BEFORE UPDATE OF fin ON calls
  FOR EACH ROW EXECUTE FUNCTION calls_calc_duree();

-- ============================================================
-- QUALIFICATION
-- ============================================================
CREATE TABLE qualification_answers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  call_id    UUID REFERENCES calls(id),
  agent_id   UUID NOT NULL REFERENCES profiles(id),
  reponses   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STATUT AGENT (Realtime)
-- ============================================================
CREATE TABLE agent_status (
  agent_id   UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  statut     agent_availability NOT NULL DEFAULT 'hors_ligne',
  depuis     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LISTE NE PAS APPELER
-- ============================================================
CREATE TABLE dnc_list (
  telephone           TEXT PRIMARY KEY,
  telephone_normalise TEXT NOT NULL,
  raison              TEXT,
  ajoute_par          UUID REFERENCES profiles(id),
  date_ajout          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX dnc_normalise_idx ON dnc_list (telephone_normalise);

-- ============================================================
-- ACTIVITÉS (timeline)
-- ============================================================
CREATE TABLE activities (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type       activity_type NOT NULL,
  contenu    JSONB NOT NULL DEFAULT '{}',
  auteur_id  UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activities_lead_id_idx ON activities (lead_id, created_at DESC);
CREATE INDEX activities_auteur_idx  ON activities (auteur_id);

-- ============================================================
-- TÂCHES DE RELANCE
-- ============================================================
CREATE TABLE tasks_relances (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigne_a    UUID REFERENCES profiles(id),
  echeance     TIMESTAMPTZ NOT NULL,
  type         task_type NOT NULL,
  statut       task_status NOT NULL DEFAULT 'en_attente',
  notes        TEXT,
  regle_origine TEXT,
  cree_par     UUID REFERENCES profiles(id),
  termine_a    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tasks_assigne_a_idx   ON tasks_relances (assigne_a, echeance);
CREATE INDEX tasks_lead_id_idx     ON tasks_relances (lead_id);
CREATE INDEX tasks_statut_echeance ON tasks_relances (statut, echeance) WHERE statut = 'en_attente';

-- ============================================================
-- RENDEZ-VOUS
-- ============================================================
CREATE TABLE appointments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id              UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  pris_par_id          UUID REFERENCES profiles(id),
  assigne_a_id         UUID REFERENCES profiles(id),
  site_id              UUID REFERENCES sites(id),
  debut                TIMESTAMPTZ NOT NULL,
  fin                  TIMESTAMPTZ NOT NULL,
  type                 appointment_type NOT NULL DEFAULT 'showroom',
  statut               appointment_status NOT NULL DEFAULT 'planifie',
  confirme_par_crc_le  TIMESTAMPTZ,
  rappel_j1_envoye     BOOLEAN NOT NULL DEFAULT FALSE,
  rappel_h2_envoye     BOOLEAN NOT NULL DEFAULT FALSE,
  google_event_id      TEXT,
  token_public         UUID NOT NULL DEFAULT uuid_generate_v4(),
  resultat_commercial  TEXT,
  notes_crc            TEXT,
  notes_commercial     TEXT,
  cree_par             UUID REFERENCES profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_heures CHECK (fin > debut)
);

CREATE UNIQUE INDEX appointments_token_idx    ON appointments (token_public);
CREATE INDEX appointments_debut_idx           ON appointments (debut);
CREATE INDEX appointments_site_idx            ON appointments (site_id, debut);
CREATE INDEX appointments_commercial_idx      ON appointments (assigne_a_id, debut);
CREATE INDEX appointments_lead_idx            ON appointments (lead_id);

-- ============================================================
-- MODÈLES DE MESSAGES
-- ============================================================
CREATE TABLE message_templates (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom        TEXT NOT NULL,
  canal      TEXT NOT NULL CHECK (canal IN ('whatsapp','email','sms')),
  sujet      TEXT,
  contenu    TEXT NOT NULL,
  langue     TEXT NOT NULL DEFAULT 'fr',
  actif      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RÈGLES D'AUTOMATISATION
-- ============================================================
CREATE TABLE automation_rules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom          TEXT NOT NULL,
  declencheur  TEXT NOT NULL,
  conditions   JSONB NOT NULL DEFAULT '[]',
  actions      JSONB NOT NULL DEFAULT '[]',
  actif        BOOLEAN NOT NULL DEFAULT TRUE,
  ordre        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id  UUID NOT NULL,
  operation  TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  avant      JSONB,
  apres      JSONB,
  auteur_id  UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_log_record_idx ON audit_log (table_name, record_id, created_at DESC);
CREATE INDEX audit_log_auteur_idx ON audit_log (auteur_id, created_at DESC);

-- ============================================================
-- TRIGGERS : updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_teams_updated_at             BEFORE UPDATE ON teams             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at          BEFORE UPDATE ON profiles          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sites_updated_at             BEFORE UPDATE ON sites             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leads_updated_at             BEFORE UPDATE ON leads             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_calls_updated_at             BEFORE UPDATE ON calls             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_call_queues_updated_at       BEFORE UPDATE ON call_queues       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_call_scripts_updated_at      BEFORE UPDATE ON call_scripts      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_agent_status_updated_at      BEFORE UPDATE ON agent_status      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_appointments_updated_at      BEFORE UPDATE ON appointments      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tasks_relances_updated_at    BEFORE UPDATE ON tasks_relances    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_message_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_automation_rules_updated_at  BEFORE UPDATE ON automation_rules  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger audit sur leads et appointments
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, operation, avant, apres, auteur_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_leads_audit
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_appointments_audit
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Trigger : créer profil agent_status à l'insertion d'un profil CRC
CREATE OR REPLACE FUNCTION create_agent_status_on_profile()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role IN ('agent_crc', 'superviseur_crc') THEN
    INSERT INTO agent_status (agent_id, statut)
    VALUES (NEW.id, 'hors_ligne')
    ON CONFLICT (agent_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_create_agent_status
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_agent_status_on_profile();

-- Trigger : créer profil automatiquement à la création d'un user auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, nom, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1)),
    NEW.email,
    'lecture_seule'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
