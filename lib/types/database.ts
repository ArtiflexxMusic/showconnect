// ============================================================
// CueBoard – Database Types
// ============================================================

export type CueType = 'video' | 'audio' | 'lighting' | 'speech' | 'break' | 'custom' | 'intro' | 'outro'
export type CueStatus = 'pending' | 'running' | 'done' | 'skipped'
export type UserRole = 'beheerder' | 'admin' | 'crew'
export type ShowMemberRole = 'owner' | 'editor' | 'caller' | 'crew' | 'presenter' | 'viewer'

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
  is_locked: boolean                    // Vergrendeld tijdens live show
  show_start_time: string | null        // "HH:MM:SS" – configeerbare showstarttijd
  companion_webhook_url: string | null  // HTTP URL voor Bitfocus Companion
  presenter_pin: string | null          // 4-cijferige PIN voor presenter view
  notes: string | null                  // Algemene notities zichtbaar in caller & crew
  // Show-breed slide deck (voor stage output)
  slide_url: string | null
  slide_path: string | null
  slide_type: 'pdf' | 'pptx' | 'ppt' | null
  slide_filename: string | null
  // Still image (fallback achtergrond op stage output tussen sprekers)
  still_url: string | null
  still_path: string | null
  created_at: string
  updated_at: string
}

