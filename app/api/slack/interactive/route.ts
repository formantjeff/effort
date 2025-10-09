import { NextRequest, NextResponse } from 'next/server'

interface SlackInteractivePayload {
  type: string
  actions?: Array<{ action_id: string; [key: string]: unknown }>
  [key: string]: unknown
}

// Slack Interactive Components endpoint (buttons, modals, etc.)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const payload = JSON.parse(formData.get('payload') as string) as SlackInteractivePayload

    console.log('Interactive component:', payload)

    switch (payload.type) {
      case 'block_actions':
        return await handleBlockActions(payload)
      case 'view_submission':
        return await handleViewSubmission(payload)
      default:
        return NextResponse.json({ ok: true })
    }
  } catch (error) {
    console.error('Error handling Slack interaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleBlockActions(payload: SlackInteractivePayload) {
  if (!payload.actions || payload.actions.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const action = payload.actions[0]

  switch (action.action_id) {
    case 'edit_effort':
      // TODO: Open modal to edit effort
      break
    case 'refresh_effort':
      // TODO: Refresh effort data
      break
    default:
      console.log('Unhandled action:', action.action_id)
  }

  return NextResponse.json({ ok: true })
}

async function handleViewSubmission(payload: SlackInteractivePayload) {
  // Handle modal submissions
  console.log('View submission:', payload)
  return NextResponse.json({ ok: true })
}
