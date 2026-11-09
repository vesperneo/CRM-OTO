-- ============================================================
-- OTOCLIC CRM - Promouvoir un utilisateur administrateur
-- Fichier: supabase/migrations/00009_make_admin.sql
-- ============================================================

-- ETAPE 1 : Liste des profils pour récupérer l'ID concerné
SELECT id, email, nom, prenom, role FROM profiles ORDER BY created_at DESC;

-- ETAPE 2 : Remplacez '<VOTRE_AUTH_ID>' par l'ID trouvé à l'étape 1,
-- puis exécutez la requête suivante :
-- UPDATE profiles SET role = 'admin' WHERE id = '<VOTRE_AUTH_ID>';

-- Exemple (à adapter) :
-- UPDATE profiles SET role = 'admin' WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Vérification après modification :
-- SELECT id, email, role FROM profiles WHERE id = '<VOTRE_AUTH_ID>';

-- ============================================================
-- NOTE : Seuls les utilisateurs ayant un profil existant peuvent
-- être promus admin. Si vous n'avez pas de profil, connectez-vous
-- d'abord sur /login (le profil est créé automatiquement avec le
-- rôle 'lecture_seule').
-- ============================================================
