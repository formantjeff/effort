import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { createEffortBlocks } from '@/lib/slack'

// Slack Slash Commands endpoint
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const command = formData.get('command') as string
    const text = formData.get('text') as string
    const slackUserId = formData.get('user_id') as string
    const slackTeamId = formData.get('team_id') as string
    const triggerId = formData.get('trigger_id') as string

    console.log('Slash command received:', { command, text, slackUserId, slackTeamId })

    // Verify the request is from Slack
    // TODO: Add signature verification

    switch (command) {
      case '/effort':
        return await handleEffortCommand(text, slackUserId, slackTeamId, request.nextUrl.origin, triggerId)
      default:
        return NextResponse.json({
          response_type: 'ephemeral',
          text: 'Unknown command',
        })
    }
  } catch (error) {
    console.error('Error handling Slack command:', error)
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `Sorry, something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}

async function handleEffortCommand(text: string, slackUserId: string, slackTeamId: string, origin: string, triggerId?: string) {
  const args = text.trim().split(' ')
  const subcommand = args[0]

  // Check if user is linked (use service client to bypass RLS)
  const supabase = createServiceClient()
  const { data: slackUser } = await supabase
    .from('slack_users')
    .select('user_id')
    .eq('slack_user_id', slackUserId)
    .single()

  // Handle 'link' command regardless of link status
  if (subcommand === 'link') {
    if (slackUser) {
      return NextResponse.json({
        response_type: 'ephemeral',
        text: '✅ Your account is already linked!',
      })
    }
    const linkUrl = `${origin}/api/slack/link?slack_user_id=${slackUserId}&slack_team_id=${slackTeamId}`
    return NextResponse.json({
      response_type: 'ephemeral',
      text: '👋 Welcome to Effort! Please link your account to get started.',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '👋 *Welcome to Effort!*\n\nTo use the Effort app in Slack, you need to link your Slack account with your Effort account.\n\nClick the button below and log in to your Effort account to complete the link.',
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Link Account',
              },
              url: linkUrl,
              style: 'primary',
            },
          ],
        },
      ],
    })
  }

  // For all other commands, require account to be linked
  if (!slackUser) {
    const linkUrl = `${origin}/api/slack/link?slack_user_id=${slackUserId}&slack_team_id=${slackTeamId}`
    return NextResponse.json({
      response_type: 'ephemeral',
      text: '👋 Welcome to Effort! Please link your account first by running `/effort link`',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '👋 *Welcome to Effort!*\n\nTo use the Effort app in Slack, you need to link your Slack account with your Effort account.\n\nClick the button below and log in to your Effort account to complete the link.',
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Link Account',
              },
              url: linkUrl,
              style: 'primary',
            },
          ],
        },
      ],
    })
  }

  switch (subcommand) {
    case 'new':
    case 'create':
      return await openNewEffortModal(triggerId)
    case 'list':
      return await listEfforts(slackUser.user_id, origin)
    case 'view':
      return await viewEffort(args[1], slackUser.user_id, origin)
    case 'share':
      return await shareEffort(args[1], slackUser.user_id, slackUserId, origin)
    case 'help':
    default:
      return NextResponse.json({
        response_type: 'ephemeral',
        text: `*Effort App Commands:*
• \`/effort new\` - Create a new effort
• \`/effort list\` - List all your efforts
• \`/effort view [name]\` - View a specific effort
• \`/effort share [name]\` - Share an effort to this channel
• \`/effort link\` - Check your account link status
• \`/effort help\` - Show this help message`,
      })
  }
}

async function listEfforts(userId: string, origin: string) {
  const supabase = createServiceClient()

  const { data: graphs, error } = await supabase
    .from('effort_graphs')
    .select('id, name, description')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })

  if (error || !graphs || graphs.length === 0) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: '📊 You don\'t have any efforts yet. Create one at ' + origin,
    })
  }

  const effortList = graphs.map((g) => `• *${g.name}*${g.description ? `: ${g.description}` : ''}`).join('\n')

  return NextResponse.json({
    response_type: 'ephemeral',
    text: `*Your Efforts:*\n${effortList}`,
  })
}

