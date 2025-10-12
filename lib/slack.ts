// Slack API utilities

export interface SlackConfig {
  botToken: string
  signingSecret: string
  clientId: string
  clientSecret: string
}

interface SlackBlock {
  type: string
  [key: string]: unknown
}

interface Workstream {
  name: string
  effort: number
  [key: string]: unknown
}

export function getSlackConfig(): SlackConfig {
  return {
    botToken: process.env.SLACK_BOT_TOKEN || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
  }
}

export async function postToSlack(channel: string, blocks: SlackBlock[]) {
  const config = getSlackConfig()

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      blocks,
    }),
  })

  return await response.json()
}

export async function updateSlackMessage(channel: string, ts: string, blocks: SlackBlock[]) {
  const config = getSlackConfig()

  const response = await fetch('https://slack.com/api/chat.update', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      ts,
      blocks,
    }),
  })

  return await response.json()
}

export function createEffortBlocks(effortName: string, workstreams: Workstream[], graphId: string, userId: string, origin: string, shareUrl?: string): SlackBlock[] {
  // Use our Puppeteer-based screenshot endpoint for custom styled charts
  // Add timestamp to bust Slack's image cache
  const timestamp = Date.now()
  const chartUrl = `${origin}/api/chart/screenshot?graphId=${graphId}&userId=${userId}&t=${timestamp}`

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: effortName,
      },
    },
  ]

  // Use screenshot endpoint for inline chart
  blocks.push({
    type: 'image',
    image_url: chartUrl,
    alt_text: `${effortName} effort distribution chart`,
  })

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*Workstream Distribution:*',
    },
  })

  // Normalize percentages to sum to 100% (matching the chart display)
  const totalEffort = workstreams.reduce((sum, ws) => sum + ws.effort, 0)
  const workstreamText = workstreams
    .map(ws => {
      const normalizedPercent = totalEffort > 0 ? (ws.effort / totalEffort) * 100 : 0
      return `• *${ws.name}*: ${normalizedPercent.toFixed(1)}%`
    })
    .join('\n')

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: workstreamText,
    },
  })

  // Add view link if share URL provided
  if (shareUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Interactive Chart',
          },
          url: shareUrl,
        },
      ],
    })
  }

  return blocks
}

// Verify Slack request signature for security
export async function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string
): Promise<boolean> {
  const crypto = await import('crypto')

  const time = Math.floor(Date.now() / 1000)
  if (Math.abs(time - parseInt(timestamp)) > 60 * 5) {
    return false
  }

  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  )
}
