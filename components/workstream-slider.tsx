'use client'

import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const totalEffort = workstreams.reduce((sum, ws) => sum + ws.effort, 0)
  const isOverCapacity = totalEffort > 100

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Workstreams</CardTitle>
        <Button onClick={onAddWorkstream} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Stream
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {workstreams.map((workstream) => (
            <div
              key={workstream.id}
              className="space-y-2 p-4 rounded-lg border"
              style={{ borderLeftColor: workstream.color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-center justify-between">
                <Input
                  value={workstream.name}
                  onChange={(e) => onUpdateName(workstream.id, e.target.value)}
                  className="flex-1 mr-2 font-medium"
                  placeholder="Workstream name"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteWorkstream(workstream.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label>Effort Allocation</Label>
                  <span className="font-semibold">{workstream.effort.toFixed(1)}%</span>
                </div>
                <Slider
                  value={[workstream.effort]}
                  onValueChange={(values) => onUpdateEffort(workstream.id, values[0])}
                  max={100}
                  step={0.5}
                  className="w-full"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Effort:</span>
            <span
              className={`text-lg font-bold ${
                isOverCapacity ? 'text-red-600' : totalEffort === 100 ? 'text-green-600' : 'text-gray-600'
              }`}
            >
              {totalEffort.toFixed(1)}%
            </span>
          </div>
          {isOverCapacity && (
            <p className="text-sm text-red-600 mt-2">
              ⚠️ Total effort exceeds 100%. Please adjust allocations.
            </p>
          )}
          {totalEffort < 100 && totalEffort > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              {(100 - totalEffort).toFixed(1)}% remaining capacity
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