async function viewEffort(effortName: string, userId: string, origin: string) {
  if (!effortName) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: '❌ Please specify an effort name: `/effort view [name]`',
    })
  }

  const supabase = createServiceClient()

  // Find effort by name
  const { data: graph } = await supabase
    .from('effort_graphs')
    .select('id, name')
    .eq('author_id', userId)
    .ilike('name', `%${effortName}%`)
    .single()

  if (!graph) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `❌ Effort "${effortName}" not found. Use \`/effort list\` to see your efforts.`,
    })
  }

  // Get workstreams
  const { data: workstreams } = await supabase
    .from('workstreams')
    .select('name, effort, color')
    .eq('graph_id', graph.id)
    .order('created_at', { ascending: true })

  if (!workstreams || workstreams.length === 0) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `📊 *${graph.name}*\n\n_No workstreams yet._`,
    })
  }

  // Create share link
  const { data: share } = await supabase
    .from('shared_efforts')
    .select('share_token')
    .eq('graph_id', graph.id)
    .eq('is_active', true)
    .single()

  const shareUrl = share ? `${origin}/share/${share.share_token}` : undefined

  try {
    const blocks = createEffortBlocks(graph.name, workstreams, graph.id, userId, origin, shareUrl)

    return NextResponse.json({
      response_type: 'ephemeral',
      text: `Effort: ${graph.name}`, // Fallback text required when using blocks
      blocks,
    })
  } catch (error) {
    console.error('Error creating effort blocks:', error)
    // Fallback to simple text response
    const workstreamText = workstreams
      .map(ws => `• *${ws.name}*: ${ws.effort.toFixed(1)}%`)
      .join('\n')

    return NextResponse.json({
      response_type: 'ephemeral',
      text: `📊 *${graph.name}*\n\n${workstreamText}`,
    })
  }
}

async function shareEffort(effortName: string, userId: string, slackUserId: string, origin: string) {
  if (!effortName) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: '❌ Please specify an effort name: `/effort share [name]`',
    })
  }

  const supabase = createServiceClient()

  // Find effort by name
  const { data: graph } = await supabase
    .from('effort_graphs')
    .select('id, name')
    .eq('author_id', userId)
    .ilike('name', `%${effortName}%`)
    .single()

  if (!graph) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `❌ Effort "${effortName}" not found. Use \`/effort list\` to see your efforts.`,
    })
  }

  // Get workstreams
  const { data: workstreams } = await supabase
    .from('workstreams')
    .select('name, effort, color')
    .eq('graph_id', graph.id)
    .order('created_at', { ascending: true })

  if (!workstreams || workstreams.length === 0) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `❌ "${graph.name}" has no workstreams to share.`,
    })
  }

  // Get or create share link
  const { data: existingShare } = await supabase
    .from('shared_efforts')
    .select('share_token')
    .eq('graph_id', graph.id)
    .eq('is_active', true)
    .single()

  let shareToken = existingShare?.share_token

  if (!shareToken) {
    const { data: newShare } = await supabase
      .from('shared_efforts')
      .insert({
        graph_id: graph.id,
        created_by: userId,
      })
      .select('share_token')
      .single()

    shareToken = newShare?.share_token
  }

  const shareUrl = shareToken ? `${origin}/share/${shareToken}` : undefined

  const blocks = createEffortBlocks(graph.name, workstreams, graph.id, userId, origin, shareUrl)

  // Add attribution
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Shared by <@${slackUserId}>`,
      },
    ],
  })

  return NextResponse.json({
    response_type: 'in_channel',
    text: `Effort: ${graph.name}`, // Fallback text required when using blocks
    blocks,
  })
}

async function openNewEffortModal(triggerId: string | undefined) {
  if (!triggerId) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: '❌ Unable to open modal. Please try again.',
    })
  }

  const modal = {
    type: 'modal',
    callback_id: 'create_effort_modal',
    title: {
      type: 'plain_text',
      text: 'Create New Effort',
    },
    submit: {
      type: 'plain_text',
      text: 'Create',
    },
    blocks: [
      {
        type: 'input',
        block_id: 'effort_name_block',
        label: {
          type: 'plain_text',
          text: 'Effort Name',
        },
        element: {
          type: 'plain_text_input',
          action_id: 'effort_name_input',
          placeholder: {
            type: 'plain_text',
            text: 'e.g., Q1 Team Allocation',
          },
        },
      },
      {
        type: 'input',
        block_id: 'workstreams_block',
        label: {
          type: 'plain_text',
          text: 'Workstreams',
        },
        element: {
          type: 'plain_text_input',
          action_id: 'workstreams_input',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'Engineering, 60\nDesign, 25\nQA, 15\n\nFormat: name, percentage (one per line)\nPercentages will be normalized to 100%',
          },
        },
        hint: {
          type: 'plain_text',
          text: 'Enter one workstream per line in the format: name, percentage',
        },
      },
      {
        type: 'input',
        block_id: 'description_block',
        optional: true,
        label: {
          type: 'plain_text',
          text: 'Description (optional)',
        },
        element: {
          type: 'plain_text_input',
          action_id: 'description_input',
          placeholder: {
            type: 'plain_text',
            text: 'Add a description for this effort...',
          },
        },
      },
    ],
  }

  // Open modal using Slack API
  const slackBotToken = process.env.SLACK_BOT_TOKEN
  const response = await fetch('https://slack.com/api/views.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${slackBotToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      trigger_id: triggerId,
      view: modal,
    }),
  })

  const result = await response.json()

  if (!result.ok) {
    console.error('Error opening modal:', result)
    return NextResponse.json({
      response_type: 'ephemeral',
      text: '❌ Failed to open modal. Please try again.',
    })
  }

  // Return empty response since modal is opened
  return new NextResponse('', { status: 200 })
}
