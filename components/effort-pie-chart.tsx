'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { InteractivePieChart } from './interactive-pie-chart'
import { Workstream } from '@/lib/supabase'
import { Pencil, Share2 } from 'lucide-react'

interface EffortPieChartProps {
  workstreams: Workstream[]
  onEditClick: () => void
  onUpdateEffort: (id: string, effort: number) => void
  isEditing: boolean
  title?: string
}

export function EffortPieChart({ workstreams, onEditClick, onUpdateEffort, isEditing, title = 'Effort Distribution' }: EffortPieChartProps) {
  const totalEffort = workstreams.reduce((sum, ws) => sum + ws.effort, 0)

  // Calculate relative proportions (always adds up to 100%)
  const data = workstreams
    .filter((ws) => ws.effort > 0)
    .map((ws) => ({
      name: ws.name,
      value: totalEffort > 0 ? (ws.effort / totalEffort) * 100 : 0,
      actualValue: ws.effort,
      color: ws.color,
    }))

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; payload: { value: number } }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border-slate-600 p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-white">{payload[0].name}</p>
          <p className="text-sm text-slate-300">{payload[0].payload.value.toFixed(1)}% of total</p>
        </div>
      )
    }
    return null
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Check out my effort allocation: ${title}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    }
  }

  if (data.length === 0) {
    return (
      <Card className="h-full bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <p className="text-slate-400 text-center">
            No workstreams yet.<br />Add a workstream to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="shrink-0 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEditClick}
              className="shrink-0 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <Pencil className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="flex items-center justify-center w-full">
            <InteractivePieChart
              workstreams={workstreams}
              onUpdateEffort={onUpdateEffort}
              width={400}
              height={400}
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={(props: any) => `${props.name}: ${props.value.toFixed(1)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
