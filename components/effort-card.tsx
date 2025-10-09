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
      className="aspect-square cursor-pointer hover:shadow-lg transition-shadow bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 flex flex-col"
      onClick={onClick}
    >
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-base line-clamp-1 text-gray-900 dark:text-white">{name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center pb-4">
        {data.length > 0 ? (
          <div className="w-full h-full max-h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  outerRadius="60%"
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-slate-400 text-sm">No workstreams</p>
        )}
      </CardContent>
    </Card>
  )
}
