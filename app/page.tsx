'use client'

import { useState, useEffect } from 'react'
import { WorkstreamSlider } from '@/components/workstream-slider'
import { EffortPieChart } from '@/components/effort-pie-chart'
import { AuthGate } from '@/components/auth-gate'
import { GraphSelector } from '@/components/graph-selector'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-browser'
import { Workstream, EffortGraph, GraphWithPermission } from '@/lib/supabase'
import { LogOut } from 'lucide-react'

// Color palette for workstreams
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

export default function Home() {
  const { user, signOut } = useAuth()
  const [graphs, setGraphs] = useState<GraphWithPermission[]>([])
  const [currentGraph, setCurrentGraph] = useState<EffortGraph | null>(null)
  const [workstreams, setWorkstreams] = useState<Workstream[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Load user's graphs
  useEffect(() => {
    if (user) {
      loadGraphs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Load workstreams when graph changes
  useEffect(() => {
    if (currentGraph) {
      loadWorkstreams()
    } else {
      setWorkstreams([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGraph])

  async function loadGraphs() {
    try {
      // Get graphs owned by user
      const { data: ownedGraphs, error: ownedError } = await supabase
        .from('effort_graphs')
        .select('*')
        .eq('author_id', user!.id)
        .order('created_at', { ascending: false })

      if (ownedError) throw ownedError

      // Get graphs shared with user
      const { data: permissions, error: permError } = await supabase
        .from('graph_permissions')
        .select('*, effort_graphs(*)')
        .eq('user_id', user!.id)

      if (permError) throw permError

      // Combine and format
      const allGraphs: GraphWithPermission[] = [
        ...(ownedGraphs || []).map(g => ({ ...g, permission: 'owner' as const })),
        ...(permissions || []).map(p => ({
          ...(p.effort_graphs as EffortGraph),
          permission: p.permission_level as 'viewer' | 'editor'
        }))
      ]

      setGraphs(allGraphs)

      // Auto-select first graph
      if (allGraphs.length > 0 && !currentGraph) {
        setCurrentGraph(allGraphs[0])
      }
    } catch (error) {
      console.error('Error loading graphs:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadWorkstreams() {
    if (!currentGraph) return

    try {
      const { data, error } = await supabase
        .from('workstreams')
        .select('*')
        .eq('graph_id', currentGraph.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setWorkstreams(data || [])
    } catch (error) {
      console.error('Error loading workstreams:', error)
    }
  }

  async function handleCreateGraph(name: string, description: string) {
    try {
      const { data, error } = await supabase
        .from('effort_graphs')
        .insert([
          {
            name,
            description: description || null,
            author_id: user!.id,
          },
        ])
        .select()
        .single()

      if (error) throw error

      const newGraph: GraphWithPermission = { ...data, permission: 'owner' }
      setGraphs((prev) => [newGraph, ...prev])
      setCurrentGraph(newGraph)
    } catch (error) {
      console.error('Error creating graph:', error)
    }
  }

  async function handleSelectGraph(graphId: string) {
    const graph = graphs.find((g) => g.id === graphId)
    if (graph) {
      setCurrentGraph(graph)
    }
  }

  async function handleUpdateEffort(id: string, effort: number) {
    try {
      const { error } = await supabase
        .from('workstreams')
        .update({ effort })
        .eq('id', id)

      if (error) throw error

      setWorkstreams((prev) =>
        prev.map((ws) => (ws.id === id ? { ...ws, effort } : ws))
      )
    } catch (error) {
      console.error('Error updating effort:', error)
    }
  }

  async function handleUpdateName(id: string, name: string) {
    try {
      const { error } = await supabase
        .from('workstreams')
        .update({ name })
        .eq('id', id)

      if (error) throw error

      setWorkstreams((prev) =>
        prev.map((ws) => (ws.id === id ? { ...ws, name } : ws))
      )
    } catch (error) {
      console.error('Error updating name:', error)
    }
  }

  async function handleAddWorkstream() {
    if (!currentGraph) return

    try {
      const colorIndex = workstreams.length % COLORS.length
      const newWorkstream = {
        name: `Workstream ${workstreams.length + 1}`,
        effort: 0,
        color: COLORS[colorIndex],
        graph_id: currentGraph.id,
      }

      const { data, error } = await supabase
        .from('workstreams')
        .insert([newWorkstream])
        .select()
        .single()

      if (error) throw error
      setWorkstreams((prev) => [...prev, data])
    } catch (error) {
      console.error('Error adding workstream:', error)
    }
  }

  async function handleDeleteWorkstream(id: string) {
    try {
      const { error } = await supabase.from('workstreams').delete().eq('id', id)

      if (error) throw error
      setWorkstreams((prev) => prev.filter((ws) => ws.id !== id))
    } catch (error) {
      console.error('Error deleting workstream:', error)
    }
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Effort</h1>
              <p className="text-gray-600 mt-2">
                Manage and visualize team workstream allocations
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>

          <div className="mb-6">
            <GraphSelector
              graphs={graphs}
              currentGraph={currentGraph}
              onSelectGraph={handleSelectGraph}
              onCreateGraph={handleCreateGraph}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : currentGraph ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <WorkstreamSlider
                workstreams={workstreams}
                onUpdateEffort={handleUpdateEffort}
                onDeleteWorkstream={handleDeleteWorkstream}
                onAddWorkstream={handleAddWorkstream}
                onUpdateName={handleUpdateName}
              />
              <EffortPieChart workstreams={workstreams} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>Create your first effort graph to get started!</p>
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  )
}
