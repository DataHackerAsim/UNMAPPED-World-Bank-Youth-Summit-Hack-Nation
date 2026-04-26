import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { login as apiLogin, TOKEN_STORAGE_KEY } from '../api/client'

const AuthContext = createContext(null)

const USERNAME_STORAGE_KEY = 'unmapped.username'

function readPersistedAuth() {
  if (typeof window === 'undefined') return { token: null, username: null }
  try {
    return {
      token:    window.localStorage.getItem(TOKEN_STORAGE_KEY),
      username: window.localStorage.getItem(USERNAME_STORAGE_KEY),
    }
  } catch {
    return { token: null, username: null }
  }
}

function persistAuth(token, username) {
  if (typeof window === 'undefined') return
  try {
    if (token)    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else          window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    if (username) window.localStorage.setItem(USERNAME_STORAGE_KEY, username)
    else          window.localStorage.removeItem(USERNAME_STORAGE_KEY)
  } catch {
    // localStorage unavailable (private mode / quota) — in-memory state still works
  }
}

export function AuthProvider({ children }) {
  const initial = readPersistedAuth()
  const [token,    setToken]    = useState(initial.token)
  const [username, setUsername] = useState(initial.username)

  // Keep storage in sync if either changes from elsewhere
  useEffect(() => { persistAuth(token, username) }, [token, username])

  const login = async (uname, password) => {
    const newToken = await apiLogin(uname, password)
    setToken(newToken)
    setUsername(uname)
    return newToken
  }

  const logout = () => {
    setToken(null)
    setUsername(null)
    // Hard navigate so all caches/state owned by other contexts are dropped.
    if (typeof window !== 'undefined') window.location.assign('/login')
  }

  // Hardcoded admin check, per spec. The backend's `/me` endpoint is the
  // canonical source if we ever want to relax this; getMe() is exported
  // from client.js so a future refactor can swap this in cheaply.
  const isAdmin = username === 'admin'

  const value = useMemo(
    () => ({ username, token, isAdmin, login, logout }),
    [username, token, isAdmin]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
