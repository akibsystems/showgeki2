import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Story = {
  id: string
  story_text: string
  is_completed: boolean
  video_url?: string
  created_at: string
}

export type Review = {
  id: string
  story_id: string
  review_text: string
  rating: number
  created_at: string
}