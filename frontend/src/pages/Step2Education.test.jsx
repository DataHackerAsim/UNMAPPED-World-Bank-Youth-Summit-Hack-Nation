import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../api/client', () => ({
  TOKEN_STORAGE_KEY: 'unmapped.token',
  checkHealth: vi.fn(() => Promise.resolve({ status: 'ok' })),
  generateProfile: vi.fn(),
  assessRisk: vi.fn(),
  matchOpportunities: vi.fn(),
  getPolicyData: vi.fn(),
}))

import Step2Education from './Step2Education'
import { CountryProvider } from '../context/CountryContext'
import { FlowProvider } from '../context/FlowContext'
import { AuthProvider } from '../context/AuthContext'

beforeEach(() => {
  window.sessionStorage.clear()
  // Pre-mark step 1 complete and choose Ghana so Step2 can render with sectors
  window.sessionStorage.setItem(
    'unmapped.flow.v1',
    JSON.stringify({
      formData: { country_code: 'GH' },
      completedSteps: [1],
      profile: null,
      risk: null,
      opportunities: null,
    })
  )
})

function renderStep2() {
  return render(
    <AuthProvider>
      <CountryProvider>
        <FlowProvider>
          <MemoryRouter initialEntries={['/step2']}>
            <Routes>
              <Route path="/step2" element={<Step2Education />} />
              <Route path="/step3" element={<div>STEP 3 REACHED</div>} />
              <Route path="/" element={<div>STEP 1</div>} />
            </Routes>
          </MemoryRouter>
        </FlowProvider>
      </CountryProvider>
    </AuthProvider>
  )
}

describe('Step2Education form', () => {
  it('disables Continue until an option is selected', async () => {
    renderStep2()
    const continueBtn = await screen.findByRole('button', { name: /Continue/ })
    expect(continueBtn).toBeDisabled()
  })

  it('enables Continue once a level is selected and advances on click', async () => {
    const user = userEvent.setup()
    renderStep2()
    // Ghana educationLevels include Primary (BECE), Secondary (WASSCE), Vocational, Tertiary
    const option = await screen.findByRole('button', { name: /Secondary/i })
    await user.click(option)
    const continueBtn = screen.getByRole('button', { name: /Continue/ })
    expect(continueBtn).not.toBeDisabled()
    await user.click(continueBtn)
    expect(await screen.findByText('STEP 3 REACHED')).toBeInTheDocument()
  })
})
