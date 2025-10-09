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

    console.log('Slash command received:', { command, text, slackUserId, slackTeamId })

    // Verify the request is from Slack
    // TODO: Add signature verification

    switch (command) {
      case '/effort':
        return await handleEffortCommand(text, slackUserId, slackTeamId, request.nextUrl.origin)
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

async function handleEffortCommand(text: string, slackUserId: string, slackTeamId: string, origin: string) {
  const args = text.trim().split(' ')
  const subcommand = args[0]

  // Check if user is linked (use service client to bypass RLS)
  const supabase = createServiceClient()
  const { data: slackUser } = await supabase
    .from('slack_users')
    .select('user_id')
    .eq('slack_user_id', slackUserId)
    .single()

  if (!slackUser) {
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

  switch (subcommand) {
    case 'list':
      return await listEfforts(slackUser.user_id, origin)
    case 'view':
      return await viewEffort(args[1], slackUser.user_id, origin)
    case 'share':
      return await shareEffort(args[1], slackUser.user_id, slackUserId, origin)
    case 'link':
      return NextResponse.json({
        response_type: 'ephemeral',
        text: '✅ Your account is already linked!',
      })
    case 'help':
    default:
      return NextResponse.json({
        response_type: 'ephemeral',
        text: `*Effort App Commands:*
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

  const blocks = createEffortBlocks(graph.name, workstreams, shareUrl)

  return NextResponse.json({
    response_type: 'ephemeral',
    blocks,
  })
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

  const blocks = createEffortBlocks(graph.name, workstreams, shareUrl)

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
    blocks,
  })
}
