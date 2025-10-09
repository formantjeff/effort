import { NextRequest, NextResponse } from 'next/server'

interface SlackEvent {
  type: string
  [key: string]: unknown
}

interface SlackEventPayload {
  type: string
  challenge?: string
  event?: SlackEvent
}

// Slack Events API endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SlackEventPayload

    // Handle Slack URL verification challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge })
    }

    // Handle Slack events
    if (body.type === 'event_callback' && body.event) {
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

async function handleAppMention(event: SlackEvent) {
  // Handle @effort mentions
  console.log('App mentioned:', event)
  // TODO: Respond with help text or handle commands
}

async function handleLinkShared(event: SlackEvent) {
  // Unfurl shared effort links
  console.log('Link shared:', event)
  // TODO: Fetch effort data and create rich preview
}
