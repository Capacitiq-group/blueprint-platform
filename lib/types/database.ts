// ==============================================================================
// Hand-maintained TypeScript types mirroring supabase/migrations/0001_init.sql.
//
// If you have the Supabase CLI available, you can regenerate this file
// automatically instead of maintaining it by hand:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > lib/types/database.ts
//
// NOTE ON `Relationships`: each table below declares its real foreign keys
// (matching supabase/migrations/0001_init.sql) in the shape supabase-js's
// generic type machinery expects. This isn't decorative — it's what makes
// embedded/joined selects like `.select('*, businesses(name)')` resolve to
// the correct type instead of `never`. Foreign keys to `auth.users` are
// omitted since that table isn't modelled here and the app never embeds
// through it.
// ==============================================================================

export type MeetingStatus = 'setup' | 'live' | 'completed';
export type DocumentStatus = 'draft' | 'approved' | 'outdated';
export type Speaker = 'user' | 'other' | 'unknown';
export type SuggestionType = 'script' | 'alert' | 'stage';
export type Confidence = 'confirmed' | 'inferred' | 'unknown';
export type MemberRole = 'owner' | 'member';
export type NoteCategory =
  | 'key_point'
  | 'need'
  | 'pain_point'
  | 'question'
  | 'objection'
  | 'opportunity'
  | 'decision'
  | 'commitment'
  | 'risk'
  | 'follow_up'
  | 'entity'
  | 'pricing';

export interface ProductServiceItem {
  name: string;
  description?: string;
  features?: string[];
  benefits?: string[];
  pricing?: string;
  package?: string;
  addons?: string[];
  limitations?: string;
  faq?: { question: string; answer: string }[];
}

export interface PositioningSection {
  value_proposition?: string;
  unique_selling_points?: string[];
  competitive_positioning?: string;
  ideal_customer_profile?: string;
  target_industries?: string[];
  pain_points?: string[];
  differentiators?: string[];
}

export interface CommercialSection {
  pricing_rules?: string;
  discount_rules?: string;
  negotiation_boundaries?: string;
  payment_terms?: string;
  contract_information?: string;
  sales_policies?: string;
  approval_requirements?: string;
}

export interface OperationsSection {
  internal_processes?: string;
  sops?: string;
  escalation_procedures?: string;
  delivery_procedures?: string;
  onboarding_procedures?: string;
  offboarding_procedures?: string;
  internal_responsibilities?: string;
}

