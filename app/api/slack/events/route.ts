import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Slack Events API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle Slack URL verification challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge })
    }

    // Handle Slack events
    if (body.type === 'event_callback') {
      const event = body.event

      switch (event.type) {
        case 'app_mention':
          await handleAppMention(event)
          break
        case 'link_shared':
          await handleLinkShared(event)
          break
        default:
          console.log('Unhandled event type:', event.type)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error handling Slack event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleAppMention(event: any) {
  // Handle @effort mentions
  console.log('App mentioned:', event)
  // TODO: Respond with help text or handle commands
}

async function handleLinkShared(event: any) {
  // Unfurl shared effort links
  console.log('Link shared:', event)
  // TODO: Fetch effort data and create rich preview
}
