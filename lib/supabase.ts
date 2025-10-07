import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface EffortGraph {
  id: string
  name: string
  description: string | null
  author_id: string
  created_at: string
  updated_at: string
}

export interface Workstream {
  id: string
  name: string
  effort: number
  color: string
  graph_id: string | null
  created_at: string
  updated_at: string
}

export type PermissionLevel = 'viewer' | 'editor'

export interface GraphPermission {
  id: string
  graph_id: string
  user_id: string
  permission_level: PermissionLevel
  created_at: string
}

export interface GraphWithPermission extends EffortGraph {
  permission?: PermissionLevel | 'owner'
}
