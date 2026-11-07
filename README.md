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
4. `supabase/migrations/00004_phase2_rdv_sla_cadence.sql` (Cadence, SLA, confirmations J-1, RPC RDV public, pg_cron)
5. `supabase/migrations/00005_phase3_integrations.sql` (message_logs, téléphonie, intégrations, realtime)
6. `supabase/migrations/00006_phase4_analytics_compliance.sql` (data_requests, anonymisation, vues analytiques, rétention)

> Les traitements planifiés (`escalader_leads_sla`, `generer_confirmations_j1`) utilisent `pg_cron` s'il est activé sur le projet Supabase.

### 3. Lancement en développement
```bash
npm run dev
```
Accédez à l'application sur [http://localhost:3000](http://localhost:3000).

### 4. Tester les panneaux par rôle sans Supabase
En l'absence de variables Supabase, l'application démarre en **mode démo** :

- `http://localhost:3000/` ouvre directement le **panneau administrateur**.
- Le sélecteur **Démo** en haut à droite permet de basculer entre `Administrateur`, `Superviseur CRC`, `Agent CRC`, `Responsable de site` et `Commercial`.
- Chaque rôle est redirigé vers son panneau : `/admin`, `/superviseur`, `/agent` ou `/dashboard`.
- Les actions d'administration (invitation, rôles, équipes, sites, dispositions) sont simulées localement et ne modifient aucune base.

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
│   │   ├── admin/              # Panneau administrateur (utilisateurs, équipes, sites, dispositions, audit)
│   │   ├── superviseur/        # Panneau superviseur (équipe, SLA, activité du jour)
│   │   ├── agent/              # Espace agent CRC (file d'appels, tâches, RDV, leads prioritaires)
│   │   ├── dashboard/          # Tableau de bord CRC & Showrooms (SLA temps réel)
│   │   ├── leads/              # Liste des leads, filtres, scoring, fiche + timeline
│   │   ├── crc/
│   │   │   ├── file/           # File d'appels dynamique, script & qualification
│   │   │   └── supervision/    # Supervision CRC temps réel + alertes SLA
│   │   ├── rendez-vous/        # Calendrier multi-sites, confirmations J-1, RDV
│   │   ├── taches/             # Relances prioritaires & rappels programmés
│   │   ├── analytics/          # Funnel, tendances, sources, performance agents
│   │   ├── conformite/         # CNDP : consentements, droits, DNC, rétention, audit
│   │   └── parametres/         # Configuration des sites, équipes, dispositions
│   └── rdv/[token]/            # Page publique de confirmation / annulation du RDV
├── src/
│   ├── components/
│   │   ├── admin/              # Panneau admin (vue d'ensemble, utilisateurs, équipes, dispositions)
│   │   ├── appointments/       # Calendrier, file de confirmation, modales RDV
│   │   ├── analytics/          # Graphiques SVG & exports
│   │   ├── compliance/         # Console conformité CNDP
│   │   ├── crc/                # Supervision temps réel & SLA
│   │   └── layout/             # Sidebar, Header, sélecteur de rôle démo, indicateur présence Agent
│   ├── features/               # Server actions (admin, leads, calls, tasks, appointments, compliance)
│   ├── lib/
│   │   ├── supabase/           # Clients SSR Browser & Server
│   │   ├── telephony/          # TelephonyProvider (tel:, Twilio)
│   │   ├── whatsapp/           # WhatsApp Cloud API
│   │   ├── email/              # Resend
│   │   ├── google/             # Google Calendar
│   │   ├── sla.ts / cadence.ts # Règles SLA & cadence de relances
│   │   ├── export.ts           # CSV / Excel / impression PDF
│   │   ├── constants.ts        # Statuts, rôles, cadences, SLAs
│   │   └── utils.ts            # Normalisation +212, formatage MAD, scoring
│   └── types/
│       ├── database.types.ts   # Typage Supabase exhaustif
│       └── domain.ts           # Types métier enrichis
└── supabase/
    └── migrations/             # Schémas SQL et politiques RLS
```

---

## Intégrations externes

Toutes les intégrations sont **optionnelles** : sans clés configurées, l'application fonctionne en mode démonstration et journalise les envois en statut `queued`.

| Intégration | Variables | Comportement sans configuration |
|---|---|---|
| **Resend** (emails RDV) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Email simulé + log `message_logs` |
| **WhatsApp Cloud API** | `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Message simulé + log |
| **Twilio** (click-to-call) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Lien `tel:` natif |
| **Google Calendar** | `GOOGLE_CALENDAR_ACCESS_TOKEN`, `GOOGLE_CALENDAR_ID` | Sync ignorée, bouton explicite en erreur |
| **Page publique RDV** | `NEXT_PUBLIC_APP_URL` | Lien `/rdv/[token]` de confirmation prospect |

---

## Phases de livraison

- [x] **Phase 0** : Initialisation du repo, Supabase migrations, RLS par rôle, Auth, Layout réactif, Typescript & build validé.
- [x] **Phase 1** : CRUD Leads complet, Fiche lead unifiée + Timeline, Import CSV avec mapping, File d'appels CRC avec verrouillage et dispositions interactives, Tâches du jour.
- [x] **Phase 2** : Calendrier multi-sites, Confirmation RDV J-1 (+ page publique par token), Cadence automatique de relances (WhatsApp inclus), SLAs & escalades superviseur.
- [x] **Phase 3** : Espace Superviseur temps réel (Supabase Realtime), WhatsApp Cloud API, Téléphonie VoIP (Twilio), Google Calendar sync, attribution round-robin.
- [x] **Phase 4** : Dashboards analytiques (funnel, tendances, sources, agents), exports CSV/Excel/PDF, conformité CNDP (consentements, droits, DNC, rétention, anonymisation, audit).
- [x] **Phase 5** : Panneaux dédiés par rôle — administration (utilisateurs, équipes, sites, dispositions, journal d'audit), superviseur CRC (équipe, SLA, activité du jour), agent CRC (tâches, RDV, leads prioritaires), sélecteur de rôle démo et garde-fous d'accès par rôle.

### Accès par rôle

| Rôle | Page d'accueil | Périmètre |
|---|---|---|
| `admin` | `/admin` | Tous les panneaux + administration |
| `superviseur_crc` | `/superviseur` | Équipe CRC, SLA, supervision |
| `agent_crc` | `/agent` | Tâches, RDV, file d'appels |
| `responsable_site` | `/dashboard` | Tableau de bord showroom |
| `commercial` | `/dashboard` | Tableau de bord showroom |

> Les pages protégées redirigent automatiquement vers la page d'accueil du rôle lorsqu'il n'a pas les droits requis.
