-- ============================================================
-- OTOCLIC CRM — Données initiales de démo (Seed)
-- Fichier: supabase/migrations/00003_seed_data.sql
-- ============================================================

-- Équipes
INSERT INTO teams (id, nom, type) VALUES
  ('11111111-1111-1111-1111-111111111111', 'CRC Central Casablanca', 'crc'),
  ('22222222-2222-2222-2222-222222222222', 'Showroom Casablanca Centre', 'showroom'),
  ('33333333-3333-3333-3333-333333333333', 'Showroom Rabat Agdal', 'showroom'),
  ('44444444-4444-4444-4444-444444444444', 'Showroom Marrakech', 'showroom')
ON CONFLICT (id) DO NOTHING;

-- Sites
INSERT INTO sites (id, nom, ville, adresse, google_maps_url, telephone, email) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Showroom Casa Centre', 'Casablanca', '123 Bd Zerktouni, Casablanca', 'https://maps.google.com/?q=Casablanca', '+212522001122', 'casa@otoclic.ma'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Showroom Rabat Agdal', 'Rabat', '45 Av. Fal Ould Oumeir, Rabat', 'https://maps.google.com/?q=Rabat', '+212537001122', 'rabat@otoclic.ma'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Showroom Marrakech', 'Marrakech', '12 Av. Mohammed VI, Marrakech', 'https://maps.google.com/?q=Marrakech', '+212524001122', 'marrakech@otoclic.ma')
ON CONFLICT (id) DO NOTHING;

-- Sources de leads
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
ON CONFLICT (nom) DO NOTHING;

-- Tags
INSERT INTO tags (id, nom, couleur) VALUES
  ('e1111111-1111-4111-8111-111111111111', 'VIP', '#EF4444'),
  ('e2222222-2222-4222-8222-222222222222', 'Financement requis', '#3B82F6'),
  ('e3333333-3333-4333-8333-333333333333', 'Reprise véhicule', '#10B981'),
  ('e4444444-4444-4444-8444-444444444444', 'Livraison urgente', '#F59E0B')
ON CONFLICT (nom) DO NOTHING;

-- Dispositions d'appel CRC
INSERT INTO call_dispositions (id, libelle, type, action, action_params, couleur, ordre) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Répondu – Intéressé', 'repond_interesse', 'creer_relance', '{"nouveau_statut":"en_qualification_crc"}', '#10B981', 1),
  ('d2222222-2222-2222-2222-222222222222', 'Répondu – À rappeler', 'repond_rappeler', 'creer_relance', '{"nouveau_statut":"a_rappeler"}', '#F59E0B', 2),
  ('d3333333-3333-3333-3333-333333333333', 'Répondu – Pas intéressé', 'repond_pas_interesse', 'changer_statut', '{"nouveau_statut":"perdu"}', '#EF4444', 3),
  ('d4444444-4444-4444-4444-444444444444', 'Pas de réponse', 'pas_reponse', 'creer_relance', '{"cadence_auto":true}', '#6B7280', 4),
  ('d5555555-5555-5555-5555-555555555555', 'Messagerie', 'messagerie', 'creer_relance', '{"cadence_auto":true, "envoyer_whatsapp":true}', '#6B7280', 5),
  ('d6666666-6666-6666-6666-666666666666', 'Occupé', 'occupe', 'creer_relance', '{"delai_relance_heures":1}', '#6B7280', 6),
  ('d7777777-7777-7777-7777-777777777777', 'Numéro erroné / Hors service', 'numero_errone', 'envoyer_whatsapp', '{"template":"correction_numero"}', '#DC2626', 7),
  ('d8888888-8888-8888-8888-888888888888', 'RDV pris', 'rdv_pris', 'creer_rdv', '{"nouveau_statut":"rdv_planifie"}', '#2563EB', 8),
  ('d9999999-9999-9999-9999-999999999999', 'Doublon', 'doublon', 'changer_statut', '{"nouveau_statut":"doublon"}', '#8B5CF6', 9),
  ('daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ne pas rappeler (DNC)', 'dnc', 'marquer_dnc', '{"nouveau_statut":"ne_pas_rappeler"}', '#111827', 10)
ON CONFLICT (id) DO NOTHING;

-- Scripts d'appel
INSERT INTO call_scripts (id, nom, produit, campagne, contenu) VALUES
  ('ac111111-1111-4111-8111-111111111111', 'Script Standard Véhicule Neuf', 'Général', 'Toutes campagnes', '{
    "accroche": "Bonjour M./Mme {{nom}}, je suis {{agent_prenom}} d''Otoclic. Vous avez manifesté votre intérêt pour notre gamme {{produit}}. Avez-vous 2 minutes pour faire le point sur votre projet ?",
    "questions_qualification": [
      "Quel est votre délai d''achat envisagé (immédiat, 1-3 mois, plus tard) ?",
      "Avez-vous un véhicule actuel à faire reprendre par notre showroom ?",
      "Envisagez-vous un financement à crédit / LOA ou un achat comptant ?"
    ],
    "objections": [
      {"objection": "Je voulais juste voir le prix", "reponse": "Je comprends tout à fait. Nos offres actuelles incluent des remises spéciales et des formules de reprise avantageuses. Quel modèle précis retenait votre attention ?"},
      {"objection": "Je n''ai pas le temps", "reponse": "Aucun souci, je peux vous envoyer la fiche par WhatsApp ou vous rappeler à un moment plus propice. Quel créneau vous conviendrait ?"}
    ],
    "closing_rdv": "Le plus simple pour vous rendre compte est de venir l''essayer directement au showroom {{site}}. Seriez-vous disponible demain en fin de matinée ou dans l''après-midi ?"
  }')
ON CONFLICT (id) DO NOTHING;

