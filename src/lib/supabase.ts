import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type LegacyCategory = 'work' | 'personal' | 'learning' | 'health';

export type Database = {
  public: {
    Tables: {
      accomplishments: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          category_id: string;
          /** Legacy compatibility column: the category's legacy_key, or null for
              a custom category. Resolved to category_id by a trigger when an old
              client writes only this. */
          category: LegacyCategory | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          category_id?: string;
          category?: LegacyCategory | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          text?: string;
          category_id?: string;
          category?: LegacyCategory | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          position: number;
          legacy_key: LegacyCategory | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          position?: number;
          legacy_key?: LegacyCategory | null;
        };
        Update: {
          name?: string;
          color?: string;
          icon?: string;
          position?: number;
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