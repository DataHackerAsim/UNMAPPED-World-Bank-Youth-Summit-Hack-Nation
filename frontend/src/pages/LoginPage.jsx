import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // If a ProtectedRoute redirected here, send the user back to wherever
  // they were trying to go after a successful login.
  const from = location.state?.from || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setSubmitting(true)
    setError(null)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch {
      setError('Invalid credentials')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-content-bg p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold text-text-primary mb-1">UNMAPPED</h1>
          <p className="font-mono text-[10px] tracking-widest text-text-secondary">
            SKILL TO OPPORTUNITY MAPPING
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-lg p-6"
          noValidate
        >
          <p className="font-mono text-[10px] tracking-widest text-text-secondary uppercase mb-5">
            Sign in
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="login-username" className="form-label">Username</label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                className="dark-input"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="form-label">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="dark-input"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 font-mono text-xs text-red"
            >
              ⚠ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !username.trim() || !password}
            className="btn-primary mt-6"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="mt-5 font-mono text-[10px] text-text-muted text-center">
            Accounts are created by an administrator.
          </p>
        </form>
      </div>
    </div>
  )
}
