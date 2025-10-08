'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './auth-provider'
import { createClient } from '@/lib/supabase-browser'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => Promise<void>
  loading: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<Theme>('dark')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Load user's theme preference
  useEffect(() => {
    async function loadTheme() {
      if (!user) {
        setThemeState('dark')
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error loading theme:', error)
        }

        if (data) {
          setThemeState(data.theme as Theme)
        } else {
          // Create default preferences for new user
          await supabase
            .from('user_preferences')
            .insert([{ user_id: user.id, theme: 'dark' }])
        }
      } catch (error) {
        console.error('Error loading theme:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTheme()
  }, [user, supabase])

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)

    if (user) {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert(
            { user_id: user.id, theme: newTheme },
            { onConflict: 'user_id' }
          )

        if (error) {
          console.error('Error saving theme:', error)
        }
      } catch (error) {
        console.error('Error saving theme:', error)
      }
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
