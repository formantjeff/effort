'use client'

import { useState, useEffect } from 'react'
import { WorkstreamSlider } from '@/components/workstream-slider'
import { EffortPieChart } from '@/components/effort-pie-chart'
import { EffortCard } from '@/components/effort-card'
import { AuthGate } from '@/components/auth-gate'
import { BottomNav } from '@/components/bottom-nav'
import { AccountTab } from '@/components/account-tab'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase-browser'
import { Workstream, EffortGraph, GraphWithPermission } from '@/lib/supabase'
import { Plus } from 'lucide-react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'

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
  const [isEditing, setIsEditing] = useState(false)
  const [currentTab, setCurrentTab] = useState<'effort' | 'library' | 'account'>('library')
  const [allWorkstreams, setAllWorkstreams] = useState<Record<string, Workstream[]>>({})
  const [swipeDirection, setSwipeDirection] = useState<number>(0)
  const supabase = createClient()

  // Load user's graphs and reset to library view on login
  useEffect(() => {
    if (user) {
      loadGraphs()
      setCurrentTab('library') // Always start at library view
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Load all workstreams when graphs change
  useEffect(() => {
    if (graphs.length > 0) {
      loadAllWorkstreams()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphs])

  // Load workstreams when graph changes
  useEffect(() => {
    if (currentGraph) {
      loadWorkstreams()
      setIsEditing(false) // Reset edit mode when opening an effort
    } else {
      setWorkstreams([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGraph])

  // Show sliders by default if no workstreams exist
  useEffect(() => {
    if (workstreams.length === 0) {
      setIsEditing(true)
    }
  }, [workstreams.length])

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

  async function loadAllWorkstreams() {
    if (graphs.length === 0) return

    try {
      const workstreamsByGraph: Record<string, Workstream[]> = {}

      await Promise.all(
        graphs.map(async (graph) => {
          const { data, error } = await supabase
            .from('workstreams')
            .select('*')
            .eq('graph_id', graph.id)
            .order('created_at', { ascending: true })

          if (!error && data) {
            workstreamsByGraph[graph.id] = data
          }
        })
      )

      setAllWorkstreams(workstreamsByGraph)
    } catch (error) {
      console.error('Error loading all workstreams:', error)
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

  function handleSwipe(direction: number) {
    if (!currentGraph || graphs.length === 0) return

    const currentIndex = graphs.findIndex((g) => g.id === currentGraph.id)
    let nextIndex = currentIndex + direction

    // Wrap around
    if (nextIndex < 0) nextIndex = graphs.length - 1
    if (nextIndex >= graphs.length) nextIndex = 0

    setSwipeDirection(direction)
    setCurrentGraph(graphs[nextIndex])
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-white dark:bg-black pb-20">
        <div className="max-w-7xl mx-auto">
          {currentTab === 'effort' && (
            <div className="p-4 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500 dark:text-slate-400">Loading...</p>
                </div>
              ) : currentGraph ? (
                <motion.div
                  key={currentGraph.id}
                  initial={{ x: swipeDirection * 100 + '%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: swipeDirection * -100 + '%', opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(event, info: PanInfo) => {
                    const threshold = 50
                    if (info.offset.x > threshold) {
                      handleSwipe(-1) // Swipe right = go to previous
                    } else if (info.offset.x < -threshold) {
                      handleSwipe(1) // Swipe left = go to next
                    }
                  }}
                  className="space-y-4"
                >
                  <EffortPieChart
                    workstreams={workstreams}
                    onEditClick={() => setIsEditing(!isEditing)}
                    onUpdateEffort={handleUpdateEffort}
                    isEditing={isEditing}
                    title={currentGraph.name}
                    graphId={currentGraph.id}
                  />
                  {isEditing && (
                    <WorkstreamSlider
                      workstreams={workstreams}
                      onUpdateEffort={handleUpdateEffort}
                      onDeleteWorkstream={handleDeleteWorkstream}
                      onAddWorkstream={handleAddWorkstream}
                      onUpdateName={handleUpdateName}
                    />
                  )}
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-slate-400">
                  <p>Create your first effort graph to get started!</p>
                </div>
              )}
            </div>
          )}

          {currentTab === 'library' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Library</h1>
                <Button
                  size="sm"
                  onClick={() => {
                    const name = prompt('Enter effort name:')
                    if (name) handleCreateGraph(name, '')
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500 dark:text-slate-400">Loading...</p>
                </div>
              ) : graphs.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {graphs.map((graph) => (
                    <EffortCard
                      key={graph.id}
                      name={graph.name}
                      workstreams={allWorkstreams[graph.id] || []}
                      onClick={() => {
                        setCurrentGraph(graph)
                        setCurrentTab('effort')
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-slate-400">
                  <p className="mb-4">No efforts yet</p>
                  <Button
                    onClick={() => {
                      const name = prompt('Enter effort name:')
                      if (name) handleCreateGraph(name, '')
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first effort
                  </Button>
                </div>
              )}
            </div>
          )}

          {currentTab === 'account' && (
            <AccountTab email={user?.email} onSignOut={signOut} />
          )}
        </div>

        <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      </div>
    </AuthGate>
  )
}
