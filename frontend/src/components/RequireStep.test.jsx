import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../api/client', () => ({
  TOKEN_STORAGE_KEY: 'unmapped.token',
  login: vi.fn(),
  getMe: vi.fn(),
  whoami: vi.fn(),
  checkHealth: vi.fn(() => Promise.resolve({ status: 'ok' })),
  generateProfile: vi.fn(),
  assessRisk: vi.fn(),
  matchOpportunities: vi.fn(),
  getPolicyData: vi.fn(),
}))

import { FlowProvider } from '../context/FlowContext'
import { AuthProvider } from '../context/AuthContext'
import RequireStep, { RequireProfile, RequireAdmin } from './RequireStep'

beforeEach(() => {
  window.sessionStorage.clear()
  window.localStorage.clear()
})

// Pre-seed sessionStorage so FlowProvider hydrates with the desired state.
function seedFlow({ completedSteps = [], profile = null, formData = {} } = {}) {
  window.sessionStorage.setItem(
    'unmapped.flow.v1',
    JSON.stringify({ formData, completedSteps, profile, risk: null, opportunities: null })
  )
}

// Pre-seed localStorage so AuthContext hydrates with a token + username
// before render. AuthContext's `isAdmin` is derived from `username === 'admin'`.
function seedAuth({ token = null, username = null } = {}) {
  if (token) window.localStorage.setItem('unmapped.token', token)
  if (username) window.localStorage.setItem('unmapped.username', username)
}

function renderAt(path) {
  return render(
    <AuthProvider>
      <FlowProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<div>STEP 1</div>} />
            <Route path="/step2" element={<RequireStep step={2}><div>STEP 2</div></RequireStep>} />
            <Route path="/step3" element={<RequireStep step={3}><div>STEP 3</div></RequireStep>} />
            <Route path="/step4" element={<RequireStep step={4}><div>STEP 4</div></RequireStep>} />
            <Route path="/step5" element={<RequireStep step={5}><div>STEP 5</div></RequireStep>} />
            <Route path="/risk" element={<RequireProfile><div>RISK</div></RequireProfile>} />
            <Route path="/opportunities" element={<RequireProfile><div>OPPORTUNITIES</div></RequireProfile>} />
            <Route path="/admin" element={<RequireAdmin><div>ADMIN</div></RequireAdmin>} />
          </Routes>
        </MemoryRouter>
      </FlowProvider>
    </AuthProvider>
  )
}

describe('RequireStep guard', () => {
  it('always allows / (step 1) with no preconditions', () => {
    renderAt('/')
    expect(screen.getByText('STEP 1')).toBeInTheDocument()
  })

  it('redirects /step2 to / when step 1 is incomplete', () => {
    renderAt('/step2')
    expect(screen.getByText('STEP 1')).toBeInTheDocument()
    expect(screen.queryByText('STEP 2')).not.toBeInTheDocument()
  })

  it('allows /step2 when step 1 is complete', () => {
    seedFlow({ completedSteps: [1] })
    renderAt('/step2')
    expect(screen.getByText('STEP 2')).toBeInTheDocument()
  })

  it('redirects /step3 to the first incomplete step (step 2)', () => {
    seedFlow({ completedSteps: [1] })
    renderAt('/step3')
    expect(screen.getByText('STEP 2')).toBeInTheDocument()
    expect(screen.queryByText('STEP 3')).not.toBeInTheDocument()
  })

  it('allows /step3 when steps 1 and 2 are complete', () => {
    seedFlow({ completedSteps: [1, 2] })
    renderAt('/step3')
    expect(screen.getByText('STEP 3')).toBeInTheDocument()
  })

  it('allows /step5 only when steps 1-4 are complete', () => {
    seedFlow({ completedSteps: [1, 2, 3, 4] })
    renderAt('/step5')
    expect(screen.getByText('STEP 5')).toBeInTheDocument()
  })

  it('redirects /step5 to / with no completion at all', () => {
    renderAt('/step5')
    expect(screen.getByText('STEP 1')).toBeInTheDocument()
  })
})

describe('RequireProfile guard', () => {
  it('redirects /risk to / when no profile exists', () => {
    renderAt('/risk')
    expect(screen.getByText('STEP 1')).toBeInTheDocument()
    expect(screen.queryByText('RISK')).not.toBeInTheDocument()
  })

  it('redirects /opportunities to / when no profile exists', () => {
    renderAt('/opportunities')
    expect(screen.getByText('STEP 1')).toBeInTheDocument()
    expect(screen.queryByText('OPPORTUNITIES')).not.toBeInTheDocument()
  })

  it('allows /risk when profile exists', () => {
    seedFlow({ profile: { profile_id: 'p1', skills: {} } })
    renderAt('/risk')
    expect(screen.getByText('RISK')).toBeInTheDocument()
  })
})

describe('RequireAdmin guard (AuthContext-driven)', () => {
  it('redirects /admin to / when no user is signed in', () => {
    renderAt('/admin')
    expect(screen.queryByText('ADMIN')).not.toBeInTheDocument()
    expect(screen.getByText('STEP 1')).toBeInTheDocument()
  })

  it('redirects /admin to / when the signed-in user is not "admin"', () => {
    seedAuth({ token: 'fake-token', username: 'alice' })
    renderAt('/admin')
    expect(screen.queryByText('ADMIN')).not.toBeInTheDocument()
    expect(screen.getByText('STEP 1')).toBeInTheDocument()
  })

  it('allows /admin when username is exactly "admin"', () => {
    seedAuth({ token: 'fake-token', username: 'admin' })
    renderAt('/admin')
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
  })
})
