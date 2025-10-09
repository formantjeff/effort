'use client'

import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { X, Plus } from 'lucide-react'
import { Workstream } from '@/lib/supabase'

interface WorkstreamSliderProps {
  workstreams: Workstream[]
  onUpdateEffort: (id: string, effort: number) => void
  onDeleteWorkstream: (id: string) => void
  onAddWorkstream: () => void
  onUpdateName: (id: string, name: string) => void
}

export function WorkstreamSlider({
  workstreams,
  onUpdateEffort,
  onDeleteWorkstream,
  onAddWorkstream,
  onUpdateName,
}: WorkstreamSliderProps) {
  return (
    <Card className="h-full bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-gray-900 dark:text-white">Workstreams</CardTitle>
        <Button onClick={onAddWorkstream} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Stream
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {workstreams.map((workstream) => (
            <div
              key={workstream.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700"
              style={{ borderLeftColor: workstream.color, borderLeftWidth: '4px' }}
            >
              <Input
                value={workstream.name}
                onChange={(e) => onUpdateName(workstream.id, e.target.value)}
                className="w-40 font-medium text-sm bg-white dark:bg-slate-600 border-gray-300 dark:border-slate-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-400"
                placeholder="Workstream name"
              />
              <Slider
                value={[workstream.effort]}
                onValueChange={(values) => onUpdateEffort(workstream.id, values[0])}
                max={100}
                step={0.5}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteWorkstream(workstream.id)}
                className="h-8 w-8 p-0 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  )
}
