# Otoclic CRM

Application de gestion des leads, traitement d'appels CRC (Call Center), relances automatisées et prise de rendez-vous en showrooms.

## Stack technique
- **Framework** : Next.js 14+ (App Router) + TypeScript
- **Styling** : Tailwind CSS + shadcn/ui + Lucide Icons
- **Base de données & Auth** : Supabase (PostgreSQL, Realtime, RLS, Edge Functions, pg_cron)
- **Téléphonie [CRC]** : Abstraction `TelephonyProvider` (Click-to-call `tel:` natif en MVP, extensible Twilio / Aircall / 3CX)
- **Région & Locale** : Fuseau `Africa/Casablanca`, Devise `MAD`, Normalisation automatique des téléphones `+212...`

---

## Démarrage rapide

### 1. Variables d'environnement
Copiez `.env.example` en `.env.local` et renseignez vos clés Supabase :
```bash
cp .env.example .env.local
```

### 2. Migration Supabase
Exécutez les migrations SQL dans votre console Supabase (SQL Editor) dans l'ordre :
1. `supabase/migrations/00001_init_schema.sql` (Tables fondamentales, leads, calls, rdv, triggers)
2. `supabase/migrations/00002_rls_policies.sql` (Sécurité Row-Level Security stricte par rôle)
3. `supabase/migrations/00003_seed_data.sql` (Données initiales : équipes, showrooms, sources, dispositions, scripts)

### 3. Lancement en développement
```bash
npm run dev
```
Accédez à l'application sur [http://localhost:3000](http://localhost:3000).

---

## Structure du projet

```
otoclic-crm/
├── app/
│   ├── (auth)/
│   │   ├── login/              # Page de connexion email/mot de passe
│   │   └── auth/callback/      # Échange de session Supabase
│   ├── (app)/                  # Espace applicatif protégé
│   │   ├── layout.tsx          # Sidebar adaptative par rôle + Header
│   │   ├── dashboard/          # Tableau de bord CRC & Showrooms
│   │   ├── leads/              # Liste des leads, filtres, scoring
│   │   ├── crc/
│   │   │   ├── file/           # File d'appels dynamique, script & qualification
│   │   │   └── supervision/    # Supervision CRC temps réel
│   │   ├── rendez-vous/        # Suivi & confirmation des RDV Showrooms
│   │   ├── taches/             # Relances prioritaires & rappels programmés
│   │   └── parametres/         # Configuration des sites, équipes, dispositions
├── src/
│   ├── components/
│   │   └── layout/             # Sidebar, Header, Indicateur présence Agent
│   ├── lib/
│   │   ├── supabase/           # Clients SSR Browser & Server
│   │   ├── telephony/          # TelephonyProvider (tel:, VoIP)
│   │   ├── constants.ts        # Statuts, rôles, cadences, SLAs
│   │   └── utils.ts            # Normalisation +212, formatage MAD, scoring
│   └── types/
│       ├── database.types.ts   # Typage Supabase exhaustif
│       └── domain.ts           # Types métier enrichis
└── supabase/
    └── migrations/             # Schémas SQL et politiques RLS
```

---

## Phases de livraison

- [x] **Phase 0** : Initialisation du repo, Supabase migrations, RLS par rôle, Auth, Layout réactif, Typescript & build validé.
- [ ] **Phase 1 (Prochaine étape)** : CRUD Leads complet, Fiche lead unifiée + Timeline, Import CSV avec mapping, File d'appels CRC avec verrouillage et dispositions interactives, Tâches du jour.
- [ ] **Phase 2** : Calendrier FullCalendar multi-sites, Confirmation RDV J-1, Cadence automatique de relances, SLAs & escalades.
- [ ] **Phase 3** : Espace Superviseur temps réel, WhatsApp Cloud API, Téléphonie VoIP, Google Calendar sync.
- [ ] **Phase 4** : Dashboards analytiques, exports PDF/Excel, conformité CNDP.
