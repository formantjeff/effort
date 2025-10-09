import { NextRequest, NextResponse } from 'next/server'

// Redirect to Slack OAuth
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const slackUserId = searchParams.get('slack_user_id')

  const clientId = process.env.SLACK_CLIENT_ID!
  const redirectUri = `${request.nextUrl.origin}/api/slack/oauth/callback`

  const scopes = ['identity.basic', 'identity.email', 'identity.team']

  const state = slackUserId || 'link'

  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes.join(',')}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

  return NextResponse.redirect(slackAuthUrl)
}
