import { NextRequest, NextResponse } from 'next/server'

// Slack Interactive Components endpoint (buttons, modals, etc.)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const payload = JSON.parse(formData.get('payload') as string)

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

async function handleBlockActions(payload: any) {
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

async function handleViewSubmission(payload: any) {
  // Handle modal submissions
  console.log('View submission:', payload)
  return NextResponse.json({ ok: true })
}
