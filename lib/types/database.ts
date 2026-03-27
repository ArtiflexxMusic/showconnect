// ============================================================
// ShowConnect – Database Types
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
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
        Relationships: []
      }
      shows: {
        Row: Show
        Insert: Omit<Show, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Show, 'id' | 'created_at'>>
        Relationships: []
      }
      rundowns: {
        Row: Rundown
        Insert: Omit<Rundown, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Rundown, 'id' | 'created_at'>>
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
        Row: Cue
        Insert: Omit<Cue, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Cue, 'id' | 'created_at'>>
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
