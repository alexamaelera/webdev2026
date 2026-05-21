import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type AppUser = {
  id: number
  username: string
  password: string
  role: 'admin' | 'staff' | 'user'
  email?: string
}

export default function Login() {
  const [isSignup, setIsSignup] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const current = localStorage.getItem('user_v1')
    if (!current) return

    try {
      const user = JSON.parse(current) as AppUser
      if (user.role === 'admin') navigate('/admin')
      else if (user.role === 'staff') navigate('/staff')
      else navigate('/menu')
    } catch {
      localStorage.removeItem('user_v1')
    }
  }, [navigate])

  const getUsers = async (): Promise<AppUser[]> => {
    let dataUsers: AppUser[] = []
    try {
      const res = await fetch('/data/users.json')
      if (res.ok) {
        const ct = (res.headers.get('content-type') || '').toLowerCase()
        if (ct.includes('application/json')) dataUsers = await res.json()
        else throw new Error('Invalid content-type')
      }
    } catch {
      dataUsers = []
    }

    const storedUsers = JSON.parse(localStorage.getItem('users_v1') || '[]')
    // Embedded fallback users to guarantee admin/staff login works even when remote data is unavailable
    const embeddedFallback: AppUser[] = [
      { id: 1, username: 'jireh', password: 'faith', role: 'admin', email: 'jireh@lexandnitchcafe.com' },
      { id: 2, username: 'ali', password: 'ali123', role: 'staff', email: 'ali@gmail.com' },
      { id: 3, username: 'jai', password: '212121', role: 'staff', email: 'jai@local' }
    ]

    const all = [
      ...(Array.isArray(dataUsers) ? dataUsers : []),
      ...(Array.isArray(storedUsers) ? storedUsers : []),
      ...embeddedFallback
    ] as AppUser[]

    // Return combined users (stored users override seed when username/email conflict)
    const dedup = new Map<string, AppUser>()
    all.forEach((u) => {
      const key = (u.email || u.username || '').toLowerCase()
      if (!key) return
      dedup.set(key, u)
    })
    const result = Array.from(dedup.values())

    // If no users found from data files or localStorage, provide a small embedded fallback
    if (result.length === 0) {
      return [
        { id: 1, username: 'jireh', password: 'faith', role: 'admin', email: 'jireh@lexandnitchcafe.com' },
        { id: 2, username: 'ali', password: 'ali123', role: 'staff', email: 'ali@gmail.com' },
        { id: 3, username: 'jai', password: '212121', role: 'staff', email: 'jai@local' }
      ]
    }

    return result
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const errors: string[] = []
    const input = username.trim().toLowerCase()

    if (!isSignup) {
      if (!input) errors.push('Username or Email is required.')
      if (!password) errors.push('Password is required.')

      if (errors.length === 0) {
        try {
          const users = await getUsers()

          const matched = users.find((u) => {
            const email = (u.email || '').toLowerCase()
            const uname = (u.username || '').toLowerCase()
            return email === input || uname === input
          })

          if (!matched) {
            setError('Username not found!')
            setLoading(false)
            return
          }

          if (matched.password !== password) {
            setError('Invalid username or password!')
            setLoading(false)
            return
          }

          localStorage.setItem('user_v1', JSON.stringify(matched))
          if (matched.role === 'admin') navigate('/admin')
          else if (matched.role === 'staff') navigate('/staff')
          else navigate('/menu')
        } catch (err) {
          setError('Invalid username or password!')
        }
      }
    } else {
      if (!input) errors.push('Username is required.')
      else if (input.length < 3 || input.length > 30) errors.push('Username must be 3-30 characters.')
      if (!password) errors.push('Password is required.')
      if (password !== confirmPassword) errors.push('Passwords do not match!')

      if (errors.length === 0) {
        try {
          const users = await getUsers()
          if (users.some((u) => u.username.toLowerCase() === input)) {
            throw new Error('Username already exists.')
          }

          const localOnly = JSON.parse(localStorage.getItem('users_v1') || '[]') as AppUser[]
          const nextId = localOnly.length ? Math.max(...localOnly.map((u) => u.id)) + 1 : 1000
          const newUser: AppUser = {
            id: nextId,
            username: username.trim(),
            password,
            role: 'user',
            email: input.includes('@') ? input : `${input}@lexnitch.local`
          }

          localStorage.setItem('users_v1', JSON.stringify([...localOnly, newUser]))
          setSuccess('Account created successfully! You can now login.')
          setUsername('')
          setPassword('')
          setConfirmPassword('')
          setIsSignup(false)
        } catch (err: any) {
          setError(err.message || 'Signup failed. Please try again.')
        }
      }
    }

    if (errors.length > 0) setError(errors.join(' '))
    setLoading(false)
  }

  return (
    <div className="login-page-split">
      <div className="login-pane-image">
        <div className="login-pane-overlay">
          <div className="pane-content">
            <h1 className="pane-title">Lex &amp; Nitch Cafe</h1>
            <p className="pane-subtitle">Where whimsical enchantment meets the calm of nature. Log in to explore.</p>
          </div>
        </div>
      </div>

      <div className="login-pane-form">
        <div className="login-form-wrapper">
          <div style={{ textAlign: 'center', marginBottom: '32px', paddingBottom: '16px', borderBottom: '1px solid #e8e8e8' }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.8em', color: '#556B2F', margin: '0 0 6px 0', fontWeight: '700' }}>Lex &amp; Nitch Cafe</h1>
            <p style={{ color: '#999', margin: 0, fontSize: '0.85em' }}>Where Great Coffee Meets Great Treats</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="login-form-modern">
            <div className="input-group">
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder=" "
              />
              <label htmlFor="username">Username or Email</label>
            </div>

            <div className="input-group">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder=" "
              />
              <label htmlFor="password">Password</label>
            </div>

            {isSignup && (
              <div className="input-group" style={{ animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
                <input
                  type="password"
                  id="confirm_password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder=" "
                />
                <label htmlFor="confirm_password">Confirm Password</label>
              </div>
            )}

            <button type="submit" className="btn btn-login-submit" disabled={loading}>
              {loading ? 'Processing...' : isSignup ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div className="login-footer-modern">
            <Link to="/">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
