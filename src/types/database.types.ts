// ============================================================
// OTOCLIC CRM — Types base de données Supabase
// Auto-compatible avec le client Supabase typé
// ============================================================

// ============================================================
// ENUMS
// ============================================================

export type UserRole =
  | 'admin'
  | 'superviseur_crc'
  | 'agent_crc'
  | 'responsable_site'
  | 'commercial'
  | 'lecture_seule'

export type TeamType = 'crc' | 'showroom' | 'autre'

export type LeadStatus =
  | 'nouveau'
  | 'en_qualification_crc'
  | 'qualifie'
  | 'rdv_planifie'
  | 'rdv_confirme'
  | 'rdv_effectue'
  | 'proposition'
  | 'gagne'
  | 'perdu'
  | 'injoignable'
  | 'a_rappeler'
  | 'doublon'
  | 'ne_pas_rappeler'

export type CallDirection = 'sortant' | 'entrant'

export type AppointmentType = 'showroom' | 'appel' | 'visio'

export type AppointmentStatus =
  | 'planifie'
  | 'confirme'
  | 'effectue'
  | 'absent'
  | 'annule'
  | 'replanifie'

export type AgentAvailability =
  | 'disponible'
  | 'en_appel'
  | 'pause'
  | 'hors_ligne'
  | 'en_formation'

export type ActivityType =
  | 'appel'
  | 'whatsapp'
  | 'email'
  | 'note'
  | 'rdv'
  | 'changement_statut'
  | 'transfert'
  | 'import'
  | 'qualification'
  | 'tache'
  | 'systeme'

export type TaskType =
  | 'rappel_appel'
  | 'whatsapp'
  | 'email'
  | 'confirmation_rdv'
  | 'reactivation'
  | 'suivi_commercial'

export type TaskStatus =
  | 'en_attente'
  | 'en_cours'
  | 'terminee'
  | 'annulee'
  | 'expiree'

export type DispositionAction =
  | 'creer_relance'
  | 'changer_statut'
  | 'creer_rdv'
  | 'cloturer'
  | 'envoyer_whatsapp'
  | 'envoyer_email'
  | 'marquer_dnc'
  | 'rien'

export type MessageCanal = 'whatsapp' | 'email' | 'sms'

export type AuditOperation = 'INSERT' | 'UPDATE' | 'DELETE'

// ============================================================
// DATABASE INTERFACE
// ============================================================

