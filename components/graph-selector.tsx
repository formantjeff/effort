'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, ChevronDown } from 'lucide-react'
import { EffortGraph, GraphWithPermission } from '@/lib/supabase'

interface GraphSelectorProps {
  graphs: GraphWithPermission[]
  currentGraph: EffortGraph | null
  onSelectGraph: (graphId: string) => void
  onCreateGraph: (name: string, description: string) => void
}

export function GraphSelector({
  graphs,
  currentGraph,
  onSelectGraph,
  onCreateGraph,
}: GraphSelectorProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newGraphName, setNewGraphName] = useState('')
  const [newGraphDescription, setNewGraphDescription] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleCreate = () => {
    if (newGraphName.trim()) {
      onCreateGraph(newGraphName, newGraphDescription)
      setNewGraphName('')
      setNewGraphDescription('')
      setIsCreating(false)
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <span className="font-semibold">
          {currentGraph ? currentGraph.name : 'Select a graph'}
        </span>
        <ChevronDown className="h-4 w-4 ml-2" />
      </Button>

      {isOpen && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Your Effort Graphs</CardTitle>
              <Button
                size="sm"
                onClick={() => setIsCreating(true)}
                disabled={isCreating}
              >
                <Plus className="h-3 w-3 mr-1" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isCreating && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg mb-2">
                <div className="space-y-1">
                  <Label htmlFor="graph-name" className="text-xs">
                    Graph Name
                  </Label>
                  <Input
                    id="graph-name"
                    placeholder="Frontend Efforts"
                    value={newGraphName}
                    onChange={(e) => setNewGraphName(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="graph-description" className="text-xs">
                    Description (optional)
                  </Label>
                  <Input
                    id="graph-description"
                    placeholder="Q1 2025 frontend team allocation"
                    value={newGraphDescription}
                    onChange={(e) => setNewGraphDescription(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreate} className="flex-1">
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false)
                      setNewGraphName('')
                      setNewGraphDescription('')
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {graphs.map((graph) => (
                <button
                  key={graph.id}
                  onClick={() => {
                    onSelectGraph(graph.id)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left p-2 rounded hover:bg-gray-100 transition-colors ${
                    currentGraph?.id === graph.id ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="font-medium text-sm">{graph.name}</div>
                  {graph.description && (
                    <div className="text-xs text-gray-500 truncate">
                      {graph.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {graph.permission === 'owner' ? (
                      <span className="text-blue-600">Owner</span>
                    ) : (
                      <span className="capitalize">{graph.permission}</span>
                    )}
                  </div>
                </button>
              ))}
              {graphs.length === 0 && !isCreating && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No graphs yet. Create your first one!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
