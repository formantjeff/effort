// Workstream utilities

export const WORKSTREAM_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

export interface ParsedWorkstream {
  name: string
  effort: number
  color: string
  [key: string]: string | number
}

export interface ParseWorkstreamsResult {
  workstreams: ParsedWorkstream[]
  errors: string[]
}

/**
 * Parse workstream text from Slack modal
 * Format: "name, percentage" one per line
 * Example:
 *   Engineering, 60
 *   Design, 25
 *   QA, 15
 */
export function parseWorkstreams(text: string): ParseWorkstreamsResult {
  const lines = text.trim().split('\n').filter(line => line.trim())
  const workstreams: ParsedWorkstream[] = []
  const errors: string[] = []

  if (lines.length === 0) {
    errors.push('At least one workstream is required')
    return { workstreams, errors }
  }

  if (lines.length > 10) {
    errors.push('Maximum 10 workstreams allowed')
    return { workstreams, errors }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const parts = line.split(',').map(p => p.trim())

    if (parts.length !== 2) {
      errors.push(`Line ${i + 1}: Invalid format. Expected "name, percentage"`)
      continue
    }

    const [name, effortStr] = parts

    if (!name) {
      errors.push(`Line ${i + 1}: Workstream name is required`)
      continue
    }

    const effort = parseFloat(effortStr)
    if (isNaN(effort) || effort <= 0) {
      errors.push(`Line ${i + 1}: Invalid percentage "${effortStr}"`)
      continue
    }

    workstreams.push({
      name,
      effort,
      color: WORKSTREAM_COLORS[i % WORKSTREAM_COLORS.length],
    })
  }

  // Normalize percentages to sum to 100
  if (workstreams.length > 0) {
    const total = workstreams.reduce((sum, ws) => sum + ws.effort, 0)
    if (total > 0) {
      workstreams.forEach(ws => {
        ws.effort = (ws.effort / total) * 100
      })
    }
  }

  return { workstreams, errors }
}
