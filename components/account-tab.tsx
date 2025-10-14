'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { LogOut, Moon, Sun, Share2, Trash2, Eye, Copy, Check } from 'lucide-react'
import { useTheme } from './theme-provider'
import { createClient } from '@/lib/supabase-browser'
import { SharedEffort, EffortGraph } from '@/lib/supabase'

interface AccountTabProps {
  email: string | undefined
  onSignOut: () => void
}

interface ShareWithGraph extends SharedEffort {
  effort_graphs: EffortGraph
}

export function AccountTab({ email, onSignOut }: AccountTabProps) {
  const { theme, setTheme, loading } = useTheme()
  const [shares, setShares] = useState<ShareWithGraph[]>([])
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadShares()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadShares() {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data, error } = await supabase
        .from('shared_efforts')
        .select('*, effort_graphs(*)')
        .eq('created_by', user.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setShares((data as ShareWithGraph[]) || [])
    } catch (error) {
      console.error('Error loading shares:', error)
    }
  }

  async function handleDeleteShare(id: string, name: string) {
    if (!confirm(`Stop sharing "${name}"? The link will no longer work.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('shared_efforts')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      setShares((prev) => prev.filter((s) => s.id !== id))
    } catch (error) {
      console.error('Error deleting share:', error)
      alert('Failed to stop sharing. Please try again.')
    }
  }

  function handleCopyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="p-4 space-y-4">
      <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Email</p>
            <p className="text-base font-medium text-gray-900 dark:text-white">{email}</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="theme-toggle" className="flex items-center gap-2 text-gray-900 dark:text-white cursor-pointer">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span>{theme === 'dark' ? 'Dark' : 'Light'} Mode</span>
            </Label>
            <Switch
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              disabled={loading}
            />
          </div>

          <Button onClick={onSignOut} variant="outline" className="w-full border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Shared Efforts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shares.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
              No active shares
            </p>
          ) : (
            <div className="space-y-3">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {share.effort_graphs.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Eye className="h-3 w-3 text-gray-500 dark:text-slate-400" />
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {share.view_count} views
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLink(share.share_token)}
                      className="h-8 w-8 p-0 text-gray-600 dark:text-slate-300"
                    >
                      {copiedToken === share.share_token ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteShare(share.id, share.effort_graphs.name)}
                      className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
