/**
 * API Client — Full integration with FastAPI backend.
 *
 * The bearer token is owned by AuthContext and persisted in localStorage
 * under TOKEN_STORAGE_KEY. The axios interceptor below reads it on every
 * request, so all functions in this file work for any caller that has a
 * valid token in storage. Callers that need a token MUST log in first
 * (POST /token via `login()`); there is no auto-login.
 *
 * Endpoints wrapped:
 *   POST   /token                              → login (sets token)
 *   GET    /me                                 → current user identity
 *   GET    /users/me                           → identity (legacy alias)
 *   POST   /users                              → admin: create user
 *   POST   /profiles                           → 4-stage hybrid pipeline
 *   GET    /profiles                           → list profiles (admin browse)
 *   GET    /profiles/{id}                      → fetch single profile
 *   DELETE /profiles/{id}                      → admin delete
 *   PATCH  /profiles/{id}/review               → admin review
 *   POST   /profiles/{id}/photos               → upload photo
 *   GET    /profiles/{id}/photos/{filename}    → presigned photo URL
 *   POST   /risk/assess                        → automation risk
 *   POST   /opportunities/match                → opportunity matching
 *   GET    /policy/{code}                      → policy analytics
 *   GET    /ilostat/employment?...             → ILOSTAT employment lookup
 *   GET    /validate/isco?code=...             → ISCO code validation
 *   GET    /health                             → system health check
 *
 * Set VITE_USE_MOCK=true in .env for offline demo mode.
 */

import axios from 'axios'
import {
  mockGenerateProfile,
  mockAssessRisk,
  mockMatchOpportunities,
  mockGetPolicyData,
  mockListProfiles,
  mockFetchProfile,
  mockDeleteProfile,
  mockReviewProfile,
  mockUploadPhoto,
  mockGetPhotoUrl,
  mockCreateUser,
  mockListUsers,
  mockWhoami,
  mockGetEmploymentData,
  mockValidateIsco,
} from './mock'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// ── Token storage (shared with AuthContext) ──────────────────────
// AuthContext owns writes; this module only reads. Single source of truth
// is localStorage so the token survives a page reload.
export const TOKEN_STORAGE_KEY = 'unmapped.token'

function readToken() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

const http = axios.create({ baseURL: API_URL, timeout: 60000 })

http.interceptors.request.use((config) => {
  const token = readToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auth ──────────────────────────────────────────────────────────

/**
 * POST /token. Returns the raw access_token string on success. Callers
 * (AuthContext) are responsible for persisting it to localStorage —
 * this function intentionally has no side effects beyond the network call.
 */
export async function login(username, password) {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)
  const { data } = await axios.post(`${API_URL}/token`, form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data.access_token
}

/** GET /me — current user identity. Used by AuthContext for future-proofing. */
export async function getMe() {
  if (USE_MOCK) return mockWhoami()
  const { data } = await http.get('/me')
  return data
}

/** GET /users/me — legacy identity probe, kept for any in-flight callers. */
export async function whoami() {
  if (USE_MOCK) return mockWhoami()
  const { data } = await http.get('/users/me')
  return data
}

export async function createUser(username, password, isAdmin = false) {
  if (USE_MOCK) return mockCreateUser(username, password, isAdmin)
  const { data } = await http.post('/users', {
    username, password, is_admin: isAdmin,
  })
  return data
}

/** GET /users — admin only. Returns all login accounts. */
export async function listUsers() {
  if (USE_MOCK) return mockListUsers()
  const { data } = await http.get('/users')
  return data
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
      onet_soc: data.matched_onet_tasks?.[0]?.soc_code || 'N/A',
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
  const payload = mapFormToProfileIn(formData)
  const { data } = await http.post('/profiles', payload)
  return mapProfileOutToFrontend(data)
}

// ── Profile list / fetch / delete / review ───────────────────────

export async function listProfiles(filters = {}) {
  if (USE_MOCK) return mockListProfiles(filters)
  const { data } = await http.get('/profiles', { params: filters })
  return data
}

export async function fetchProfile(profileId) {
  if (USE_MOCK) return mockFetchProfile(profileId)
  const { data } = await http.get(`/profiles/${profileId}`)
  return data
}

export async function deleteProfile(profileId) {
  if (USE_MOCK) return mockDeleteProfile(profileId)
  await http.delete(`/profiles/${profileId}`)
  return true
}

export async function reviewProfile(profileId, reviewed, notes = '') {
  if (USE_MOCK) return mockReviewProfile(profileId, reviewed, notes)
  const { data } = await http.patch(`/profiles/${profileId}/review`, {
    reviewed, review_notes: notes,
  })
  return data
}

// ── Photos ───────────────────────────────────────────────────────

export async function uploadPhoto(profileId, file) {
  if (USE_MOCK) return mockUploadPhoto(profileId, file)
  const form = new FormData()
  form.append('file', file)
  const { data } = await http.post(`/profiles/${profileId}/photos`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getPhotoUrl(profileId, filename) {
  if (USE_MOCK) return mockGetPhotoUrl(profileId, filename)
  const { data } = await http.get(`/profiles/${profileId}/photos/${encodeURIComponent(filename)}`)
  return data.url
}

// ── Risk assessment ──────────────────────────────────────────────

export async function assessRisk(profileId) {
  if (USE_MOCK) return mockAssessRisk(profileId)
  const { data } = await http.post('/risk/assess', { profile_id: profileId })
  return data
}

// ── Opportunity matching ─────────────────────────────────────────

export async function matchOpportunities(profileId) {
  if (USE_MOCK) return mockMatchOpportunities(profileId)
  const { data } = await http.post('/opportunities/match', { profile_id: profileId })
  return data
}

// ── Policy dashboard ─────────────────────────────────────────────

export async function getPolicyData(countryCode) {
  if (USE_MOCK) return mockGetPolicyData(countryCode)
  const { data } = await http.get(`/policy/${countryCode}`)
  return data
}

// ── ILOSTAT employment lookup ────────────────────────────────────

export async function getEmploymentData(iscoCode, countryCode) {
  if (USE_MOCK) return mockGetEmploymentData(iscoCode, countryCode)
  const { data } = await http.get('/ilostat/employment', {
    params: { isco_code: iscoCode, country_code: countryCode },
  })
  return data
}

// ── ISCO code validation ─────────────────────────────────────────

export async function validateIscoCode(code) {
  if (USE_MOCK) return mockValidateIsco(code)
  const { data } = await http.get('/validate/isco', { params: { code } })
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
