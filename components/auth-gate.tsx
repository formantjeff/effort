'use client'

import { useState } from 'react'
import { useAuth } from './auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type AuthMode = 'signin' | 'signup' | 'reset'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithPassword, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      if (mode === 'signin') {
        await signInWithPassword(email, password)
        setMessage('Successfully signed in!')
      } else if (mode === 'signup') {
        if (password.length < 6) {
          setMessage('Password must be at least 6 characters long.')
          setIsSubmitting(false)
          return
        }
        if (password !== confirmPassword) {
          setMessage('Passwords do not match.')
          setIsSubmitting(false)
          return
        }
        await signUp(email, password)
        setMessage('Account created! Check your email to confirm.')
      } else if (mode === 'reset') {
        await resetPassword(email)
        setMessage('Password reset email sent! Check your inbox.')
      }
    } catch (error) {
      const err = error as Error
      setMessage(err?.message || 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = () => {
    alert('Google sign-in coming soon!')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-8">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl text-white">
              {mode === 'signin' && 'Welcome to Effort'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'reset' && 'Reset Password'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {mode === 'signin' && 'Sign in to your effort management account'}
              {mode === 'signup' && 'Create a new account to get started'}
              {mode === 'reset' && 'Enter your email to reset your password'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === 'signin' && (
              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                className="w-full bg-white hover:bg-gray-100 text-gray-900 border-0"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            )}

            {mode === 'signin' && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-800 px-2 text-slate-400">Or continue with email</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  required
                />
              </div>

              {mode !== 'reset' && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    required
                    minLength={6}
                  />
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-white">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    required
                    minLength={6}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  mode === 'signin' ? 'Signing in...' :
                  mode === 'signup' ? 'Creating account...' :
                  'Sending...'
                ) : (
                  mode === 'signin' ? 'Sign In' :
                  mode === 'signup' ? 'Sign Up' :
                  'Send Reset Link'
                )}
              </Button>

              {message && (
                <p className={`text-sm ${message.includes('Error') || message.includes('not match') || message.includes('must') ? 'text-red-400' : 'text-green-400'}`}>
                  {message}
                </p>
              )}
            </form>

            <div className="text-center space-y-2 text-sm">
              {mode === 'signin' && (
                <>
                  <p className="text-slate-400">
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => {
                        setMode('signup')
                        setMessage('')
                      }}
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Sign up
                    </button>
                  </p>
                  <p>
                    <button
                      onClick={() => {
                        setMode('reset')
                        setMessage('')
                      }}
                      className="text-slate-400 hover:text-slate-300 underline"
                    >
                      Forgot your password?
                    </button>
                  </p>
                </>
              )}

              {mode === 'signup' && (
                <p className="text-slate-400">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setMode('signin')
                      setMessage('')
                    }}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Sign in
                  </button>
                </p>
              )}

              {mode === 'reset' && (
                <p className="text-slate-400">
                  Remember your password?{' '}
                  <button
                    onClick={() => {
                      setMode('signin')
                      setMessage('')
                    }}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