export interface BrandVoiceSection {
  tone?: string[];
  style?: string[];
  behaviour?: string[];
  preferred_terminology?: string;
  words_to_use?: string;
  words_to_avoid?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; email: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          legal_name: string | null;
          trading_name: string | null;
          website: string | null;
          industry: string | null;
          location: string | null;
          description: string | null;
          stage: string | null;
          target_market: string | null;
          products_services: ProductServiceItem[];
          positioning: PositioningSection;
          commercial: CommercialSection;
          operations: OperationsSection;
          brand_voice: BrandVoiceSection;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['businesses']['Row']> & {
          name: string;
          owner_id: string;
        };
        Update: Partial<Database['public']['Tables']['businesses']['Row']>;
        Relationships: [];
      };
      business_members: {
        Row: {
          business_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['business_members']['Row']> & {
          business_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['business_members']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'business_members_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          }
        ];
      };
      knowledge_documents: {
        Row: {
          id: string;
          business_id: string;
          category: string;
          title: string;
          content: string;
          status: DocumentStatus;
          version: number;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['knowledge_documents']['Row']> & {
          business_id: string;
          title: string;
          owner_id: string;
        };
        Update: Partial<Database['public']['Tables']['knowledge_documents']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'knowledge_documents_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          }
        ];
      };
      contacts: {
        Row: {
          id: string;
          business_id: string;
          name: string | null;
          company: string | null;
          email: string | null;
          phone: string | null;
          linkedin: string | null;
          website: string | null;
          crm_record: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['contacts']['Row']> & { business_id: string };
        Update: Partial<Database['public']['Tables']['contacts']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'contacts_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          }
        ];
      };
      meetings: {
        Row: {
          id: string;
          business_id: string;
          contact_id: string | null;
          company_name: string | null;
          meeting_types: string[];
          objective: string | null;
          pre_context: string | null;
          status: MeetingStatus;
          current_stage: string | null;
          started_at: string | null;
          ended_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['meetings']['Row']> & {
          business_id: string;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['meetings']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'meetings_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meetings_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'contacts';
            referencedColumns: ['id'];
          }
        ];
      };
      meeting_transcript_entries: {
        Row: {
          id: string;
          meeting_id: string;
          speaker: Speaker;
          content: string;
          is_final: boolean;
          spoken_at: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['meeting_transcript_entries']['Row']> & {
          meeting_id: string;
          content: string;
        };
        Update: Partial<Database['public']['Tables']['meeting_transcript_entries']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'meeting_transcript_entries_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: false;
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          }
        ];
      };
      meeting_notes: {
        Row: {
          id: string;
          meeting_id: string;
          category: NoteCategory;
          content: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['meeting_notes']['Row']> & {
          meeting_id: string;
          category: NoteCategory;
          content: string;
        };
        Update: Partial<Database['public']['Tables']['meeting_notes']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'meeting_notes_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: false;
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          }
        ];
      };
      ai_suggestions: {
        Row: {
          id: string;
          meeting_id: string;
          type: SuggestionType;
          stage: string | null;
          headline: string | null;
          content: string;
          reasoning: string | null;
          confidence: Confidence;
          source_documents: { id: string; title: string }[];
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_suggestions']['Row']> & {
          meeting_id: string;
          type: SuggestionType;
          content: string;
        };
        Update: Partial<Database['public']['Tables']['ai_suggestions']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'ai_suggestions_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: false;
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          }
        ];
      };
      meeting_summaries: {
        Row: {
          id: string;
          meeting_id: string;
          summary: string | null;
          key_points: string[];
          decisions: string[];
          actions: string[];
          next_steps: string[];
          follow_up_draft: string | null;
          generated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['meeting_summaries']['Row']> & {
          meeting_id: string;
        };
        Update: Partial<Database['public']['Tables']['meeting_summaries']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'meeting_summaries_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: true;
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Business = Database['public']['Tables']['businesses']['Row'];
export type KnowledgeDocument = Database['public']['Tables']['knowledge_documents']['Row'];
export type Contact = Database['public']['Tables']['contacts']['Row'];
export type Meeting = Database['public']['Tables']['meetings']['Row'];
export type TranscriptEntry = Database['public']['Tables']['meeting_transcript_entries']['Row'];
export type MeetingNote = Database['public']['Tables']['meeting_notes']['Row'];
export type AiSuggestion = Database['public']['Tables']['ai_suggestions']['Row'];
export type MeetingSummary = Database['public']['Tables']['meeting_summaries']['Row'];

export const MEETING_TYPE_OPTIONS = [
  'Sales', 'Cold Prospecting', 'Discovery Call', 'Product Demo', 'Pricing Discussion',
  'Negotiation', 'Closing', 'Follow-Up',
  'Partnership Discovery', 'Strategic Partnership', 'Agency Partnership', 'Technology Partnership',
  'Referral Discussion', 'Integration Discussion',
  'Client Onboarding', 'Client Check-In', 'Client Review', 'Client Escalation',
  'Client Support', 'Client Renewal', 'Client Offboarding',
  'Team Meeting', 'Project Meeting', 'Planning Session', 'Strategy Session',
  'Management Meeting', 'Performance Discussion', 'Operational Review',
  'Investor Discussion', 'Supplier Discussion', 'Vendor Meeting', 'Networking', 'Stakeholder Meeting',
  'Other / Custom',
] as const;

export const KNOWLEDGE_CATEGORIES = [
  'company', 'products', 'services', 'pricing', 'sales', 'operations',
  'policies', 'legal', 'brand', 'customers', 'competitors', 'processes', 'faq', 'general',
] as const;