export interface Database {
  public: {
    Tables: {
      // ----------------------------------------------------------
      // profiles
      // ----------------------------------------------------------
      profiles: {
        Row: {
          id: string
          nom: string
          prenom: string | null
          email: string
          role: UserRole
          team_id: string | null
          telephone: string | null
          extension_poste: string | null
          avatar_url: string | null
          actif: boolean
          preferences: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nom: string
          prenom?: string | null
          email: string
          role?: UserRole
          team_id?: string | null
          telephone?: string | null
          extension_poste?: string | null
          avatar_url?: string | null
          actif?: boolean
          preferences?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nom?: string
          prenom?: string | null
          email?: string
          role?: UserRole
          team_id?: string | null
          telephone?: string | null
          extension_poste?: string | null
          avatar_url?: string | null
          actif?: boolean
          preferences?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }

        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey",
            columns: ["team_id"],
            isOneToOne: false,
            referencedRelation: "teams",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // teams
      // ----------------------------------------------------------
      teams: {
        Row: {
          id: string
          nom: string
          type: TeamType
          actif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nom: string
          type: TeamType
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nom?: string
          type?: TeamType
          actif?: boolean
          created_at?: string
          updated_at?: string
        }

        Relationships: []
      }

      // ----------------------------------------------------------
      // sites
      // ----------------------------------------------------------
      sites: {
        Row: {
          id: string
          nom: string
          ville: string
          adresse: string | null
          telephone: string | null
          email: string | null
          google_maps_url: string | null
          horaires: Record<string, unknown>
          duree_rdv_defaut: number
          actif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nom: string
          ville: string
          adresse?: string | null
          telephone?: string | null
          email?: string | null
          google_maps_url?: string | null
          horaires?: Record<string, unknown>
          duree_rdv_defaut?: number
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nom?: string
          ville?: string
          adresse?: string | null
          telephone?: string | null
          email?: string | null
          google_maps_url?: string | null
          horaires?: Record<string, unknown>
          duree_rdv_defaut?: number
          actif?: boolean
          created_at?: string
          updated_at?: string
        }

        Relationships: []
      }

      // ----------------------------------------------------------
      // site_commerciaux
      // ----------------------------------------------------------
      site_commerciaux: {
        Row: {
          site_id: string
          profile_id: string
          est_principal: boolean
        }
        Insert: {
          site_id: string
          profile_id: string
          est_principal?: boolean
        }
        Update: {
          site_id?: string
          profile_id?: string
          est_principal?: boolean
        }

        Relationships: [
          {
            foreignKeyName: "site_commerciaux_site_id_fkey",
            columns: ["site_id"],
            isOneToOne: false,
            referencedRelation: "sites",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "site_commerciaux_profile_id_fkey",
            columns: ["profile_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // sources
      // ----------------------------------------------------------
      sources: {
        Row: {
          id: string
          nom: string
          type: string | null
          actif: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nom: string
          type?: string | null
          actif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nom?: string
          type?: string | null
          actif?: boolean
          created_at?: string
        }

        Relationships: []
      }

      // ----------------------------------------------------------
      // tags
      // ----------------------------------------------------------
      tags: {
        Row: {
          id: string
          nom: string
          couleur: string
          created_at: string
        }
        Insert: {
          id?: string
          nom: string
          couleur: string
          created_at?: string
        }
        Update: {
          id?: string
          nom?: string
          couleur?: string
          created_at?: string
        }

        Relationships: []
      }

      // ----------------------------------------------------------
      // leads
      // ----------------------------------------------------------
      leads: {
        Row: {
          id: string
          nom: string
          prenom: string | null
          telephone: string
          telephone_normalise: string | null
          whatsapp: string | null
          email: string | null
          ville: string | null
          site_prefere_id: string | null
          source_id: string | null
          campagne: string | null
          interet_produit: string | null
          budget: number | null
          budget_devise: string
          delai_achat: string | null
          besoin_details: string | null
          reprise_vehicule: boolean | null
          financement: boolean | null
          score: number
          statut: LeadStatus
          assigne_crc_a: string | null
          assigne_commercial_a: string | null
          perdu_raison: string | null
          nb_tentatives_appel: number
          prochaine_tentative_a: string | null
          dernier_contact: string | null
          prochaine_relance: string | null
          verrouille_par: string | null
          verrouille_jusqu_a: string | null
          consentement_contact: boolean
          consentement_date: string | null
          consentement_canal: string | null
          notes: string | null
          import_id: string | null
          source_externe_ref: string | null
          created_by: string | null
          priorite: number
          escalade_le: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nom: string
          prenom?: string | null
          telephone: string
          telephone_normalise?: string | null
          whatsapp?: string | null
          email?: string | null
          ville?: string | null
          site_prefere_id?: string | null
          source_id?: string | null
          campagne?: string | null
          interet_produit?: string | null
          budget?: number | null
          budget_devise?: string
          delai_achat?: string | null
          besoin_details?: string | null
          reprise_vehicule?: boolean | null
          financement?: boolean | null
          score?: number
          statut?: LeadStatus
          assigne_crc_a?: string | null
          assigne_commercial_a?: string | null
          perdu_raison?: string | null
          nb_tentatives_appel?: number
          prochaine_tentative_a?: string | null
          dernier_contact?: string | null
          prochaine_relance?: string | null
          verrouille_par?: string | null
          verrouille_jusqu_a?: string | null
          consentement_contact?: boolean
          consentement_date?: string | null
          consentement_canal?: string | null
          notes?: string | null
          import_id?: string | null
          source_externe_ref?: string | null
          created_by?: string | null
          priorite?: number
          escalade_le?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nom?: string
          prenom?: string | null
          telephone?: string
          telephone_normalise?: string | null
          whatsapp?: string | null
          email?: string | null
          ville?: string | null
          site_prefere_id?: string | null
          source_id?: string | null
          campagne?: string | null
          interet_produit?: string | null
          budget?: number | null
          budget_devise?: string
          delai_achat?: string | null
          besoin_details?: string | null
          reprise_vehicule?: boolean | null
          financement?: boolean | null
          score?: number
          statut?: LeadStatus
          assigne_crc_a?: string | null
          assigne_commercial_a?: string | null
          perdu_raison?: string | null
          nb_tentatives_appel?: number
          prochaine_tentative_a?: string | null
          dernier_contact?: string | null
          prochaine_relance?: string | null
          verrouille_par?: string | null
          verrouille_jusqu_a?: string | null
          consentement_contact?: boolean
          consentement_date?: string | null
          consentement_canal?: string | null
          notes?: string | null
          import_id?: string | null
          source_externe_ref?: string | null
          created_by?: string | null
          priorite?: number
          escalade_le?: string | null
          created_at?: string
          updated_at?: string
        }

        Relationships: [
          {
            foreignKeyName: "leads_site_prefere_id_fkey",
            columns: ["site_prefere_id"],
            isOneToOne: false,
            referencedRelation: "sites",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "leads_source_id_fkey",
            columns: ["source_id"],
            isOneToOne: false,
            referencedRelation: "sources",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "leads_assigne_crc_a_fkey",
            columns: ["assigne_crc_a"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "leads_assigne_commercial_a_fkey",
            columns: ["assigne_commercial_a"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "leads_verrouille_par_fkey",
            columns: ["verrouille_par"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "leads_created_by_fkey",
            columns: ["created_by"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // lead_tags
      // ----------------------------------------------------------
      lead_tags: {
        Row: {
          lead_id: string
          tag_id: string
        }
        Insert: {
          lead_id: string
          tag_id: string
        }
        Update: {
          lead_id?: string
          tag_id?: string
        }

        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey",
            columns: ["lead_id"],
            isOneToOne: false,
            referencedRelation: "leads",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey",
            columns: ["tag_id"],
            isOneToOne: false,
            referencedRelation: "tags",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // call_dispositions
      // ----------------------------------------------------------
      call_dispositions: {
        Row: {
          id: string
          libelle: string
          type: string
          action: DispositionAction
          action_params: Record<string, unknown>
          couleur: string
          ordre: number
          actif: boolean
          created_at: string
        }
        Insert: {
          id?: string
          libelle: string
          type: string
          action: DispositionAction
          action_params?: Record<string, unknown>
          couleur?: string
          ordre?: number
          actif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          libelle?: string
          type?: string
          action?: DispositionAction
          action_params?: Record<string, unknown>
          couleur?: string
          ordre?: number
          actif?: boolean
          created_at?: string
        }

        Relationships: []
      }

      // ----------------------------------------------------------
      // call_queues
      // ----------------------------------------------------------
      call_queues: {
        Row: {
          id: string
          nom: string
          team_id: string | null
          regles_filtrage: Record<string, unknown>
          priorite: number
          horaires_appel: Record<string, unknown>
          actif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nom: string
          team_id?: string | null
          regles_filtrage?: Record<string, unknown>
          priorite?: number
          horaires_appel?: Record<string, unknown>
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nom?: string
          team_id?: string | null
          regles_filtrage?: Record<string, unknown>
          priorite?: number
          horaires_appel?: Record<string, unknown>
          actif?: boolean
          created_at?: string
          updated_at?: string
        }

        Relationships: [
          {
            foreignKeyName: "call_queues_team_id_fkey",
            columns: ["team_id"],
            isOneToOne: false,
            referencedRelation: "teams",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // call_scripts
      // ----------------------------------------------------------
      call_scripts: {
        Row: {
          id: string
          nom: string
          produit: string | null
          campagne: string | null
          contenu: Record<string, unknown>
          actif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nom: string
          produit?: string | null
          campagne?: string | null
          contenu?: Record<string, unknown>
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nom?: string
          produit?: string | null
          campagne?: string | null
          contenu?: Record<string, unknown>
          actif?: boolean
          created_at?: string
          updated_at?: string
        }

        Relationships: []
      }

      // ----------------------------------------------------------
      // calls
      // ----------------------------------------------------------
      calls: {
        Row: {
          id: string
          lead_id: string
          agent_id: string
          direction: CallDirection
          debut: string
          fin: string | null
          duree_secondes: number | null
          disposition_id: string | null
          notes: string | null
          enregistrement_url: string | null
          provider_call_id: string | null
          provider_data: Record<string, unknown>
          script_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          agent_id: string
          direction: CallDirection
          debut?: string
          fin?: string | null
          duree_secondes?: number | null
          disposition_id?: string | null
          notes?: string | null
          enregistrement_url?: string | null
          provider_call_id?: string | null
          provider_data?: Record<string, unknown>
          script_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          agent_id?: string
          direction?: CallDirection
          debut?: string
          fin?: string | null
          duree_secondes?: number | null
          disposition_id?: string | null
          notes?: string | null
          enregistrement_url?: string | null
          provider_call_id?: string | null
          provider_data?: Record<string, unknown>
          script_id?: string | null
          created_at?: string
          updated_at?: string
        }

        Relationships: [
          {
            foreignKeyName: "calls_lead_id_fkey",
            columns: ["lead_id"],
            isOneToOne: false,
            referencedRelation: "leads",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "calls_agent_id_fkey",
            columns: ["agent_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "calls_disposition_id_fkey",
            columns: ["disposition_id"],
            isOneToOne: false,
            referencedRelation: "call_dispositions",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "calls_script_id_fkey",
            columns: ["script_id"],
            isOneToOne: false,
            referencedRelation: "call_scripts",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // qualification_answers
      // ----------------------------------------------------------
      qualification_answers: {
        Row: {
          id: string
          lead_id: string
          call_id: string | null
          agent_id: string
          reponses: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          call_id?: string | null
          agent_id: string
          reponses?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          call_id?: string | null
          agent_id?: string
          reponses?: Record<string, unknown>
          created_at?: string
        }

        Relationships: [
          {
            foreignKeyName: "qualification_answers_lead_id_fkey",
            columns: ["lead_id"],
            isOneToOne: false,
            referencedRelation: "leads",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "qualification_answers_call_id_fkey",
            columns: ["call_id"],
            isOneToOne: false,
            referencedRelation: "calls",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "qualification_answers_agent_id_fkey",
            columns: ["agent_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // agent_status
      // ----------------------------------------------------------
      agent_status: {
        Row: {
          agent_id: string
          statut: AgentAvailability
          depuis: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          statut?: AgentAvailability
          depuis?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          statut?: AgentAvailability
          depuis?: string
          updated_at?: string
        }

        Relationships: [
          {
            foreignKeyName: "agent_status_agent_id_fkey",
            columns: ["agent_id"],
            isOneToOne: true,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // dnc_list
      // ----------------------------------------------------------
      dnc_list: {
        Row: {
          telephone: string
          telephone_normalise: string
          raison: string | null
          ajoute_par: string | null
          date_ajout: string
        }
        Insert: {
          telephone: string
          telephone_normalise: string
          raison?: string | null
          ajoute_par?: string | null
          date_ajout?: string
        }
        Update: {
          telephone?: string
          telephone_normalise?: string
          raison?: string | null
          ajoute_par?: string | null
          date_ajout?: string
        }

        Relationships: [
          {
            foreignKeyName: "dnc_list_ajoute_par_fkey",
            columns: ["ajoute_par"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // activities
      // ----------------------------------------------------------
      activities: {
        Row: {
          id: string
          lead_id: string
          type: ActivityType
          contenu: Record<string, unknown>
          auteur_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          type: ActivityType
          contenu?: Record<string, unknown>
          auteur_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          type?: ActivityType
          contenu?: Record<string, unknown>
          auteur_id?: string | null
          created_at?: string
        }

        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey",
            columns: ["lead_id"],
            isOneToOne: false,
            referencedRelation: "leads",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "activities_auteur_id_fkey",
            columns: ["auteur_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // tasks_relances
      // ----------------------------------------------------------
      tasks_relances: {
        Row: {
          id: string
          lead_id: string
          assigne_a: string | null
          echeance: string
          type: TaskType
          statut: TaskStatus
          notes: string | null
          regle_origine: string | null
          cree_par: string | null
          termine_a: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          assigne_a?: string | null
          echeance: string
          type: TaskType
          statut?: TaskStatus
          notes?: string | null
          regle_origine?: string | null
          cree_par?: string | null
          termine_a?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          assigne_a?: string | null
          echeance?: string
          type?: TaskType
          statut?: TaskStatus
          notes?: string | null
          regle_origine?: string | null
          cree_par?: string | null
          termine_a?: string | null
          created_at?: string
          updated_at?: string
        }

        Relationships: [
          {
            foreignKeyName: "tasks_relances_lead_id_fkey",
            columns: ["lead_id"],
            isOneToOne: false,
            referencedRelation: "leads",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "tasks_relances_assigne_a_fkey",
            columns: ["assigne_a"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "tasks_relances_cree_par_fkey",
            columns: ["cree_par"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // appointments
      // ----------------------------------------------------------
      appointments: {
        Row: {
          id: string
          lead_id: string
          pris_par_id: string | null
          assigne_a_id: string | null
          site_id: string | null
          debut: string
          fin: string
          type: AppointmentType
          statut: AppointmentStatus
          confirme_par_crc_le: string | null
          rappel_j1_envoye: boolean
          rappel_h2_envoye: boolean
          google_event_id: string | null
          token_public: string
          resultat_commercial: string | null
          notes_crc: string | null
          notes_commercial: string | null
          cree_par: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          pris_par_id?: string | null
          assigne_a_id?: string | null
          site_id?: string | null
          debut: string
          fin: string
          type?: AppointmentType
          statut?: AppointmentStatus
          confirme_par_crc_le?: string | null
          rappel_j1_envoye?: boolean
          rappel_h2_envoye?: boolean
          google_event_id?: string | null
          token_public?: string
          resultat_commercial?: string | null
          notes_crc?: string | null
          notes_commercial?: string | null
          cree_par?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          pris_par_id?: string | null
          assigne_a_id?: string | null
          site_id?: string | null
          debut?: string
          fin?: string
          type?: AppointmentType
          statut?: AppointmentStatus
          confirme_par_crc_le?: string | null
          rappel_j1_envoye?: boolean
          rappel_h2_envoye?: boolean
          google_event_id?: string | null
          token_public?: string
          resultat_commercial?: string | null
          notes_crc?: string | null
          notes_commercial?: string | null
          cree_par?: string | null
          created_at?: string
          updated_at?: string
        }

        Relationships: [
          {
            foreignKeyName: "appointments_lead_id_fkey",
            columns: ["lead_id"],
            isOneToOne: false,
            referencedRelation: "leads",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "appointments_pris_par_id_fkey",
            columns: ["pris_par_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "appointments_assigne_a_id_fkey",
            columns: ["assigne_a_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "appointments_site_id_fkey",
            columns: ["site_id"],
            isOneToOne: false,
            referencedRelation: "sites",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "appointments_cree_par_fkey",
            columns: ["cree_par"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // message_templates
      // ----------------------------------------------------------
      message_templates: {
        Row: {
          id: string
          nom: string
          canal: MessageCanal
          sujet: string | null
          contenu: string
          langue: string
          actif: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nom: string
          canal: MessageCanal
          sujet?: string | null
          contenu: string
          langue?: string
          actif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nom?: string
          canal?: MessageCanal
          sujet?: string | null
          contenu?: string
          langue?: string
          actif?: boolean
          created_at?: string
        }

        Relationships: []
      }

      // ----------------------------------------------------------
      // automation_rules
      // ----------------------------------------------------------
      automation_rules: {
        Row: {
          id: string
          nom: string
          declencheur: string
          conditions: unknown[]
          actions: unknown[]
          actif: boolean
          ordre: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nom: string
          declencheur: string
          conditions?: unknown[]
          actions?: unknown[]
          actif?: boolean
          ordre?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nom?: string
          declencheur?: string
          conditions?: unknown[]
          actions?: unknown[]
          actif?: boolean
          ordre?: number
          created_at?: string
          updated_at?: string
        }

        Relationships: []
      }

      // ----------------------------------------------------------
      // audit_log
      // ----------------------------------------------------------
      audit_log: {
        Row: {
          id: number
          table_name: string
          record_id: string
          operation: AuditOperation
          avant: Record<string, unknown> | null
          apres: Record<string, unknown> | null
          auteur_id: string | null
          created_at: string
        }
        Insert: {
          id?: number
          table_name: string
          record_id: string
          operation: AuditOperation
          avant?: Record<string, unknown> | null
          apres?: Record<string, unknown> | null
          auteur_id?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          table_name?: string
          record_id?: string
          operation?: AuditOperation
          avant?: Record<string, unknown> | null
          apres?: Record<string, unknown> | null
          auteur_id?: string | null
          created_at?: string
        }

        Relationships: [
          {
            foreignKeyName: "audit_log_auteur_id_fkey",
            columns: ["auteur_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // message_logs
      // ----------------------------------------------------------
      message_logs: {
        Row: {
          id: string
          lead_id: string | null
          appointment_id: string | null
          canal: string
          destinataire: string
          template_nom: string | null
          contenu: string
          statut: string
          provider: string
          provider_message_id: string | null
          provider_data: Record<string, unknown>
          erreur: string | null
          envoye_par: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          appointment_id?: string | null
          canal: string
          destinataire: string
          template_nom?: string | null
          contenu: string
          statut?: string
          provider?: string
          provider_message_id?: string | null
          provider_data?: Record<string, unknown>
          erreur?: string | null
          envoye_par?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          appointment_id?: string | null
          canal?: string
          destinataire?: string
          template_nom?: string | null
          contenu?: string
          statut?: string
          provider?: string
          provider_message_id?: string | null
          provider_data?: Record<string, unknown>
          erreur?: string | null
          envoye_par?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_lead_id_fkey",
            columns: ["lead_id"],
            isOneToOne: false,
            referencedRelation: "leads",
            referencedColumns: ["id"],
          },
        ]
      }

      // ----------------------------------------------------------
      // telephony_events
      // ----------------------------------------------------------
      telephony_events: {
        Row: {
          id: string
          lead_id: string | null
          call_id: string | null
          agent_id: string | null
          provider: string
          provider_call_id: string | null
          event_type: string
          payload: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          call_id?: string | null
          agent_id?: string | null
          provider?: string
          provider_call_id?: string | null
          event_type: string
          payload?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          call_id?: string | null
          agent_id?: string | null
          provider?: string
          provider_call_id?: string | null
          event_type?: string
          payload?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // integration_settings
      // ----------------------------------------------------------
      integration_settings: {
        Row: {
          cle: string
          valeur: Record<string, unknown>
          actif: boolean
          updated_at: string
        }
        Insert: {
          cle: string
          valeur?: Record<string, unknown>
          actif?: boolean
          updated_at?: string
        }
        Update: {
          cle?: string
          valeur?: Record<string, unknown>
          actif?: boolean
          updated_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // data_requests
      // ----------------------------------------------------------
      data_requests: {
        Row: {
          id: string
          lead_id: string | null
          type: string
          statut: string
          demandeur_nom: string
          demandeur_contact: string
          motif: string | null
          reponse: string | null
          traite_par: string | null
          traite_le: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          type: string
          statut?: string
          demandeur_nom: string
          demandeur_contact: string
          motif?: string | null
          reponse?: string | null
          traite_par?: string | null
          traite_le?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          type?: string
          statut?: string
          demandeur_nom?: string
          demandeur_contact?: string
          motif?: string | null
          reponse?: string | null
          traite_par?: string | null
          traite_le?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }

    Views: {
      v_leads_funnel: {
        Row: {
          statut: LeadStatus
          total: number
          trente_jours: number
        }
        Relationships: []
      }
      v_leads_daily: {
        Row: {
          jour: string
          total: number
        }
        Relationships: []
      }
      v_calls_daily: {
        Row: {
          jour: string
          appels: number
          duree_moyenne: number
          agents_actifs: number
        }
        Relationships: []
      }
      v_appointments_daily: {
        Row: {
          jour: string
          total: number
          confirmes: number
          effectues: number
          absents: number
        }
        Relationships: []
      }
      v_sources_performance: {
        Row: {
          source: string
          leads: number
          qualifies: number
          rdv: number
          gagnes: number
          taux_rdv: number
        }
        Relationships: []
      }
      v_agent_performance: {
        Row: {
          id: string
          agent: string
          role: UserRole
          appels: number
          rdv_pris: number
          leads_traites: number
        }
        Relationships: []
      }
    }

    Functions: {
      cadence_prochaine_echeance: {
        Args: { p_tentatives: number; p_base?: string }
        Returns: string
      }
      escalader_leads_sla: {
        Args: { p_seuil_minutes?: number }
        Returns: number
      }
      generer_confirmations_j1: {
        Args: Record<string, never>
        Returns: number
      }
      get_appointment_by_token: {
        Args: { p_token: string }
        Returns: Record<string, unknown> | null
      }
      confirm_appointment_by_token: {
        Args: { p_token: string; p_action?: string }
        Returns: Record<string, unknown>
      }
      anonymiser_lead: {
        Args: { p_lead_id: string }
        Returns: boolean
      }
    }

    Enums: {
      user_role: UserRole
      team_type: TeamType
      lead_status: LeadStatus
      call_direction: CallDirection
      appointment_type: AppointmentType
      appointment_status: AppointmentStatus
      agent_availability: AgentAvailability
      activity_type: ActivityType
      task_type: TaskType
      task_status: TaskStatus
      disposition_action: DispositionAction
    }
  }
}

// ============================================================
// HELPER TYPES
// ============================================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
