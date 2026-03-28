// ============================================================
// CueBoard – Database Types
// ============================================================

export type CueType = 'video' | 'audio' | 'lighting' | 'speech' | 'break' | 'custom' | 'intro' | 'outro'
export type CueStatus = 'pending' | 'running' | 'done' | 'skipped'
export type UserRole = 'admin' | 'crew'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Show {
  id: string
  name: string
  date: string | null
  venue: string | null
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Rundown {
  id: string
  show_id: string
  name: string
  is_active: boolean
  show_start_time: string | null        // "HH:MM:SS" – configeerbare showstarttijd
  companion_webhook_url: string | null  // HTTP URL voor Bitfocus Companion
  presenter_pin: string | null          // 4-cijferige PIN voor presenter view
  created_at: string
  updated_at: string
}

export interface Cue {
  id: string
  rundown_id: string
  position: number
  title: string
  type: CueType
  duration_seconds: number
  notes: string | null
  tech_notes: string | null   // Technische notities (alleen voor technici)
  presenter: string | null    // Naam van de spreker/presentator
  location: string | null     // Ruimte / podium / locatie
  status: CueStatus
  started_at: string | null
  // Media
  media_url: string | null      // Publieke URL in Supabase Storage
  media_path: string | null     // Pad in de bucket (voor verwijderen)
  media_type: string | null     // MIME-type (audio/mp3, video/mp4, etc.)
  media_filename: string | null // Originele bestandsnaam
  media_size: number | null     // Bestandsgrootte in bytes
  media_volume: number | null   // Volume 0.0–1.0 (default 1.0)
  media_loop: boolean | null    // Herhalen
  media_autoplay: boolean | null // Automatisch afspelen bij GO
  created_at: string
  updated_at: string
}

// Extended types
export interface ShowWithRundowns extends Show {
  rundowns: Rundown[]
}

export interface RundownWithCues extends Rundown {
  cues: Cue[]
  show: Show
}

// Form types
export interface CreateCueInput {
  title: string
  type: CueType
  duration_seconds: number
  notes?: string
  tech_notes?: string
  presenter?: string
  location?: string
  // Media (optioneel)
  media_url?: string | null
  media_path?: string | null
  media_type?: string | null
  media_filename?: string | null
  media_size?: number | null
  media_volume?: number | null
  media_loop?: boolean | null
  media_autoplay?: boolean | null
}

export interface UpdateCueInput extends Partial<CreateCueInput> {
  status?: CueStatus
  position?: number
  started_at?: string | null
}

export interface CreateShowInput {
  name: string
  date?: string
  venue?: string
  description?: string
}

export interface CreateRundownInput {
  show_id: string
  name: string
}

export interface UpdateRundownInput {
  name?: string
  is_active?: boolean
  show_start_time?: string | null
  companion_webhook_url?: string | null
  presenter_pin?: string | null
}

// ─── Supabase Database type definitie ───────────────────────────────────────
// Formaat is gebaseerd op de door Supabase gegenereerde types (supabase gen types typescript)
// id, created_at, updated_at zijn optioneel in Insert (niet omitted) – ze hebben database-defaults
// Nullable velden zijn ook optioneel in Insert

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shows: {
        Row: {
          id: string
          name: string
          date: string | null
          venue: string | null
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          date?: string | null
          venue?: string | null
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          date?: string | null
          venue?: string | null
          description?: string | null
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rundowns: {
        Row: {
          id: string
          show_id: string
          name: string
          is_active: boolean
          show_start_time: string | null
          companion_webhook_url: string | null
          presenter_pin: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          show_id: string
          name: string
          is_active?: boolean
          show_start_time?: string | null
          companion_webhook_url?: string | null
          presenter_pin?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          show_id?: string
          name?: string
          is_active?: boolean
          show_start_time?: string | null
          companion_webhook_url?: string | null
          presenter_pin?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rundowns_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          }
        ]
      }
      cues: {
        Row: {
          id: string
          rundown_id: string
          position: number
          title: string
          type: CueType
          duration_seconds: number
          notes: string | null
          tech_notes: string | null
          presenter: string | null
          location: string | null
          status: CueStatus
          started_at: string | null
          media_url: string | null
          media_path: string | null
          media_type: string | null
          media_filename: string | null
          media_size: number | null
          media_volume: number | null
          media_loop: boolean | null
          media_autoplay: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rundown_id: string
          position: number
          title: string
          type: CueType
          duration_seconds: number
          notes?: string | null
          tech_notes?: string | null
          presenter?: string | null
          location?: string | null
          status?: CueStatus
          started_at?: string | null
          media_url?: string | null
          media_path?: string | null
          media_type?: string | null
          media_filename?: string | null
          media_size?: number | null
          media_volume?: number | null
          media_loop?: boolean | null
          media_autoplay?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rundown_id?: string
          position?: number
          title?: string
          type?: CueType
          duration_seconds?: number
          notes?: string | null
          tech_notes?: string | null
          presenter?: string | null
          location?: string | null
          status?: CueStatus
          started_at?: string | null
          media_url?: string | null
          media_path?: string | null
          media_type?: string | null
          media_filename?: string | null
          media_size?: number | null
          media_volume?: number | null
          media_loop?: boolean | null
          media_autoplay?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cues_rundown_id_fkey'
            columns: ['rundown_id']
            isOneToOne: false
            referencedRelation: 'rundowns'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      cue_status: CueStatus
      cue_type: CueType
      user_role: UserRole
    }
    CompositeTypes: Record<string, never>
  }
}
