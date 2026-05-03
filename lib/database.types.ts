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
