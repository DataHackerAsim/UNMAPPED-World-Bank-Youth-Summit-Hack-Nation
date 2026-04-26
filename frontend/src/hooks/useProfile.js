import { useState, useEffect } from 'react'
import {
  generateProfile,
  assessRisk,
  matchOpportunities,
  ensureAuth,
  checkHealth,
} from '../api/client'

export function useProfile() {
  const [formData, setFormData]           = useState({})
  const [profile, setProfile]             = useState(null)
  const [risk, setRisk]                   = useState(null)
  const [opportunities, setOpportunities] = useState(null)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)
  const [backendReady, setBackendReady]   = useState(null) // null=checking, true/false

  // Auto-authenticate on mount + check backend health
  useEffect(() => {
    ;(async () => {
      try {
        await ensureAuth()
        const health = await checkHealth()
        setBackendReady(health.status === 'ok' || health.status === 'degraded')
      } catch {
        // Backend unreachable — will fall back to mock mode
        setBackendReady(false)
      }
    })()
  }, [])

  const updateForm = (fields) => setFormData(prev => ({ ...prev, ...fields }))

  const submitProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await generateProfile(formData)
      setProfile(result)
      return result
    } catch (e) {
      const detail = e?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail
        : typeof detail === 'object' ? detail.message || JSON.stringify(detail)
        : 'Profile generation failed. Please try again.'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }

  const fetchRisk = async () => {
    if (!profile) return
    setLoading(true)
    setError(null)
    try {
      const result = await assessRisk(profile.profile_id)
      setRisk(result)
      return result
    } catch (e) {
      setError('Risk assessment failed.')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const fetchOpportunities = async () => {
    if (!profile) return
    setLoading(true)
    setError(null)
    try {
      const result = await matchOpportunities(profile.profile_id)
      setOpportunities(result)
      return result
    } catch (e) {
      setError('Opportunity matching failed.')
      throw e
    } finally {
      setLoading(false)
    }
  }

  return {
    formData, updateForm,
    profile, submitProfile,
    risk, fetchRisk,
    opportunities, fetchOpportunities,
    loading, error,
    backendReady,
  }
}
