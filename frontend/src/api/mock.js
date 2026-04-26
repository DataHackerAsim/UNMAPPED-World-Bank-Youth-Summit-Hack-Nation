export const mockGenerateProfile = async (formData) => {
  await new Promise(r => setTimeout(r, 2200)) // simulate API delay
  return {
    profile_id: 'mock-001',
    country_config: formData.country_code,
    _raw: { id: 'mock-001', country_code: formData.country_code, owner_user_id: 1 },
    skills: {
      isco_codes: ['7421'],
      isco_title: 'Electronics equipment assembler and repairer',
      esco_skill_tags: [
        'Electronic device repair', 'Customer diagnostics',
        'Mobile software troubleshooting', 'Entrepreneurship',
        'Multilingual communication', 'Self-directed learning',
      ],
      onet_soc: '49-2022.00',
      summary: 'You have practical electronics repair skills developed through 5 years of running your own phone repair business. You can diagnose hardware faults, communicate with customers in multiple languages, and have taught yourself basic digital skills independently.',
      competency_levels: {
        manual_dexterity: 'advanced',
        digital_literacy: 'intermediate',
        entrepreneurship: 'advanced',
        communication: 'advanced',
      },
    },
  }
}

export const mockAssessRisk = async (profileId) => {
  await new Promise(r => setTimeout(r, 1400))
  return {
    automation_score_global: 0.56,
    automation_score_lmic_calibrated: 0.31,
    calibration_note: 'West Africa calibrated — lower near-term risk due to labour cost structure and infrastructure context.',
    at_risk_tasks: ['Basic hardware assembly', 'Routine screen replacement', 'Simple soldering work'],
    durable_skills: ['Customer fault diagnosis', 'Business management', 'Multilingual service', 'Self-directed learning'],
    adjacent_skills: ['Mobile software support', 'IT helpdesk', 'Digital literacy training'],
    wittgenstein_trend: [
      { year: 2025, pct: 38 }, { year: 2027, pct: 41 }, { year: 2029, pct: 44 },
      { year: 2031, pct: 47 }, { year: 2033, pct: 50 }, { year: 2035, pct: 53 },
    ],
  }
}

export const mockMatchOpportunities = async (profileId) => {
  await new Promise(r => setTimeout(r, 1600))
  return [
    {
      id: 'opp-1',
      title: 'Mobile device repair technician',
      sector: 'ICT Services',
      wage_floor_usd_month: 210,
      sector_growth_pct: 7.2,
      pathway: 'immediate',
      match_reason: 'Your 5 years of hands-on repair experience and existing customer base directly qualify you.',
      source: 'ILOSTAT GH 2023',
    },
    {
      id: 'opp-2',
      title: 'IT equipment support officer',
      sector: 'ICT Services',
      wage_floor_usd_month: 280,
      sector_growth_pct: 9.1,
      pathway: 'with_training',
      match_reason: 'Your hardware skills transfer directly. A 3-month CompTIA A+ course would formalise your knowledge.',
      source: 'ILOSTAT GH 2023',
    },
    {
      id: 'opp-3',
      title: 'Digital literacy trainer',
      sector: 'Education & Training',
      wage_floor_usd_month: 190,
      sector_growth_pct: 5.8,
      pathway: 'immediate',
      match_reason: 'Your self-taught learning and multilingual skills make you well-suited to teach basic digital skills in community settings.',
      source: 'World Bank WDI 2023',
    },
    {
      id: 'opp-4',
      title: 'Electronics retail supervisor',
      sector: 'Trade & Retail',
      wage_floor_usd_month: 175,
      sector_growth_pct: 3.2,
      pathway: 'immediate',
      match_reason: 'Business management experience from running your own shop translates directly to retail supervision.',
      source: 'ILOSTAT GH 2023',
    },
  ]
}

