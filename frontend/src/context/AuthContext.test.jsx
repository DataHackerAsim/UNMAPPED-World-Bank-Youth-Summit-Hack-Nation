import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

vi.mock('../api/client', () => ({
  TOKEN_STORAGE_KEY: 'unmapped.token',
  login: vi.fn(),
  getMe: vi.fn(),
  whoami: vi.fn(),
  checkHealth: vi.fn(),
}))

import { AuthProvider, useAuth } from './AuthContext'
import * as api from '../api/client'

beforeEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
  captured = null
})

// Probe exposes the AuthContext value to the test via a closure so we can
// drive `login()` / `logout()` directly and observe rejection without an
// unhandled-rejection escaping into the test runner.
let captured = null
function Probe() {
  const value = useAuth()
  captured = value
  const { username, token, isAdmin } = value
  return (
    <div>
      <span data-testid="username">{username ?? 'null'}</span>
      <span data-testid="token">{token ?? 'null'}</span>
      <span data-testid="isAdmin">{isAdmin ? 'yes' : 'no'}</span>
    </div>
  )
}

describe('AuthContext', () => {
  it('starts empty when nothing is in localStorage', () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByTestId('username')).toHaveTextContent('null')
    expect(screen.getByTestId('token')).toHaveTextContent('null')
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('no')
  })

  it('hydrates from localStorage on mount', () => {
    window.localStorage.setItem('unmapped.token', 'persisted-token')
    window.localStorage.setItem('unmapped.username', 'admin')
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByTestId('username')).toHaveTextContent('admin')
    expect(screen.getByTestId('token')).toHaveTextContent('persisted-token')
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('yes')
  })

  it('isAdmin is true only when username === "admin"', () => {
    window.localStorage.setItem('unmapped.token', 't')
    window.localStorage.setItem('unmapped.username', 'alice')
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('no')
  })

  it('login() calls api.login, stores token+username, persists to localStorage', async () => {
    api.login.mockResolvedValueOnce('fresh-token')
    render(<AuthProvider><Probe /></AuthProvider>)
    await act(async () => { await captured.login('admin', 'admin') })
    expect(api.login).toHaveBeenCalledWith('admin', 'admin')
    expect(screen.getByTestId('token')).toHaveTextContent('fresh-token')
    expect(screen.getByTestId('username')).toHaveTextContent('admin')
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('yes')
    expect(window.localStorage.getItem('unmapped.token')).toBe('fresh-token')
    expect(window.localStorage.getItem('unmapped.username')).toBe('admin')
  })

  it('login() rejection leaves state unchanged', async () => {
    api.login.mockRejectedValueOnce(new Error('401'))
    render(<AuthProvider><Probe /></AuthProvider>)
    await act(async () => {
      await expect(captured.login('admin', 'wrong')).rejects.toThrow('401')
    })
    expect(screen.getByTestId('token')).toHaveTextContent('null')
    expect(screen.getByTestId('username')).toHaveTextContent('null')
  })

  it('logout() clears state and localStorage', async () => {
    window.localStorage.setItem('unmapped.token', 't')
    window.localStorage.setItem('unmapped.username', 'admin')

    // jsdom marks `location.assign` as non-configurable, so vi.spyOn can't
    // patch it. Replace the whole `location` object with a stub that exposes
    // an `assign` we can observe; restore it after the test.
    const original = window.location
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, assign },
    })

    render(<AuthProvider><Probe /></AuthProvider>)
    await act(async () => { captured.logout() })
    expect(screen.getByTestId('token')).toHaveTextContent('null')
    expect(screen.getByTestId('username')).toHaveTextContent('null')
    expect(window.localStorage.getItem('unmapped.token')).toBeNull()
    expect(window.localStorage.getItem('unmapped.username')).toBeNull()
    expect(assign).toHaveBeenCalledWith('/login')

    Object.defineProperty(window, 'location', { configurable: true, value: original })
  })
})
