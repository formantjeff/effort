'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { EffortPieChart } from '@/components/effort-pie-chart'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-browser'
import { Workstream, EffortGraph, SharedEffort } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'
import { Pencil, LogIn } from 'lucide-react'

export default function SharePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const { user } = useAuth()
  const [graph, setGraph] = useState<EffortGraph | null>(null)
  const [workstreams, setWorkstreams] = useState<Workstream[]>([])
  const [share, setShare] = useState<SharedEffort | null>(null)
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSharedEffort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user])

  async function loadSharedEffort() {
    try {
      // Get the shared effort by token
      const { data: shareData, error: shareError } = await supabase
        .from('shared_efforts')
        .select('*')
        .eq('share_token', token)
        .eq('is_active', true)
        .single()

      if (shareError || !shareData) {
        console.error('Share not found:', shareError)
        setLoading(false)
        return
      }

      setShare(shareData)

      // Increment view count
      await supabase
        .from('shared_efforts')
        .update({ view_count: shareData.view_count + 1 })
        .eq('id', shareData.id)

      // Get the graph
      const { data: graphData, error: graphError } = await supabase
        .from('effort_graphs')
        .select('*')
        .eq('id', shareData.graph_id)
        .single()

      if (graphError) throw graphError
      setGraph(graphData)

      // Get workstreams
      const { data: workstreamData, error: workstreamError } = await supabase
        .from('workstreams')
        .select('*')
        .eq('graph_id', shareData.graph_id)
        .order('created_at', { ascending: true })

      if (workstreamError) throw workstreamError
      setWorkstreams(workstreamData || [])

      // Check if user can edit (must be logged in and be owner or have editor permission)
      if (user) {
        if (graphData.author_id === user.id) {
          setCanEdit(true)
        } else {
          const { data: permData } = await supabase
            .from('graph_permissions')
            .select('permission_level')
            .eq('graph_id', shareData.graph_id)
            .eq('user_id', user.id)
            .single()

          if (permData && permData.permission_level === 'editor') {
            setCanEdit(true)
          }
        }
      }
    } catch (error) {
      console.error('Error loading shared effort:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateEffort(id: string, effort: number) {
    if (!canEdit) return

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

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <p className="text-gray-500 dark:text-slate-400">Loading...</p>
      </div>
    )
  }

  if (!graph || !share) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Share Not Found
        </h1>
        <p className="text-gray-500 dark:text-slate-400 mb-6">
          This share link is invalid or has been removed.
        </p>
        <Button onClick={() => router.push('/')} className="bg-blue-600 hover:bg-blue-700 text-white">
          Go to Home
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-20">
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{graph.name}</h1>
            {graph.description && (
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{graph.description}</p>
            )}
          </div>
          {!user ? (
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="border-gray-300 dark:border-slate-600"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In to Edit
            </Button>
          ) : canEdit ? (
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="outline"
              className="border-gray-300 dark:border-slate-600"
            >
              <Pencil className="h-4 w-4 mr-2" />
              {isEditing ? 'Done' : 'Edit'}
            </Button>
          ) : null}
        </div>

        <EffortPieChart
          workstreams={workstreams}
          onEditClick={() => setIsEditing(!isEditing)}
          onUpdateEffort={handleUpdateEffort}
          isEditing={isEditing && canEdit}
          title=""
        />
      </div>
    </div>
  )
}
