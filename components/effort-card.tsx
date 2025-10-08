'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Workstream } from '@/lib/supabase'

interface EffortCardProps {
  name: string
  workstreams: Workstream[]
  onClick: () => void
}

export function EffortCard({ name, workstreams, onClick }: EffortCardProps) {
  const totalEffort = workstreams.reduce((sum, ws) => sum + ws.effort, 0)

  // Calculate relative proportions (always adds up to 100%)
  const data = workstreams
    .filter((ws) => ws.effort > 0)
    .map((ws) => ({
      name: ws.name,
      value: totalEffort > 0 ? (ws.effort / totalEffort) * 100 : 0,
      color: ws.color,
    }))

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow bg-slate-800 border-slate-700"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-2 min-h-[3.5rem] text-white">{name}</CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="h-[150px] flex items-center justify-center">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm">No workstreams</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
