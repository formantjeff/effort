'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { InteractivePieChart } from './interactive-pie-chart'
import { Workstream } from '@/lib/supabase'
import { Pencil, Share2, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface EffortPieChartProps {
  workstreams: Workstream[]
  onEditClick: () => void
  onUpdateEffort: (id: string, effort: number) => void
  isEditing: boolean
  title?: string
  graphId?: string
}

export function EffortPieChart({ workstreams, onEditClick, onUpdateEffort, isEditing, title = 'Effort Distribution', graphId }: EffortPieChartProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const supabase = createClient()
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
        <div className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">{payload[0].name}</p>
          <p className="text-sm text-gray-600 dark:text-slate-300">{payload[0].payload.value.toFixed(1)}% of total</p>
        </div>
      )
    }
    return null
  }

  const handleCreateShare = async () => {
    if (!graphId) return

    try {
      // Check if share already exists
      const { data: existingShare } = await supabase
        .from('shared_efforts')
        .select('share_token')
        .eq('graph_id', graphId)
        .eq('is_active', true)
        .single()

      let token: string
      if (existingShare) {
        token = existingShare.share_token
      } else {
        // Create new share
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) return

        const { data: newShare, error } = await supabase
          .from('shared_efforts')
          .insert([{
            graph_id: graphId,
            created_by: user.user.id
          }])
          .select('share_token')
          .single()

        if (error) throw error
        token = newShare.share_token
      }

      const url = `${window.location.origin}/share/${token}`
      setShareUrl(url)

      // Try native share first (mobile), then fall back to clipboard
      if (navigator.share) {
        try {
          await navigator.share({
            title: title || 'Effort Distribution',
            text: `Check out my effort allocation: ${title}`,
            url: url,
          })
          // Success - show visual feedback
          setCopiedLink(true)
          setTimeout(() => setCopiedLink(false), 2000)
        } catch (shareError) {
          // User cancelled or share failed - try clipboard as fallback
          if ((shareError as Error).name !== 'AbortError') {
            await copyToClipboard(url)
          }
        }
      } else {
        // No native share - use clipboard
        await copyToClipboard(url)
      }
    } catch (error) {
      console.error('Error creating share:', error)
    }
  }

  async function copyToClipboard(url: string) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = url
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (clipboardError) {
      console.error('Error copying to clipboard:', clipboardError)
      alert(`Share link created: ${url}`)
    }
  }

  if (data.length === 0) {
    return (
      <Card className="h-full bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <p className="text-gray-500 dark:text-slate-400 text-center">
            No workstreams yet.<br />Add a workstream to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-900 dark:text-white">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {graphId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCreateShare}
                className="shrink-0 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                title={copiedLink ? "Link copied!" : "Create share link"}
              >
                {copiedLink ? <Check className="h-5 w-5 text-green-500" /> : <Share2 className="h-5 w-5" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onEditClick}
              className="shrink-0 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
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
                label={(props: any) => `${props.value.toFixed(1)}%`}
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
