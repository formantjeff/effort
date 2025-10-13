import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { parseWorkstreams } from '@/lib/workstreams'

// Slack Interactions endpoint (for modal submissions)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const payload = JSON.parse(formData.get('payload') as string)

    console.log('Slack interaction received:', payload.type)

    // TODO: Verify Slack signature for security

    switch (payload.type) {
      case 'view_submission':
        return await handleViewSubmission(payload, request.nextUrl.origin)
      default:
        return NextResponse.json({ ok: true })
    }
  } catch (error) {
    console.error('Error handling Slack interaction:', error)
    return NextResponse.json(
      {
        response_action: 'errors',
        errors: {
          effort_name: 'Something went wrong. Please try again.',
        },
      },
      { status: 200 }
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleViewSubmission(payload: any, origin: string) {
  const values = payload.view.state.values
  const userId = payload.user.id

  // Extract form values
  const effortName = values.effort_name_block.effort_name_input.value
  const workstreamsText = values.workstreams_block.workstreams_input.value
  const description = values.description_block?.description_input?.value || null

  console.log('Creating effort:', { effortName, workstreamsText, description, userId })

  // Parse workstreams
  console.log('Parsing workstreams...')
  const { workstreams, errors } = parseWorkstreams(workstreamsText)
  console.log('Parse result:', { workstreamsCount: workstreams.length, errorsCount: errors.length })

  if (errors.length > 0) {
    console.log('Validation errors:', errors)
    return NextResponse.json({
      response_action: 'errors',
      errors: {
        workstreams_input: errors.join('\n'),
      },
    })
  }

  if (workstreams.length === 0) {
    return NextResponse.json({
      response_action: 'errors',
      errors: {
        workstreams_input: 'At least one workstream is required',
      },
    })
  }

  // Get linked user
  console.log('Looking up Slack user...')
  const supabase = createServiceClient()
  const { data: slackUser } = await supabase
    .from('slack_users')
    .select('user_id')
    .eq('slack_user_id', userId)
    .single()

  if (!slackUser) {
    return NextResponse.json({
      response_action: 'errors',
      errors: {
        effort_name: 'Your account is not linked. Please run /effort link first.',
      },
    })
  }

  // Create effort graph
  const { data: graph, error: graphError } = await supabase
    .from('effort_graphs')
    .insert({
      name: effortName,
      description,
      author_id: slackUser.user_id,
    })
    .select('id')
    .single()

  if (graphError || !graph) {
    console.error('Error creating graph:', graphError)
    return NextResponse.json({
      response_action: 'errors',
      errors: {
        effort_name: 'Failed to create effort. Please try again.',
      },
    })
  }

  // Create workstreams
  const workstreamsData = workstreams.map(ws => ({
    name: ws.name,
    effort: ws.effort,
    color: ws.color,
    graph_id: graph.id,
  }))

  const { error: workstreamsError } = await supabase
    .from('workstreams')
    .insert(workstreamsData)

  if (workstreamsError) {
    console.error('Error creating workstreams:', workstreamsError)
    // Cleanup: delete the graph
    await supabase.from('effort_graphs').delete().eq('id', graph.id)
    return NextResponse.json({
      response_action: 'errors',
      errors: {
        effort_name: 'Failed to create workstreams. Please try again.',
      },
    })
  }

  // Return success immediately to avoid Slack's 3-second timeout
  // Pre-generate chart asynchronously
  fetch(`${origin}/api/chart/screenshot?graphId=${graph.id}&userId=${slackUser.user_id}&refresh=true`)
    .catch(error => console.error('Error pre-generating chart:', error))

  return NextResponse.json({
    response_action: 'clear',
  })
}