// ── Mock store for the new admin/list/photo flows ─────────────────
// Lives in module scope so list/fetch/delete/upload feel coherent
// in offline demo mode.
const _mockProfiles = [
  {
    id: 1,
    owner_user_id: 1, // admin
    name: 'Demo Worker A',
    age: null,
    location_city: 'Accra',
    country_code: 'GH',
    consent_given: true,
    data_collection_date: '2026-04-01T10:00:00Z',
    needs_review: false,
    review_notes: null,
    skill_description: 'Mobile phone repair, hardware diagnostics, customer service.',
    duration_years: 5,
    frequency: 'daily',
    tools_used: ['ICT & Electronics'],
    task_log: 'Daily phone repair work.',
    income_range: '50_200',
    certifications: ['vocational'],
    languages: [{ name: 'English', spoken: 'fluent', written: 'basic' }],
    profile_completeness_score: 0.85,
    photo_paths: [],
    photo_descriptions: [],
    skill_tags: ['Electronic device repair', 'Customer diagnostics'],
    esco_occupation_uri: 'http://data.europa.eu/esco/occupation/mock-1',
    matched_onet_tasks: [],
    retrieval_confidence: 0.82,
    isco_code: '7421',
    isco_title: 'Electronics equipment assembler and repairer',
    automation_risk_score: 0.31,
    portability_score: 62,
    resilience_skills: ['Customer fault diagnosis', 'Business management'],
    displacement_timeline: 'medium-term impact',
  },
  {
    id: 2,
    owner_user_id: 2, // a non-admin user in the mock store
    name: 'Demo Worker B',
    age: null,
    location_city: 'Lagos',
    country_code: 'NG',
    consent_given: true,
    data_collection_date: '2026-04-05T14:00:00Z',
    needs_review: true,
    review_notes: null,
    skill_description: 'Tailoring and garment finishing.',
    duration_years: 8,
    frequency: 'daily',
    tools_used: ['Garment & Textile'],
    task_log: 'Garment construction.',
    income_range: '50_200',
    certifications: ['secondary'],
    languages: [{ name: 'English', spoken: 'fluent', written: 'basic' }],
    profile_completeness_score: 0.7,
    photo_paths: [],
    photo_descriptions: [],
    skill_tags: ['Sewing', 'Pattern-making'],
    esco_occupation_uri: null,
    matched_onet_tasks: [],
    retrieval_confidence: 0.45,
    isco_code: null,
    isco_title: null,
    automation_risk_score: null,
    portability_score: null,
    resilience_skills: [],
    displacement_timeline: null,
  },
]

// Mock mode reads username/admin status from localStorage (set by AuthContext)
// so the ownership gate behaves like the real backend in offline demo.
function _mockCurrentUser() {
  if (typeof window === 'undefined') return { username: 'admin', isAdmin: true, id: 1 }
  const username = window.localStorage.getItem('unmapped.username') || 'admin'
  const user = _mockUsers.find(u => u.username === username)
  return {
    username,
    isAdmin: user ? user.is_admin : username === 'admin',
    id: user ? user.id : 1,
  }
}

export const mockListProfiles = async () => {
  await new Promise(r => setTimeout(r, 300))
  const me = _mockCurrentUser()
  const visible = me.isAdmin
    ? _mockProfiles
    : _mockProfiles.filter(p => p.owner_user_id === me.id)
  return visible.map(p => ({ ...p }))
}

export const mockFetchProfile = async (id) => {
  await new Promise(r => setTimeout(r, 200))
  const p = _mockProfiles.find(x => String(x.id) === String(id))
  if (!p) throw new Error('Profile not found (mock)')
  const me = _mockCurrentUser()
  if (!me.isAdmin && p.owner_user_id !== me.id) {
    const err = new Error('Forbidden')
    err.response = { data: { detail: 'You do not have access to this profile' } }
    throw err
  }
  return { ...p }
}

