export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          company_name: string | null
          siren: string | null
          email: string
          plan: 'starter' | 'pro' | 'business' | 'free_trial'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          invoice_count_month: number
          trial_ends_at: string | null
          auto_reminders: boolean
          address: string | null
          postal_code: string | null
          city: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_name?: string | null
          siren?: string | null
          email: string
          plan?: 'starter' | 'pro' | 'business' | 'free_trial'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          invoice_count_month?: number
          trial_ends_at?: string | null
          auto_reminders?: boolean
          address?: string | null
          postal_code?: string | null
          city?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string | null
          siren?: string | null
          email?: string
          plan?: 'starter' | 'pro' | 'business' | 'free_trial'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          invoice_count_month?: number
          trial_ends_at?: string | null
          auto_reminders?: boolean
          address?: string | null
          postal_code?: string | null
          city?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          client_name: string
          client_email: string
          client_address: string | null
          client_siren: string | null
          invoice_number: string
          amount: number
          due_date: string
          issued_date: string
          status: 'pending' | 'reminded' | 'formal_notice' | 'paid' | 'disputed'
          notes: string | null
          description: string | null
          vat_mention: string
          payment_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_name: string
          client_email: string
          client_address?: string | null
          client_siren?: string | null
          invoice_number: string
          amount: number
          due_date: string
          issued_date?: string
          status?: 'pending' | 'reminded' | 'formal_notice' | 'paid' | 'disputed'
          notes?: string | null
          description?: string | null
          vat_mention?: string
          payment_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_name?: string
          client_email?: string
          client_address?: string | null
          client_siren?: string | null
          invoice_number?: string
          amount?: number
          due_date?: string
          issued_date?: string
          status?: 'pending' | 'reminded' | 'formal_notice' | 'paid' | 'disputed'
          notes?: string | null
          description?: string | null
          vat_mention?: string
          payment_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      reminders: {
        Row: {
          id: string
          invoice_id: string
          user_id: string
          type: 'email_1' | 'email_2' | 'email_3' | 'formal_notice'
          sent_at: string
          channel: 'email' | 'sms' | 'courrier'
          content: string | null
          subject: string | null
          status: 'sent' | 'delivered' | 'failed' | 'bounced'
          resend_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          user_id: string
          type: 'email_1' | 'email_2' | 'email_3' | 'formal_notice'
          sent_at?: string
          channel?: 'email' | 'sms' | 'courrier'
          content?: string | null
          subject?: string | null
          status?: 'sent' | 'delivered' | 'failed' | 'bounced'
          resend_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          user_id?: string
          type?: 'email_1' | 'email_2' | 'email_3' | 'formal_notice'
          sent_at?: string
          channel?: 'email' | 'sms' | 'courrier'
          content?: string | null
          subject?: string | null
          status?: 'sent' | 'delivered' | 'failed' | 'bounced'
          resend_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reminders_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reminders_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      reminder_scenarios: {
        Row: {
          id: string
          user_id: string | null
          name: string
          description: string | null
          steps: Json
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          description?: string | null
          steps?: Json
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          description?: string | null
          steps?: Json
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export interface ScenarioStep {
  day: number
  type: 'email_1' | 'email_2' | 'email_3' | 'formal_notice'
  subject: string
  tone: 'cordial' | 'ferme' | 'precontentieux' | 'formal_notice'
  channel: 'email' | 'sms' | 'courrier'
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type Reminder = Database['public']['Tables']['reminders']['Row']
export type ReminderScenario = Database['public']['Tables']['reminder_scenarios']['Row']
export type InvoiceStatus = Invoice['status']
export type ReminderType = Reminder['type']
export type ReminderChannel = Reminder['channel']
export type Plan = Profile['plan']

// CRM types (added by migration 005)
export type PipelineStage = 'prospect' | 'qualified' | 'proposal' | 'signed' | 'lost'
export type JournalEntryType = 'call' | 'email' | 'note' | 'meeting'
export type NotificationType = 'reminder' | 'sequence_step' | 'deal_signed' | 'follow_up' | 'invoice_overdue'

export interface Contact {
  id: string
  user_id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  tags: string[]
  pipeline_stage: PipelineStage
  deal_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface JournalEntry {
  id: string
  contact_id: string
  user_id: string
  type: JournalEntryType
  content: string
  duration_minutes: number | null
  occurred_at: string
  created_at: string
}

export interface ContactSequence {
  id: string
  contact_id: string
  user_id: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  current_step: number
  next_send_at: string | null
  started_at: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  contact_id: string | null
  type: NotificationType
  title: string
  body: string | null
  read: boolean
  action_url: string | null
  created_at: string
}
