import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import React from 'react'

// Mock the api client so FlowProvider's mount effect does not hit the network
// and so submitProfile / fetchRisk / fetchOpportunities are deterministic.
vi.mock('../api/client', () => ({
  TOKEN_STORAGE_KEY: 'unmapped.token',
  checkHealth: vi.fn(() => Promise.resolve({ status: 'ok' })),
  generateProfile: vi.fn(),
  assessRisk: vi.fn(),
  matchOpportunities: vi.fn(),
  getPolicyData: vi.fn(),
}))

import { FlowProvider, useFlow } from './FlowContext'
import * as api from '../api/client'

function Probe({ onReady }) {
  const flow = useFlow()
  React.useEffect(() => { onReady(flow) }, [flow, onReady])
  return null
}

function renderWithProvider() {
  let captured
  const setCapture = (f) => { captured = f }
  render(
    <FlowProvider>
      <Probe onReady={setCapture} />
    </FlowProvider>
  )
  return () => captured
}

beforeEach(() => {
  window.sessionStorage.clear()
  vi.clearAllMocks()
  api.checkHealth.mockResolvedValue({ status: 'ok' })
})

describe('FlowContext', () => {
  it('starts with empty form data and no completed steps', () => {
    const get = renderWithProvider()
    expect(get().formData).toEqual({})
    expect(Array.from(get().completedSteps)).toEqual([])
    expect(get().profile).toBeNull()
  })

  it('updateForm merges new fields into existing data', () => {
    const get = renderWithProvider()
    act(() => { get().updateForm({ country_code: 'GH' }) })
    act(() => { get().updateForm({ education_level: 'tertiary' }) })
    expect(get().formData).toEqual({ country_code: 'GH', education_level: 'tertiary' })
  })

  it('markStepComplete records steps and isStepUnlocked enforces order', () => {
    const get = renderWithProvider()
    expect(get().isStepUnlocked(1)).toBe(true)
    expect(get().isStepUnlocked(2)).toBe(false)
    act(() => { get().markStepComplete(1) })
    expect(get().isStepUnlocked(2)).toBe(true)
    expect(get().isStepUnlocked(3)).toBe(false)
    act(() => { get().markStepComplete(2) })
    expect(get().isStepUnlocked(3)).toBe(true)
  })

  it('persists state to sessionStorage and reloads it', async () => {
    let get = renderWithProvider()
    act(() => {
      get().updateForm({ country_code: 'KE' })
      get().markStepComplete(1)
      get().markStepComplete(2)
    })
    await waitFor(() => {
      const raw = window.sessionStorage.getItem('unmapped.flow.v1')
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw)
      expect(parsed.formData.country_code).toBe('KE')
      expect(parsed.completedSteps.sort()).toEqual([1, 2])
    })

    // Re-mount: should restore from sessionStorage
    get = renderWithProvider()
    expect(get().formData.country_code).toBe('KE')
    expect(get().isStepUnlocked(3)).toBe(true)
  })

  it('resetFlow clears formData, profile, and completion', () => {
    const get = renderWithProvider()
    act(() => {
      get().updateForm({ country_code: 'GH' })
      get().markStepComplete(1)
    })
    act(() => { get().resetFlow() })
    expect(get().formData).toEqual({})
    expect(Array.from(get().completedSteps)).toEqual([])
    expect(get().profile).toBeNull()
  })

  it('submitProfile dedupes concurrent calls (StrictMode safety)', async () => {
    api.generateProfile.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({ profile_id: 'p1', skills: { isco_codes: [], esco_skill_tags: [], competency_levels: {} } }), 20)
    }))
    const get = renderWithProvider()

    let p1, p2
    act(() => {
      p1 = get().submitProfile()
      p2 = get().submitProfile()
    })
    expect(p1).toBe(p2)
    await waitFor(() => expect(get().profile).toBeTruthy())
    expect(api.generateProfile).toHaveBeenCalledTimes(1)
  })

  it('submitProfile sets profile and marks step 5 complete on success', async () => {
    api.generateProfile.mockResolvedValue({ profile_id: 'p1', skills: { isco_codes: [], esco_skill_tags: [], competency_levels: {} } })
    const get = renderWithProvider()
    await act(async () => { await get().submitProfile() })
    expect(get().profile).toEqual(expect.objectContaining({ profile_id: 'p1' }))
    expect(get().completedSteps.has(5)).toBe(true)
  })

  it('fetchRisk throws NO_PROFILE when no profile exists', async () => {
    const get = renderWithProvider()
    await expect(
      act(async () => { await get().fetchRisk() })
    ).rejects.toMatchObject({ code: 'NO_PROFILE' })
    expect(api.assessRisk).not.toHaveBeenCalled()
  })

  it('fetchOpportunities throws NO_PROFILE when no profile exists', async () => {
    const get = renderWithProvider()
    await expect(
      act(async () => { await get().fetchOpportunities() })
    ).rejects.toMatchObject({ code: 'NO_PROFILE' })
    expect(api.matchOpportunities).not.toHaveBeenCalled()
  })
})
