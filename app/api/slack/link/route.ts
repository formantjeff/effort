import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Link Slack account - redirects to login page with state
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const slackUserId = searchParams.get('slack_user_id')
  const slackTeamId = searchParams.get('slack_team_id')

  if (!slackUserId || !slackTeamId) {
    return NextResponse.redirect(new URL('/?error=missing_slack_data', request.url))
  }

  // Check if user is already logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // User is logged in, create the link immediately
    const { error } = await supabase
      .from('slack_users')
      .upsert({
        user_id: user.id,
        slack_user_id: slackUserId,
        slack_team_id: slackTeamId,
        slack_access_token: null,
      }, {
        onConflict: 'slack_user_id'
      })

    if (error) {
      console.error('Error linking Slack account:', error)
      return NextResponse.redirect(new URL('/?error=link_failed', request.url))
    }

    return NextResponse.redirect(new URL('/?slack_linked=true', request.url))
  }

  // User not logged in, redirect to home with pending state
  const response = NextResponse.redirect(new URL('/?slack_pending=true', request.url))
  response.cookies.set('slack_link_data', JSON.stringify({
    slack_user_id: slackUserId,
    slack_team_id: slackTeamId,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
  })
  return response
}
