import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* =======================
   Core Domain: Items
   ======================= */

export interface Item {
  id: string;
  logged_by_name: string;
  description: string;
  category: string;
  color: string | null;
  building: string;
  specific_location: string;
  date_found: string;
  photo_url: string | null;
  additional_notes: string | null;
  status: 'available' | 'picked_up';
  campus_slug: string;

  sensitive: boolean;
  is_high_value: boolean;

  created_at: string;
  updated_at: string;
}

export type StudentSafeItem = Pick<
  Item,
  'id' | 'description' | 'category' | 'color' | 'building' | 'specific_location' | 'date_found' | 'photo_url' | 'status' | 'campus_slug'
>;

/* =======================
   Pickups
   ======================= */

export interface Pickup {
  id: string;
  item_id: string;
  owner_name: string;
  owner_email: string;
  campus_slug: string;
  created_at: string;
}

/* =======================
   Search Tracking
   ======================= */

export interface Search {
  id: string;
  search_term: string;
  campus_slug: string;
  created_at: string;
}

/* =======================
   Item Click Analytics
   ======================= */

export interface ItemClick {
  id: string;
  item_id: string;
  campus_slug: string;
  created_at: string;
}

/* =======================
   Ratings
   ======================= */

export interface Rating {
  id: string;
  item_id: string;
  stars: number;
  campus_slug: string;
  created_at: string;
}

export interface FeedbackReportInsert {
  type: 'bug' | 'suggestion' | 'other';
  message: string;
  email?: string | null;
}
