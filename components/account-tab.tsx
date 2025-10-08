'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut } from 'lucide-react'

interface AccountTabProps {
  email: string | undefined
  onSignOut: () => void
}

export function AccountTab({ email, onSignOut }: AccountTabProps) {
  return (
    <div className="p-4 space-y-4">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-400">Email</p>
            <p className="text-base font-medium text-white">{email}</p>
          </div>
          <Button onClick={onSignOut} variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