export interface RundownSnapshot {
  id: string
  rundown_id: string
  label: string
  cues_json: import('./database').Cue[]
  created_by: string | null
  created_at: string
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
  // UI / UX uitbreidingen
  color: string | null           // Hex kleurcode voor visueel label (bijv. '#ef4444')
  auto_advance: boolean | null   // Automatisch volgende cue starten bij 0
  // Presentatie / slides (per-cue, verouderd — gebruik rundown-level slide_url)
  presentation_url: string | null       // Publieke URL in Supabase Storage
  presentation_path: string | null      // Pad in de bucket
  presentation_type: 'pdf' | 'pptx' | null  // Bestandstype
  presentation_filename: string | null  // Originele bestandsnaam
  slide_control_mode: 'caller' | 'presenter' | 'both' | null  // Wie bedient de slides
  current_slide_index: number | null    // Huidige slide (0-based)
  // Stage output
  slide_index: number | null            // Welke slide auto-jump bij GO (0-based, gebruik rundown slide deck)
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

export interface ShowMember {
  id: string
  show_id: string
  user_id: string
  role: ShowMemberRole
  invited_by: string | null
  created_at: string
  // Joined
  profile?: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'>
}

export interface RundownTemplate {
  id: string
  name: string
  description: string | null
  created_by: string | null
  cues_json: TemplateCue[]
  is_public: boolean
  created_at: string
}

export interface TemplateCue {
  title: string
  type: CueType
  duration_seconds: number
  notes?: string | null
  tech_notes?: string | null
  presenter?: string | null
  location?: string | null
}

export interface Invitation {
  id: string
  show_id: string
  email: string
  role: ShowMemberRole
  token: string
  invited_by: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
}

// ─── Cast Portal ──────────────────────────────────────────────────────────────
export interface CastMember {
  id: string
  show_id: string
  name: string
  role: string | null
  color: string
  notes: string | null
  pin: string | null
  created_at: string
}

export interface CastPortalLink {
  id: string
  cast_member_id: string | null
  show_id: string
  token: string
  label: string | null
  created_at: string
  cast_member?: CastMember
}

// ─── Audio / Mic Patch ────────────────────────────────────────────────────────
export type AudioDeviceType = 'handheld' | 'headset' | 'lapel' | 'table' | 'iem'
export type AudioPhase = 'before' | 'during' | 'after'

export interface AudioDevice {
  id: string
  show_id: string
  name: string
  type: AudioDeviceType
  channel: number | null
  color: string
  notes: string | null
  created_at: string
}

export interface CueAudioAssignment {
  id: string
  cue_id: string
  device_id: string
  person_name: string | null
  phase: AudioPhase
  created_at: string
  device?: AudioDevice
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
  color?: string | null
  auto_advance?: boolean | null
  // Presentatie / slides
  presentation_url?: string | null
  presentation_path?: string | null
  presentation_type?: 'pdf' | 'pptx' | null
  presentation_filename?: string | null
  slide_control_mode?: 'caller' | 'presenter' | 'both' | null
  current_slide_index?: number | null
  slide_index?: number | null
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
  notes?: string | null
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
          is_locked: boolean
          show_start_time: string | null
          companion_webhook_url: string | null
          presenter_pin: string | null
          notes: string | null
          slide_url: string | null
          slide_path: string | null
          slide_type: 'pdf' | 'pptx' | 'ppt' | null
          slide_filename: string | null
          still_url: string | null
          still_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          show_id: string
          name: string
          is_active?: boolean
          is_locked?: boolean
          show_start_time?: string | null
          companion_webhook_url?: string | null
          presenter_pin?: string | null
          notes?: string | null
          slide_url?: string | null
          slide_path?: string | null
          slide_type?: 'pdf' | 'pptx' | 'ppt' | null
          slide_filename?: string | null
          still_url?: string | null
          still_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          show_id?: string
          name?: string
          is_active?: boolean
          is_locked?: boolean
          show_start_time?: string | null
          companion_webhook_url?: string | null
          presenter_pin?: string | null
          notes?: string | null
          slide_url?: string | null
          slide_path?: string | null
          slide_type?: 'pdf' | 'pptx' | 'ppt' | null
          slide_filename?: string | null
          still_url?: string | null
          still_path?: string | null
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
          color: string | null
          auto_advance: boolean | null
          presentation_url: string | null
          presentation_path: string | null
          presentation_type: 'pdf' | 'pptx' | null
          presentation_filename: string | null
          slide_control_mode: 'caller' | 'presenter' | 'both' | null
          current_slide_index: number | null
          slide_index: number | null
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
          color?: string | null
          auto_advance?: boolean | null
          presentation_url?: string | null
          presentation_path?: string | null
          presentation_type?: 'pdf' | 'pptx' | null
          presentation_filename?: string | null
          slide_control_mode?: 'caller' | 'presenter' | 'both' | null
          current_slide_index?: number | null
          slide_index?: number | null
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
          color?: string | null
          auto_advance?: boolean | null
          presentation_url?: string | null
          presentation_path?: string | null
          presentation_type?: 'pdf' | 'pptx' | null
          presentation_filename?: string | null
          slide_control_mode?: 'caller' | 'presenter' | 'both' | null
          current_slide_index?: number | null
          slide_index?: number | null
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
      show_members: {
        Row: {
          id: string
          show_id: string
          user_id: string
          role: ShowMemberRole
          invited_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          show_id: string
          user_id: string
          role: ShowMemberRole
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          show_id?: string
          user_id?: string
          role?: ShowMemberRole
          invited_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'show_members_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'show_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      invitations: {
        Row: {
          id: string
          show_id: string
          email: string
          role: ShowMemberRole
          token: string
          invited_by: string | null
          accepted_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          show_id: string
          email: string
          role: ShowMemberRole
          token?: string
          invited_by?: string | null
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          role?: ShowMemberRole
          accepted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_show_id_fkey'
            columns: ['show_id']
            isOneToOne: false
            referencedRelation: 'shows'
            referencedColumns: ['id']
          }
        ]
      }
      rundown_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string | null
          cues_json: TemplateCue[]
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by?: string | null
          cues_json: TemplateCue[]
          is_public?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          cues_json?: TemplateCue[]
          is_public?: boolean
        }
        Relationships: []
      }
      cue_log: {
        Row: {
          id: string
          cue_id: string | null
          rundown_id: string
          show_id: string | null
          cue_title: string
          cue_type: string | null
          cue_position: number | null
          triggered_by: string | null
          triggered_at: string
          duration_seconds: number | null
        }
        Insert: {
          id?: string
          cue_id?: string | null
          rundown_id: string
          show_id?: string | null
          cue_title: string
          cue_type?: string | null
          cue_position?: number | null
          triggered_by?: string | null
          triggered_at?: string
          duration_seconds?: number | null
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      cue_status: CueStatus
      cue_type: CueType
      user_role: 'beheerder' | 'admin' | 'crew'
      show_member_role: 'owner' | 'editor' | 'caller' | 'crew' | 'presenter' | 'viewer'
    }
    CompositeTypes: Record<string, never>
  }
}
