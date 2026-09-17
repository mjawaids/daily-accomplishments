import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      accomplishments: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          category: 'work' | 'personal' | 'learning' | 'health';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          category: 'work' | 'personal' | 'learning' | 'health';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          text?: string;
          category?: 'work' | 'personal' | 'learning' | 'health';
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          push_alias: string;
          push_enabled: boolean;
          evening_reminder_enabled: boolean;
          /** 'HH:MM:SS'; constrained to quarter hours by the migration. */
          reminder_local_time: string;
          /** IANA zone name, normalised to 'UTC' server-side if unresolvable. */
          timezone: string;
          weekly_digest_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          push_enabled?: boolean;
          evening_reminder_enabled?: boolean;
          reminder_local_time?: string;
          timezone?: string;
          weekly_digest_enabled?: boolean;
        };
        // push_alias is intentionally absent: the column grant in the migration
        // rejects client writes to it.
        Update: {
          push_enabled?: boolean;
          evening_reminder_enabled?: boolean;
          reminder_local_time?: string;
          timezone?: string;
          weekly_digest_enabled?: boolean;
        };
      };
    };
  };
};