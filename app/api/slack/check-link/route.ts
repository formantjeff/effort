import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ linked: false, error: 'Not logged in' })
  }

  const { data: slackUser, error } = await supabase
    .from('slack_users')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    linked: !!slackUser,
    slackUser,
    error: error?.message,
  })
}
