import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  generateProfile,
  assessRisk,
  matchOpportunities,
  checkHealth,
} from '../api/client'

const FlowContext = createContext(null)

const STORAGE_KEY = 'unmapped.flow.v1'

// Steps must be completed in order. Modules require step 5 (profile) to be done.
export const TOTAL_STEPS = 5

function loadPersisted() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return {
      formData:       parsed.formData       ?? {},
      completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [],
      profile:        parsed.profile        ?? null,
      risk:           parsed.risk           ?? null,
      opportunities:  parsed.opportunities  ?? null,
    }
  } catch {
    return null
  }
}

function savePersisted(state) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota / privacy mode — non-fatal, in-memory state still works
  }
}

export function FlowProvider({ children }) {
  const initial = loadPersisted() ?? {}

  const [formData,       setFormData]       = useState(initial.formData       ?? {})
  const [completedSteps, setCompletedSteps] = useState(new Set(initial.completedSteps ?? []))
  const [profile,        setProfile]        = useState(initial.profile        ?? null)
  const [risk,           setRisk]           = useState(initial.risk           ?? null)
  const [opportunities,  setOpportunities]  = useState(initial.opportunities  ?? null)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)
  const [backendReady,   setBackendReady]   = useState(null)

  // Health probe on mount — auth is now owned by AuthContext, so this
  // file no longer auto-logs-in or fetches identity. The health endpoint
  // is unauthenticated and safe to call before login.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const health = await checkHealth()
        if (!cancelled) setBackendReady(health.status === 'ok' || health.status === 'degraded')
      } catch {
        if (!cancelled) setBackendReady(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Persist on every state change
  useEffect(() => {
    savePersisted({
      formData,
      completedSteps: Array.from(completedSteps),
      profile,
      risk,
      opportunities,
    })
  }, [formData, completedSteps, profile, risk, opportunities])

  const updateForm = (fields) => setFormData(prev => ({ ...prev, ...fields }))

  const markStepComplete = (step) => {
    setCompletedSteps(prev => {
      if (prev.has(step)) return prev
      const next = new Set(prev)
      next.add(step)
      return next
    })
  }

  const isStepUnlocked = (step) => {
    for (let s = 1; s < step; s++) {
      if (!completedSteps.has(s)) return false
    }
    return true
  }

  // Dedupe in-flight submissions across StrictMode double-mount.
  // NOTE: submitProfile is intentionally NOT marked `async` — an async function
  // wraps its return value in a fresh Promise, which would break the
  // identity-based dedup (concurrent callers would each receive a unique wrapper).
  const inflightSubmit = useRef(null)

  const submitProfile = () => {
    if (inflightSubmit.current) return inflightSubmit.current
    setLoading(true)
    setError(null)
    const promise = (async () => {
      try {
        const result = await generateProfile(formData)
        setProfile(result)
        markStepComplete(5)
        return result
      } catch (e) {
        const detail = e?.response?.data?.detail
        const msg = typeof detail === 'string' ? detail
          : typeof detail === 'object' && detail !== null
            ? detail.message || JSON.stringify(detail)
            : 'Profile generation failed. Please try again.'
        setError(msg)
        throw e
      } finally {
        setLoading(false)
        inflightSubmit.current = null
      }
    })()
    inflightSubmit.current = promise
    return promise
  }

  const fetchRisk = async () => {
    if (!profile) {
      const msg = 'No profile found. Please complete the onboarding steps first.'
      setError(msg)
      const err = new Error(msg)
      err.code = 'NO_PROFILE'
      return Promise.reject(err)
    }
    setLoading(true)
    setError(null)
    try {
      const result = await assessRisk(profile.profile_id)
      setRisk(result)
      return result
    } catch (e) {
      if (e.code !== 'NO_PROFILE') setError('Risk assessment failed.')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const fetchOpportunities = async () => {
    if (!profile) {
      const msg = 'No profile found. Please complete the onboarding steps first.'
      setError(msg)
      const err = new Error(msg)
      err.code = 'NO_PROFILE'
      return Promise.reject(err)
    }
    setLoading(true)
    setError(null)
    try {
      const result = await matchOpportunities(profile.profile_id)
      setOpportunities(result)
      return result
    } catch (e) {
      if (e.code !== 'NO_PROFILE') setError('Opportunity matching failed.')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const resetFlow = () => {
    setFormData({})
    setCompletedSteps(new Set())
    setProfile(null)
    setRisk(null)
    setOpportunities(null)
    setError(null)
    inflightSubmit.current = null
  }

  const setProfileFromBackend = (raw) => {
    if (!raw) return
    setProfile(prev => prev
      ? { ...prev, _raw: raw }
      : { profile_id: raw.id, country_config: raw.country_code, skills: prev?.skills, _raw: raw }
    )
  }

  const value = useMemo(() => ({
    formData, updateForm,
    completedSteps, markStepComplete, isStepUnlocked,
    profile, submitProfile, setProfileFromBackend,
    risk, fetchRisk,
    opportunities, fetchOpportunities,
    loading, error, setError,
    backendReady,
    resetFlow,
  }), [formData, completedSteps, profile, risk, opportunities, loading, error, backendReady])

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
}

export function useFlow() {
  const ctx = useContext(FlowContext)
  if (!ctx) throw new Error('useFlow must be used inside FlowProvider')
  return ctx
}
