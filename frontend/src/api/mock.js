export const mockGenerateProfile = async (formData) => {
  await new Promise(r => setTimeout(r, 2200)) // simulate API delay
  return {
    profile_id: 'mock-001',
    country_config: formData.country_code,
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