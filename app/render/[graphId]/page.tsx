import { createServiceClient } from '@/lib/supabase-service'
import { notFound } from 'next/navigation'
import ChartRenderer from './chart-renderer'

interface PageProps {
  params: Promise<{
    graphId: string
  }>
  searchParams: Promise<{
    userId?: string
    theme?: 'light' | 'dark'
  }>
}

export default async function RenderPage({ params, searchParams }: PageProps) {
  const { graphId } = await params
  const { userId, theme: urlTheme } = await searchParams

  const supabase = createServiceClient()

  // Get graph and workstreams
  const { data: graph } = await supabase
    .from('effort_graphs')
    .select('name, author_id')
    .eq('id', graphId)
    .single()

  if (!graph) {
    notFound()
  }

  const { data: workstreams } = await supabase
    .from('workstreams')
    .select('name, effort, color')
    .eq('graph_id', graphId)
    .order('created_at', { ascending: true })

  if (!workstreams || workstreams.length === 0) {
    notFound()
  }

  // Get user's theme preference
  const lookupUserId = userId || graph.author_id
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('theme')
    .eq('user_id', lookupUserId)
    .single()

  const theme = urlTheme || preferences?.theme || 'dark'

  // Calculate data for chart
  const totalEffort = workstreams.reduce((sum, ws) => sum + ws.effort, 0)
  const data = workstreams
    .filter((ws) => ws.effort > 0)
    .map((ws) => ({
      name: ws.name,
      value: totalEffort > 0 ? (ws.effort / totalEffort) * 100 : 0,
      color: ws.color,
    }))

  return <ChartRenderer graphName={graph.name} data={data} theme={theme} />
}
