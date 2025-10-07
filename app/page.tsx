'use client'

import { useState, useEffect } from 'react'
import { WorkstreamSlider } from '@/components/workstream-slider'
import { EffortPieChart } from '@/components/effort-pie-chart'
import { supabase, Workstream } from '@/lib/supabase'

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
  const [workstreams, setWorkstreams] = useState<Workstream[]>([])
  const [loading, setLoading] = useState(true)

  // Load workstreams from Supabase
  useEffect(() => {
    loadWorkstreams()
  }, [])

  async function loadWorkstreams() {
    try {
      const { data, error } = await supabase
        .from('workstreams')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setWorkstreams(data || [])
    } catch (error) {
      console.error('Error loading workstreams:', error)
    } finally {
      setLoading(false)
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
    try {
      const colorIndex = workstreams.length % COLORS.length
      const newWorkstream = {
        name: `Workstream ${workstreams.length + 1}`,
        effort: 0,
        color: COLORS[colorIndex],
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
      const { error } = await supabase
        .from('workstreams')
        .delete()
        .eq('id', id)

      if (error) throw error
      setWorkstreams((prev) => prev.filter((ws) => ws.id !== id))
    } catch (error) {
      console.error('Error deleting workstream:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Effort</h1>
          <p className="text-gray-600 mt-2">
            Manage and visualize team workstream allocations
          </p>
        </header>

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
      </div>
    </div>
  )
}
