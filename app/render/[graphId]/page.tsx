'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { createClient } from '@/lib/supabase-browser'

interface ChartData {
  name: string
  value: number
  color: string
  [key: string]: string | number
}

interface RenderPageProps {
  params: Promise<{
    graphId: string
  }>
  searchParams: Promise<{
    userId?: string
    theme?: 'light' | 'dark'
  }>
}

export default function RenderPage({ params, searchParams }: RenderPageProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [graphName, setGraphName] = useState<string>('')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { graphId } = await params
      const { userId, theme: urlTheme } = await searchParams
      const supabase = createClient()

      // Get graph and workstreams
      const { data: graph } = await supabase
        .from('effort_graphs')
        .select('name, author_id')
        .eq('id', graphId)
        .single()

      if (!graph) return

      const { data: workstreams } = await supabase
        .from('workstreams')
        .select('name, effort, color')
        .eq('graph_id', graphId)
        .order('created_at', { ascending: true })

      if (!workstreams || workstreams.length === 0) return

      // Get user's theme preference
      const lookupUserId = userId || graph.author_id
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('theme')
        .eq('user_id', lookupUserId)
        .single()

      const userTheme = urlTheme || preferences?.theme || 'dark'

      // Calculate data for chart
      const totalEffort = workstreams.reduce((sum, ws) => sum + ws.effort, 0)
      const chartData = workstreams
        .filter((ws) => ws.effort > 0)
        .map((ws) => ({
          name: ws.name,
          value: totalEffort > 0 ? (ws.effort / totalEffort) * 100 : 0,
          color: ws.color,
        }))

      setGraphName(graph.name)
      setData(chartData)
      setTheme(userTheme)
      setLoading(false)
    }

    loadData()
  }, [params, searchParams])

  if (loading) {
    return <div>Loading...</div>
  }

  const bgColor = theme === 'dark' ? '#1a1a1a' : '#ffffff'
  const textColor = theme === 'dark' ? '#e5e5e5' : '#1a1a1a'

  return (
    <html>
      <head>
        <style>{`
          body {
            margin: 0;
            padding: 20px;
            background: ${bgColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          h1 {
            color: ${textColor};
            font-size: 32px;
            font-weight: bold;
            margin: 0 0 30px 0;
            text-align: center;
          }
        `}</style>
      </head>
      <body>
        <h1>{graphName}</h1>
        <div style={{ width: '800px', height: '500px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={(entry: any) => `${entry.value.toFixed(1)}%`}
                outerRadius={150}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Legend
                wrapperStyle={{
                  color: textColor,
                  fontSize: '16px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </body>
    </html>
  )
}
