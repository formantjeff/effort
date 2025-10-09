import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Slack OAuth callback handler
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/?error=slack_auth_failed', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', request.url))
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code: code,
        redirect_uri: `${request.nextUrl.origin}/api/slack/oauth/callback`,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      console.error('Slack OAuth error:', tokenData.error)
      return NextResponse.redirect(new URL('/?error=slack_oauth_failed', request.url))
    }

    // Get user info from Slack
    const userResponse = await fetch('https://slack.com/api/users.identity', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()

    if (!userData.ok) {
      console.error('Slack user identity error:', userData.error)
      return NextResponse.redirect(new URL('/?error=slack_user_failed', request.url))
    }

    // Link Slack account to app account
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Store state for after login
      const response = NextResponse.redirect(new URL('/?slack_pending=true', request.url))
      response.cookies.set('slack_oauth_data', JSON.stringify({
        slack_user_id: userData.user.id,
        slack_team_id: userData.team.id,
        slack_access_token: tokenData.access_token,
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 10, // 10 minutes
      })
      return response
    }

    // Save the link
    const { error: dbError } = await supabase
      .from('slack_users')
      .upsert({
        user_id: user.id,
        slack_user_id: userData.user.id,
        slack_team_id: userData.team.id,
        slack_access_token: tokenData.access_token,
      }, {
        onConflict: 'slack_user_id'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect(new URL('/?error=db_failed', request.url))
    }

    return NextResponse.redirect(new URL('/?slack_linked=true', request.url))
  } catch (error) {
    console.error('Error in Slack OAuth callback:', error)
    return NextResponse.redirect(new URL('/?error=unknown', request.url))
  }
}
