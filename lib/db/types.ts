export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OpportunityCategory =
  | 'website'
  | 'mobile_app'
  | 'custom_software'
  | 'ai_solution'
  | 'workflow_automation'
  | 'other';

export type SignalStrength =
  | 'explicit_request'
  | 'strong_signal'
  | 'weak_signal'
  | 'none';

export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'needs_review'
  | 'failed';

export type LeadStatus =
  | 'new'
  | 'review'
  | 'approved'
  | 'contacted'
  | 'interested'
  | 'not_a_fit'
  | 'won'
  | 'lost';

export type PriorityLevel = 'high' | 'medium' | 'low';
export type RunStatus = 'running' | 'succeeded' | 'partial' | 'failed';
export type CaptureStatus =
  | 'captured'
  | 'blocked_robots'
  | 'blocked_auth'
  | 'blocked_captcha'
  | 'fetch_failed'
  | 'prefilter_rejected'
  | 'ai_rejected'
  | 'already_seen'
  | 'suppressed'
  | 'deferred';

export type ContactRouteType =
  | 'official_contact_page'
  | 'published_generic_email'
  | 'source_listing'
  | 'none';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'admin' | 'reviewer';
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: 'admin' | 'reviewer';
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: 'admin' | 'reviewer';
          display_name?: string | null;
          created_at?: string;
        };
      };
      bots: {
        Row: {
          id: number;
          code: string;
          name: string;
          department: 'A' | 'B' | 'C' | 'D';
          category: OpportunityCategory | null;
          enabled: boolean;
          mvp: boolean;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: number;
          code: string;
          name: string;
          department: 'A' | 'B' | 'C' | 'D';
          category?: OpportunityCategory | null;
          enabled?: boolean;
          mvp?: boolean;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          code?: string;
          name?: string;
          department?: 'A' | 'B' | 'C' | 'D';
          category?: OpportunityCategory | null;
          enabled?: boolean;
          mvp?: boolean;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_profile: {
        Row: {
          id: string;
          service_key: string;
          name: string;
          category: OpportunityCategory;
          description: string | null;
          keywords: string[];
          technologies: string[];
          active: boolean;
          approved_by_owner: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service_key: string;
          name: string;
          category: OpportunityCategory;
          description?: string | null;
          keywords?: string[];
          technologies?: string[];
          active?: boolean;
          approved_by_owner?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          service_key?: string;
          name?: string;
          category?: OpportunityCategory;
          description?: string | null;
          keywords?: string[];
          technologies?: string[];
          active?: boolean;
          approved_by_owner?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      kb_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
      };
      sources: {
        Row: {
          id: string;
          name: string;
          source_type: 'search_api' | 'rss' | 'api' | 'seed_list' | 'manual';
          base_url: string | null;
          terms_url: string | null;
          terms_reviewed: boolean;
          terms_reviewed_at: string | null;
          automated_collection_allowed: boolean;
          reliability_score: number;
          enabled: boolean;
          bot_ids: number[];
          config: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          source_type: 'search_api' | 'rss' | 'api' | 'seed_list' | 'manual';
          base_url?: string | null;
          terms_url?: string | null;
          terms_reviewed?: boolean;
          terms_reviewed_at?: string | null;
          automated_collection_allowed?: boolean;
          reliability_score?: number;
          enabled?: boolean;
          bot_ids?: number[];
          config?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          source_type?: 'search_api' | 'rss' | 'api' | 'seed_list' | 'manual';
          base_url?: string | null;
          terms_url?: string | null;
          terms_reviewed?: boolean;
          terms_reviewed_at?: string | null;
          automated_collection_allowed?: boolean;
          reliability_score?: number;
          enabled?: boolean;
          bot_ids?: number[];
          config?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      seed_urls: {
        Row: {
          id: string;
          url: string;
          label: string | null;
          bot_ids: number[];
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          label?: string | null;
          bot_ids?: number[];
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          label?: string | null;
          bot_ids?: number[];
          active?: boolean;
          created_at?: string;
        };
      };
      domain_policy: {
        Row: {
          domain: string;
          status: 'allowed' | 'blocked_robots' | 'blocked_auth' | 'blocked_captcha' | 'blocked_manual';
          robots_checked_at: string | null;
          robots_txt_hash: string | null;
          blocked_until: string | null;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          domain: string;
          status?: 'allowed' | 'blocked_robots' | 'blocked_auth' | 'blocked_captcha' | 'blocked_manual';
          robots_checked_at?: string | null;
          robots_txt_hash?: string | null;
          blocked_until?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          domain?: string;
          status?: 'allowed' | 'blocked_robots' | 'blocked_auth' | 'blocked_captcha' | 'blocked_manual';
          robots_checked_at?: string | null;
          robots_txt_hash?: string | null;
          blocked_until?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      suppression_list: {
        Row: {
          id: string;
          domain: string | null;
          email: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          domain?: string | null;
          email?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          domain?: string | null;
          email?: string | null;
          reason?: string | null;
          created_at?: string;
        };
      };
      agent_runs: {
        Row: {
          id: string;
          bot_id: number;
          workflow: string;
          n8n_execution_id: string | null;
          trigger: 'schedule' | 'manual' | 'webhook' | 'dashboard';
          dry_run: boolean;
          status: RunStatus;
          started_at: string;
          finished_at: string | null;
          stats: Json;
          error: string | null;
        };
        Insert: {
          id?: string;
          bot_id: number;
          workflow: string;
          n8n_execution_id?: string | null;
          trigger: 'schedule' | 'manual' | 'webhook' | 'dashboard';
          dry_run?: boolean;
          status?: RunStatus;
          started_at?: string;
          finished_at?: string | null;
          stats?: Json;
          error?: string | null;
        };
        Update: {
          id?: string;
          bot_id?: number;
          workflow?: string;
          n8n_execution_id?: string | null;
          trigger?: 'schedule' | 'manual' | 'webhook' | 'dashboard';
          dry_run?: boolean;
          status?: RunStatus;
          started_at?: string;
          finished_at?: string | null;
          stats?: Json;
          error?: string | null;
        };
      };
      companies: {
        Row: {
          id: string;
          name: string;
          normalized_name: string;
          domain: string | null;
          official_website: string | null;
          industry: string | null;
          country: string | null;
          city: string | null;
          contact_route_type: ContactRouteType;
          contact_route_url: string | null;
          contact_email_generic: string | null;
          date_checked: string;
          is_suppressed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          normalized_name: string;
          domain?: string | null;
          official_website?: string | null;
          industry?: string | null;
          country?: string | null;
          city?: string | null;
          contact_route_type?: ContactRouteType;
          contact_route_url?: string | null;
          contact_email_generic?: string | null;
          date_checked?: string;
          is_suppressed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          normalized_name?: string;
          domain?: string | null;
          official_website?: string | null;
          industry?: string | null;
          country?: string | null;
          city?: string | null;
          contact_route_type?: ContactRouteType;
          contact_route_url?: string | null;
          contact_email_generic?: string | null;
          date_checked?: string;
          is_suppressed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      source_evidence: {
        Row: {
          id: string;
          run_id: string | null;
          bot_id: number | null;
          source_id: string | null;
          company_id: string | null;
          source_url: string;
          canonical_url: string;
          source_published_at: string | null;
          date_checked: string;
          http_status: number | null;
          capture_status: CaptureStatus;
          robots_allowed: boolean | null;
          content_hash: string | null;
          excerpt: string | null;
          rejected_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id?: string | null;
          bot_id?: number | null;
          source_id?: string | null;
          company_id?: string | null;
          source_url: string;
          canonical_url: string;
          source_published_at?: string | null;
          date_checked?: string;
          http_status?: number | null;
          capture_status: CaptureStatus;
          robots_allowed?: boolean | null;
          content_hash?: string | null;
          excerpt?: string | null;
          rejected_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          run_id?: string | null;
          bot_id?: number | null;
          source_id?: string | null;
          company_id?: string | null;
          source_url?: string;
          canonical_url?: string;
          source_published_at?: string | null;
          date_checked?: string;
          http_status?: number | null;
          capture_status?: CaptureStatus;
          robots_allowed?: boolean | null;
          content_hash?: string | null;
          excerpt?: string | null;
          rejected_reason?: string | null;
          created_at?: string;
        };
      };
      ai_analyses: {
        Row: {
          id: string;
          content_hash: string;
          task: string;
          prompt_version: string;
          provider: string;
          model: string;
          output: Json | null;
          valid: boolean;
          error: string | null;
          prompt_tokens: number | null;
          output_tokens: number | null;
          latency_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          content_hash: string;
          task: string;
          prompt_version: string;
          provider: string;
          model: string;
          output?: Json | null;
          valid: boolean;
          error?: string | null;
          prompt_tokens?: number | null;
          output_tokens?: number | null;
          latency_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          content_hash?: string;
          task?: string;
          prompt_version?: string;
          provider?: string;
          model?: string;
          output?: Json | null;
          valid?: boolean;
          error?: string | null;
          prompt_tokens?: number | null;
          output_tokens?: number | null;
          latency_ms?: number | null;
          created_at?: string;
        };
      };
      scoring_config: {
        Row: {
          version: number;
          weights: Json;
          thresholds: Json;
          active: boolean;
          created_at: string;
        };
        Insert: {
          version: number;
          weights: Json;
          thresholds: Json;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          version?: number;
          weights?: Json;
          thresholds?: Json;
          active?: boolean;
          created_at?: string;
        };
      };
      opportunities: {
        Row: {
          id: string;
          company_id: string;
          evidence_id: string;
          assigned_bot_id: number;
          also_found_by: number[];
          category: OpportunityCategory;
          signal: SignalStrength;
          title: string;
          stated_requirement: string;
          evidence_quote: string;
          ai_hypotheses: Json;
          matched_service_keys: string[];
          scope_clarity: 'clear' | 'partial' | 'vague' | null;
          score: number;
          score_breakdown: Json;
          score_version: number;
          priority: PriorityLevel;
          confidence: number;
          verification: VerificationStatus;
          verification_checks: Json;
          status: LeadStatus;
          dedupe_key: string;
          possible_duplicate_of: string | null;
          reviewer_notes: string | null;
          last_researched_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          evidence_id: string;
          assigned_bot_id: number;
          also_found_by?: number[];
          category: OpportunityCategory;
          signal: SignalStrength;
          title: string;
          stated_requirement: string;
          evidence_quote: string;
          ai_hypotheses?: Json;
          matched_service_keys?: string[];
          scope_clarity?: 'clear' | 'partial' | 'vague' | null;
          score: number;
          score_breakdown: Json;
          score_version: number;
          priority: PriorityLevel;
          confidence: number;
          verification?: VerificationStatus;
          verification_checks?: Json;
          status?: LeadStatus;
          dedupe_key: string;
          possible_duplicate_of?: string | null;
          reviewer_notes?: string | null;
          last_researched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          evidence_id?: string;
          assigned_bot_id?: number;
          also_found_by?: number[];
          category?: OpportunityCategory;
          signal?: SignalStrength;
          title?: string;
          stated_requirement?: string;
          evidence_quote?: string;
          ai_hypotheses?: Json;
          matched_service_keys?: string[];
          scope_clarity?: 'clear' | 'partial' | 'vague' | null;
          score?: number;
          score_breakdown?: Json;
          score_version?: number;
          priority?: PriorityLevel;
          confidence?: number;
          verification?: VerificationStatus;
          verification_checks?: Json;
          status?: LeadStatus;
          dedupe_key?: string;
          possible_duplicate_of?: string | null;
          reviewer_notes?: string | null;
          last_researched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      lead_status_history: {
        Row: {
          id: number;
          opportunity_id: string;
          from_status: LeadStatus | null;
          to_status: LeadStatus;
          changed_by: string | null;
          note: string | null;
          changed_at: string;
        };
        Insert: {
          id?: number;
          opportunity_id: string;
          from_status?: LeadStatus | null;
          to_status: LeadStatus;
          changed_by?: string | null;
          note?: string | null;
          changed_at?: string;
        };
        Update: {
          id?: number;
          opportunity_id?: string;
          from_status?: LeadStatus | null;
          to_status?: LeadStatus;
          changed_by?: string | null;
          note?: string | null;
          changed_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: number;
          table_name: string;
          record_id: string | null;
          action: string;
          actor_id: string | null;
          actor_type: string;
          old_data: Json | null;
          new_data: Json | null;
          at: string;
        };
        Insert: {
          id?: number;
          table_name: string;
          record_id?: string | null;
          action: string;
          actor_id?: string | null;
          actor_type: string;
          old_data?: Json | null;
          new_data?: Json | null;
          at?: string;
        };
        Update: {
          id?: number;
          table_name?: string;
          record_id?: string | null;
          action?: string;
          actor_id?: string | null;
          actor_type?: string;
          old_data?: Json | null;
          new_data?: Json | null;
          at?: string;
        };
      };
    };
    Views: {
      v_leads: {
        Row: {
          id: string;
          company_name: string;
          official_website: string | null;
          industry: string | null;
          category: OpportunityCategory;
          source_url: string;
          source_published_at: string | null;
          date_checked: string;
          evidence_summary: string;
          evidence_quote: string;
          signal: SignalStrength;
          contact_route_type: ContactRouteType;
          contact_route: string | null;
          priority: PriorityLevel;
          score: number;
          confidence: number;
          verification: VerificationStatus;
          assigned_bot_id: number;
          assigned_bot_name: string;
          also_found_by: number[];
          status: LeadStatus;
          matched_service_keys: string[];
          created_at: string;
        };
      };
    };
    Functions: {
      is_staff: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      change_lead_status: {
        Args: {
          p_id: string;
          p_to: LeadStatus;
          p_note?: string;
        };
        Returns: Database['public']['Tables']['opportunities']['Row'];
      };
      update_reviewer_notes: {
        Args: {
          p_id: string;
          p_notes: string;
        };
        Returns: void;
      };
      filter_unseen_urls: {
        Args: {
          p_urls: string[];
          p_days?: number;
        };
        Returns: string[];
      };
    };
  };
}