export const mockDeleteProfile = async (id) => {
  await new Promise(r => setTimeout(r, 200))
  const i = _mockProfiles.findIndex(x => String(x.id) === String(id))
  if (i >= 0) _mockProfiles.splice(i, 1)
  return true
}

export const mockReviewProfile = async (id, reviewed, notes) => {
  await new Promise(r => setTimeout(r, 200))
  const p = _mockProfiles.find(x => String(x.id) === String(id))
  if (p) {
    p.needs_review = !reviewed
    p.review_notes = notes ?? p.review_notes
  }
  return { id, needs_review: !reviewed, review_notes: notes ?? null }
}

export const mockUploadPhoto = async (profileId, file) => {
  await new Promise(r => setTimeout(r, 600))
  const p = _mockProfiles.find(x => String(x.id) === String(profileId))
  const path = `${profileId}/${Date.now()}-${file.name || 'photo.jpg'}`
  const caption = `Demo caption for ${file.name || 'uploaded photo'}.`
  if (p) {
    p.photo_paths = [...(p.photo_paths || []), path]
    p.photo_descriptions = [...(p.photo_descriptions || []), caption]
    return { ...p }
  }
  // Profile not in mock store — synthesise a minimal ProfileOut
  return {
    id: profileId,
    photo_paths: [path],
    photo_descriptions: [caption],
  }
}

export const mockGetPhotoUrl = async (profileId, filename) => {
  await new Promise(r => setTimeout(r, 100))
  // 1×1 transparent PNG so the <img> renders without a network call
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
}

// Mock user store — seeded with the default admin so the list isn't empty
const _mockUsers = [
  { id: 1, username: 'admin', is_admin: true },
]

export const mockCreateUser = async (username, _password, isAdmin) => {
  await new Promise(r => setTimeout(r, 200))
  if (_mockUsers.some(u => u.username === username)) {
    const err = new Error('Username taken')
    err.response = { data: { detail: 'Username taken' } }
    throw err
  }
  const user = { id: _mockUsers.length + 1, username, is_admin: !!isAdmin }
  _mockUsers.push(user)
  return { username: user.username, is_admin: user.is_admin }
}

export const mockListUsers = async () => {
  await new Promise(r => setTimeout(r, 100))
  return _mockUsers.map(u => ({ ...u }))
}

export const mockWhoami = async () => {
  await new Promise(r => setTimeout(r, 50))
  return { username: 'admin', is_admin: true }
}

export const mockGetEmploymentData = async (iscoCode, countryCode) => {
  await new Promise(r => setTimeout(r, 250))
  return {
    isco_code: iscoCode,
    country_code: countryCode,
    employment_thousands: 412.5,
    isco_2digit: String(iscoCode || '').padStart(4, '0').slice(0, 2),
    country: countryCode,
  }
}

export const mockValidateIsco = async (code) => {
  await new Promise(r => setTimeout(r, 80))
  // Mock: anything that parses as a 4-digit number is "valid"
  const valid = /^\d{4}$/.test(String(code || ''))
  return { code, valid }
}

export const mockGetPolicyData = async (countryCode) => {
  await new Promise(r => setTimeout(r, 800))
  return {
    total_profiles: 1247,
    top_at_risk_occupation: 'General labourers (ISCO 9300)',
    biggest_skills_gap: 'ICT Services',
    avg_automation_risk_pct: 34,
    skills_distribution: [
      { level: 'No formal edu.', count: 312 },
      { level: 'Primary', count: 418 },
      { level: 'Secondary', count: 387 },
      { level: 'Vocational', count: 89 },
      { level: 'Tertiary', count: 41 },
    ],
    sector_gap: [
      { sector: 'ICT Services', demand: 340, supply: 89 },
      { sector: 'Construction', demand: 280, supply: 312 },
      { sector: 'Agriculture', demand: 190, supply: 418 },
      { sector: 'Trade', demand: 220, supply: 287 },
    ],
  }
}