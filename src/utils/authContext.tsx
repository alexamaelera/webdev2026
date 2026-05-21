import { useEffect, useState } from 'react'

type AppUser = { id: number; username: string; password?: string; role?: string; email?: string }

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_v1')
      if (raw) setUser(JSON.parse(raw))
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('user_v1')
    setUser(null)
  }

  return { user, loading, logout, setUser }
}
