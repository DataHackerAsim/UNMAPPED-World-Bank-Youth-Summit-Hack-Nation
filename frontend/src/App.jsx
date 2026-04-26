import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CountryProvider, useCountry } from './context/CountryContext'
import { useProfile } from './hooks/useProfile'
import './i18n'

import Step1Country from './pages/Step1Country'
import Step2Education from './pages/Step2Education'
import Step3Languages from './pages/Step3Languages'
import Step4Experience from './pages/Step4Experience'
import Step5Generating from './pages/Step5Generating'
import RiskView from './pages/RiskView'
import OpportunitiesView from './pages/OpportunitiesView'
import PolicyDashboard from './pages/PolicyDashboard'

// ── Icons ─────────────
const IconMap = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="8" /><path d="M2 10h16M10 2a12 12 0 0 1 0 16M10 2a12 12 0 0 0 0 16" /></svg>
const IconBook = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 3h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M7 7h6M7 10h6M7 13h4" /></svg>
const IconLanguage = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 5h8M7 3v2M6 5c0 3 2 5 4 6M9 11c-2 1-4 2-6 2" /><path d="M12 10l2-5 2 5M13 8.5h2" /><path d="M10 17h7" /></svg>
const IconBriefcase = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="7" width="16" height="11" rx="2" /><path d="M7 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M2 12h16" /></svg>
const IconUser = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="7" r="3" /><path d="M3 18c0-4 3-6 7-6s7 2 7 6" /></svg>
const IconShield = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 2l7 3v5c0 4-3 7-7 8C7 17 4 14 4 10V5l6-3z" /><path d="M7 10l2 2 4-4" /></svg>
const IconStar = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.3L10 14.5l-4.9 2.5.9-5.3-4-3.9 5.6-.8L10 2z" /></svg>
const IconChart = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 15l4-6 3 4 3-7 4 4" /><path d="M3 18h14" /></svg>
const IconSearch = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="9" cy="9" r="5"/><path d="M16 16l-3.5-3.5"/></svg>
const IconBell = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 2a4 4 0 0 0-4 4v5l-2 2v1h12v-1l-2-2V6a4 4 0 0 0-4-4z"/><path d="M8 15a2 2 0 0 0 4 0"/></svg>

// ── Config ────────────────────────────────────
const STEPS = [
  { path: '/step1', label: 'Context',    Icon: IconMap,       step: 1 },
  { path: '/step2', label: 'Education',  Icon: IconBook,      step: 2 },
  { path: '/step3', label: 'Languages',  Icon: IconLanguage,  step: 3 },
  { path: '/step4', label: 'Experience', Icon: IconBriefcase, step: 4 },
  { path: '/step5', label: 'Profile',    Icon: IconUser,      step: 5 },
]

const MODULES = [
  { path: '/risk',          label: 'Risk View',    Icon: IconShield },
  { path: '/opportunities', label: 'Opportunities', Icon: IconStar  },
  { path: '/policy',        label: 'Policy Dashboard', Icon: IconChart },
]

function getCurrentStep(pathname) {
  const match = pathname.match(/\/step(\d)/)
  return match ? parseInt(match[1]) : 0
}

function getPageTitle(pathname) {
  const all = [...STEPS.map(s => ({ path: s.path, title: s.label })), ...MODULES.map(m => ({ path: m.path, title: m.label }))]
  return all.find(p => pathname.startsWith(p.path))?.title ?? 'Dashboard'
}

// ── Sidebar ─────────────────────────────────────────────
function Sidebar() {
  const location = useLocation()
  const currentStep = getCurrentStep(location.pathname)

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-name">UNMAPPED</div>
        <div className="sidebar-brand-tagline">Skill to Opportunity mapping</div>
      </div>

      <div className="sidebar-account">
        <div className="sidebar-account-avatar">U</div>
        <div>
          <div className="sidebar-account-name">User Profile</div>
          <div className="sidebar-account-role">Standard License</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Onboarding</div>
        {STEPS.map(({ path, label, Icon, step }) => {
          const active = location.pathname === path
          const done = currentStep > step
          return (
            <a key={path} href={path} className={`sidebar-nav-item ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
              <span className={`sidebar-step-badge ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                {done ? '✓' : step}
              </span>
              <span className={`sidebar-nav-icon ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                <Icon />
              </span>
              <span>{label}</span>
            </a>
          )
        })}

        <div className="sidebar-section-label mt-4">Modules</div>
        {MODULES.map(({ path, label, Icon }) => {
          const active = location.pathname.startsWith(path)
          return (
            <a key={path} href={path} className={`sidebar-nav-item ${active ? 'active' : ''}`}>
              <span className="sidebar-nav-icon"><Icon /></span>
              <span>{label}</span>
            </a>
          )
        })}
      </nav>
    </aside>
  )
}

// ── Top bar ─────────────────────────────────────────────
// Removed: CTX country dropdown (redundant — Step1 handles context selection)
// Updated: brighter, more readable placeholder text in search bar
function Topbar() {
  const location = useLocation()
  const title = getPageTitle(location.pathname)

  return (
    <header className="topbar">
      {/* Left: Page title */}
      <div className="flex items-center gap-3 w-1/4">
        <h1 className="text-[15px] font-semibold text-white tracking-wide">{title}</h1>
      </div>

      {/* Center: Search bar — brighter placeholder for WCAG readability */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center bg-[#1e293b] rounded-md px-3 py-1.5 w-full max-w-md border border-[#334155] focus-within:border-[#1aA882] transition-colors">
          <div className="w-4 h-4 text-[#94a3b8] mr-2"><IconSearch /></div>
          <input 
            type="text" 
            placeholder="Search skills, policies, or opportunities..." 
            className="bg-transparent border-none text-[13px] text-white focus:outline-none w-full placeholder-[#94a3b8]"
          />
        </div>
      </div>

      {/* Right: Bell only — no CTX dropdown */}
      <div className="flex items-center justify-end w-1/4">
        <button className="text-[#94a3b8] hover:text-white transition-colors w-5 h-5">
          <IconBell />
        </button>
      </div>
    </header>
  )
}

// ── Routes & Root ───────────────────────────────────────
function AppRoutes() {
  const profileState = useProfile()
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/step1" replace />} />
      <Route path="/step1" element={<Step1Country updateForm={profileState.updateForm} />} />
      <Route path="/step2" element={<Step2Education updateForm={profileState.updateForm} formData={profileState.formData} />} />
      <Route path="/step3" element={<Step3Languages updateForm={profileState.updateForm} formData={profileState.formData} />} />
      <Route path="/step4" element={<Step4Experience updateForm={profileState.updateForm} formData={profileState.formData} />} />
      <Route path="/step5" element={<Step5Generating submitProfile={profileState.submitProfile} profile={profileState.profile} loading={profileState.loading} error={profileState.error} />} />
      <Route path="/risk" element={<RiskView fetchRisk={profileState.fetchRisk} risk={profileState.risk} loading={profileState.loading} error={profileState.error} />} />
      <Route path="/opportunities" element={<OpportunitiesView fetchOpportunities={profileState.fetchOpportunities} opportunities={profileState.opportunities} loading={profileState.loading} />} />
      <Route path="/policy" element={<PolicyDashboard />} />
    </Routes>
  )
}

function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <AppRoutes />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <CountryProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </CountryProvider>
  )
}
