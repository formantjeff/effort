import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Slack Slash Commands endpoint
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const command = formData.get('command') as string
    const text = formData.get('text') as string
    const userId = formData.get('user_id') as string
    const channelId = formData.get('channel_id') as string
    const responseUrl = formData.get('response_url') as string

    console.log('Slash command received:', { command, text, userId })

    // Verify the request is from Slack
    // TODO: Add signature verification

    switch (command) {
      case '/effort':
        return await handleEffortCommand(text, userId, responseUrl)
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
      text: 'Sorry, something went wrong.',
    })
  }
}

async function handleEffortCommand(text: string, userId: string, responseUrl: string) {
  const args = text.trim().split(' ')
  const subcommand = args[0]

  switch (subcommand) {
    case 'list':
      return await listEfforts(userId)
    case 'view':
      return await viewEffort(args[1], userId)
    case 'share':
      return await shareEffort(args[1], userId)
    case 'help':
    default:
      return NextResponse.json({
        response_type: 'ephemeral',
        text: `*Effort App Commands:*
• \`/effort list\` - List all your efforts
• \`/effort view [name]\` - View a specific effort
• \`/effort share [name]\` - Share an effort to this channel
• \`/effort help\` - Show this help message`,
      })
  }
}

async function listEfforts(userId: string) {
  // TODO: Map Slack user ID to app user ID
  // TODO: Fetch user's efforts from database

  return NextResponse.json({
    response_type: 'ephemeral',
    text: 'Your efforts:\n• Example Effort 1\n• Example Effort 2',
  })
}

async function viewEffort(effortName: string, userId: string) {
  // TODO: Fetch effort data and create visualization

  return NextResponse.json({
    response_type: 'ephemeral',
    text: `Viewing effort: ${effortName}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${effortName}*\n• Workstream 1: 30%\n• Workstream 2: 70%`,
        },
      },
    ],
  })
}

async function shareEffort(effortName: string, userId: string) {
  // TODO: Create share link and post to channel

  return NextResponse.json({
    response_type: 'in_channel',
    text: `${effortName} shared by <@${userId}>`,
  })
}
