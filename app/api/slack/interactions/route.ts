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

  // Parse workstreams (synchronous validation)
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

  // Verify user is linked
  console.log('Looking up Slack user...')
  const supabase = createServiceClient()
  const { data: slackUser } = await supabase
    .from('slack_users')
    .select('user_id')
    .eq('slack_user_id', userId)
    .single()

  console.log('Slack user lookup complete:', { found: !!slackUser })

  if (!slackUser) {
    return NextResponse.json({
      response_action: 'errors',
      errors: {
        effort_name: 'Your account is not linked. Please run /effort link first.',
      },
    })
  }

  // Create effort synchronously (must complete within 3 seconds)
  console.log('Creating effort graph...')

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

  console.log('Graph created:', graph.id)

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

  console.log('Workstreams created successfully')

  // Post success message to Slack with the effort visualization
  // Use the Slack API to post a message after modal closes
  const responseUrl = payload.response_urls?.[0]?.response_url

  if (responseUrl) {
    // Use response_url to send a follow-up message
    const { createEffortBlocks } = await import('@/lib/slack')
    const blocks = createEffortBlocks(effortName, workstreams, graph.id, slackUser.user_id, origin)

    fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text: `✅ Created effort: ${effortName}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Created effort: ${effortName}*`,
            },
          },
          ...blocks,
        ],
      }),
    }).catch(error => console.error('Error sending follow-up message:', error))
  } else {
    console.log('No response_url, cannot send follow-up message')
  }

  return NextResponse.json({
    response_action: 'clear',
  })
}
