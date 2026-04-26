/**
 * API Client — Full integration with FastAPI backend.
 *
 * All four operations call real backend endpoints:
 *   POST /token            → JWT authentication
 *   POST /profiles         → profile creation (4-stage hybrid pipeline)
 *   POST /risk/assess      → automation risk assessment
 *   POST /opportunities/match → occupation opportunity matching
 *   GET  /policy/{code}    → country-level policy analytics
 *   GET  /health           → system health check
 *
 * Set VITE_USE_MOCK=true in .env for offline demo mode (no backend required).
 */

import axios from 'axios'
import {
  mockGenerateProfile,
  mockAssessRisk,
  mockMatchOpportunities,
  mockGetPolicyData,
} from './mock'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const http = axios.create({ baseURL: API_URL, timeout: 60000 })

let _token = null

http.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`
  return config
})

// ── Auth ──────────────────────────────────────────────────────────

export async function login(username = 'admin', password = 'admin') {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)
  const { data } = await axios.post(`${API_URL}/token`, form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  _token = data.access_token
  return _token
}

export async function ensureAuth() {
  if (!_token) await login()
  return _token
}

// ── Data mapping: frontend form → backend ProfileIn ──────────────

function mapFormToProfileIn(formData) {
  const desc = formData.experience_description || ''
  return {
    name: null,
    age: null,
    location_city: null,
    country_code: formData.country_code || null,
    consent_given: true,
    skill_description: desc.slice(0, 500) || 'Informal worker seeking skills mapping',
    duration_years: formData.years_experience ? parseFloat(formData.years_experience) : 1.0,
    frequency: 'daily',
    tools_used: formData.sector ? [formData.sector] : [],
    task_log: desc || 'Daily informal work activities',
    income_range: null,
    certifications: formData.education_level ? [formData.education_level] : [],
    languages: (formData.languages || []).map(lang => ({
      name: lang, spoken: 'fluent', written: 'basic',
    })),
  }
}

// ── Data mapping: backend ProfileOut → frontend shape ─────────────

function mapProfileOutToFrontend(data) {
  const skillTags = data.skill_tags || []
  const competencyLevels = {}
  skillTags.slice(0, 4).forEach((tag, i) => {
    const key = tag.toLowerCase().replace(/\s+/g, '_').slice(0, 25)
    competencyLevels[key] = i === 0 ? 'advanced' : i < 3 ? 'intermediate' : 'beginner'
  })

  return {
    profile_id: data.id,
    country_config: data.country_code,
    skills: {
      isco_codes: data.isco_code ? [data.isco_code] : ['0000'],
      isco_title: data.isco_title || 'Occupation pending review',
      esco_skill_tags: skillTags.length > 0 ? skillTags : ['Skills analysis pending'],
      onet_soc: data.matched_onet_tasks?.[0]?.task_id?.slice(0, 10) || 'N/A',
      summary: data.skill_description
        ? `Based on your experience: ${data.skill_description.slice(0, 200)}. ` +
          `Automation risk: ${data.automation_risk_score !== null ? (data.automation_risk_score * 100).toFixed(0) + '%' : 'pending'}. ` +
          `Portability score: ${data.portability_score ?? 'pending'}/100.`
        : 'Profile generated — skills analysis complete.',
      competency_levels: Object.keys(competencyLevels).length > 0
        ? competencyLevels
        : { general_skills: 'intermediate' },
    },
    _raw: data,
  }
}

// ── Profile generation ───────────────────────────────────────────

export async function generateProfile(formData) {
  if (USE_MOCK) return mockGenerateProfile(formData)

  await ensureAuth()
  const payload = mapFormToProfileIn(formData)
  const { data } = await http.post('/profiles', payload)
  return mapProfileOutToFrontend(data)
}

// ── Risk assessment ──────────────────────────────────────────────

export async function assessRisk(profileId) {
  if (USE_MOCK) return mockAssessRisk(profileId)

  await ensureAuth()
  const { data } = await http.post('/risk/assess', { profile_id: profileId })
  return data
}

// ── Opportunity matching ─────────────────────────────────────────

export async function matchOpportunities(profileId) {
  if (USE_MOCK) return mockMatchOpportunities(profileId)

  await ensureAuth()
  const { data } = await http.post('/opportunities/match', { profile_id: profileId })
  return data
}

// ── Policy dashboard ─────────────────────────────────────────────

export async function getPolicyData(countryCode) {
  if (USE_MOCK) return mockGetPolicyData(countryCode)

  await ensureAuth()
  const { data } = await http.get(`/policy/${countryCode}`)
  return data
}

// ── Health check ─────────────────────────────────────────────────

export async function checkHealth() {
  try {
    const { data } = await axios.get(`${API_URL}/health`, { timeout: 5000 })
    return data
  } catch {
    return { status: 'unreachable', details: {} }
  }
}
