import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import { CountryProvider } from './context/CountryContext'
import { FlowProvider, useFlow } from './context/FlowContext'
import { useAuth } from './context/AuthContext'
import RequireStep, { RequireProfile, RequireAdmin } from './components/RequireStep'
import './i18n'

import Step1Country from './pages/Step1Country'
import Step2Education from './pages/Step2Education'
import Step3Languages from './pages/Step3Languages'
import Step4Experience from './pages/Step4Experience'
import Step5Generating from './pages/Step5Generating'
import RiskView from './pages/RiskView'
import OpportunitiesView from './pages/OpportunitiesView'
import PolicyDashboard from './pages/PolicyDashboard'
import ProfilesListPage from './pages/ProfilesListPage'
import ProfileDetailPage from './pages/ProfileDetailPage'
import AdminPanel from './pages/AdminPanel'
import LoginPage from './pages/LoginPage'

// ── Icons ─────────────
const IconMap = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="8" /><path d="M2 10h16M10 2a12 12 0 0 1 0 16M10 2a12 12 0 0 0 0 16" /></svg>
const IconBook = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 3h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M7 7h6M7 10h6M7 13h4" /></svg>
const IconLanguage = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 5h8M7 3v2M6 5c0 3 2 5 4 6M9 11c-2 1-4 2-6 2" /><path d="M12 10l2-5 2 5M13 8.5h2" /><path d="M10 17h7" /></svg>
const IconBriefcase = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="7" width="16" height="11" rx="2" /><path d="M7 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M2 12h16" /></svg>
const IconUser = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="7" r="3" /><path d="M3 18c0-4 3-6 7-6s7 2 7 6" /></svg>
const IconShield = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 2l7 3v5c0 4-3 7-7 8C7 17 4 14 4 10V5l6-3z" /><path d="M7 10l2 2 4-4" /></svg>
const IconStar = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.3L10 14.5l-4.9 2.5.9-5.3-4-3.9 5.6-.8L10 2z" /></svg>
const IconChart = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 15l4-6 3 4 3-7 4 4" /><path d="M3 18h14" /></svg>
const IconLock = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="9" width="12" height="8" rx="2" /><path d="M7 9V6a3 3 0 0 1 6 0v3" /></svg>
const IconList = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 5h11M6 10h11M6 15h11M3 5h.01M3 10h.01M3 15h.01" /></svg>
const IconKey = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="13" r="3" /><path d="M9.5 11l8-8M14 7l3 3" /></svg>
const IconLogout = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 4h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4" /><path d="M9 14l-4-4 4-4M5 10h10" /></svg>

// ── Config ────────────────────────────────────
const STEPS = [
  { path: '/',      label: 'Context',    Icon: IconMap,       step: 1 },
  { path: '/step2', label: 'Education',  Icon: IconBook,      step: 2 },
  { path: '/step3', label: 'Languages',  Icon: IconLanguage,  step: 3 },
  { path: '/step4', label: 'Experience', Icon: IconBriefcase, step: 4 },
  { path: '/step5', label: 'Profile',    Icon: IconUser,      step: 5 },
]

// Modules visible to every signed-in user. Profiles is exposed here because
// the backend now scopes the listing by owner — non-admins see their own
// profiles only; admins see everything.
const USER_MODULES = [
  { path: '/risk',          label: 'Risk View',     Icon: IconShield, requiresProfile: true },
  { path: '/opportunities', label: 'Opportunities', Icon: IconStar,   requiresProfile: true },
  { path: '/profiles',      label: 'My Profiles',   Icon: IconList },
]

// Admin-only tools
const ADMIN_MODULES = [
  { path: '/policy', label: 'Policy Dashboard', Icon: IconChart },
  { path: '/admin',  label: 'Admin Panel',      Icon: IconKey  },
]

function getPageTitle(pathname) {
  const exact = {
    '/':      'Context',
    '/login': 'Sign In',
  }
  if (exact[pathname]) return exact[pathname]
  const all = [
    ...STEPS.map(s => ({ path: s.path, title: s.label })),
    ...USER_MODULES.map(m => ({ path: m.path, title: m.label })),
    ...ADMIN_MODULES.map(m => ({ path: m.path, title: m.label })),
  ]
  const hit = all.find(p => p.path !== '/' && (pathname === p.path || pathname.startsWith(p.path + '/')))
  return hit?.title ?? 'Dashboard'
}

// ── Route guards ─────────────────────────────────────────
/**
 * Hard guard: blocks any route until a token exists in AuthContext.
 * Wrapping every non-/login route is the only enforced redirect — admin
 * surfaces use the soft RequireAdmin redirect on top of this.
 */
function ProtectedRoute({ children }) {
  const { token } = useAuth()
  const location = useLocation()
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}

// ── Sidebar ─────────────────────────────────────────────
function Sidebar() {
  const { completedSteps, profile } = useFlow()
  const { isAdmin, username, logout } = useAuth()

  const isStepUnlocked = (step) => {
    for (let s = 1; s < step; s++) {
      if (!completedSteps.has(s)) return false
    }
    return true
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-name">UNMAPPED</div>
        <div className="sidebar-brand-tagline">Skill to Opportunity mapping</div>
      </div>

      <div className="sidebar-account">
        <div className="sidebar-account-avatar">
          {(username || 'U')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="sidebar-account-name truncate">{username || 'Signed out'}</div>
          <div className="sidebar-account-role">
            {isAdmin ? 'Admin License' : 'Standard License'}
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <span className="block w-4 h-4"><IconLogout /></span>
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        <div className="sidebar-section-label">Onboarding</div>
        {STEPS.map(({ path, label, Icon, step }) => {
          const done     = completedSteps.has(step)
          const unlocked = isStepUnlocked(step)
          const locked   = !unlocked

          if (locked) {
            return (
              <div
                key={path}
                className="sidebar-nav-item locked"
                aria-disabled="true"
                title="Complete the previous steps to unlock"
              >
                <span className="sidebar-step-badge"><IconLock /></span>
                <span className="sidebar-nav-icon"><Icon /></span>
                <span>{label}</span>
              </div>
            )
          }

          return (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''} ${done ? 'done' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`sidebar-step-badge ${isActive ? 'active' : ''} ${done ? 'done' : ''}`}>
                    {done ? '✓' : step}
                  </span>
                  <span className={`sidebar-nav-icon ${isActive ? 'active' : ''} ${done ? 'done' : ''}`}>
                    <Icon />
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          )
        })}

        <div className="sidebar-section-label mt-4">Modules</div>
        {USER_MODULES.map(({ path, label, Icon, requiresProfile }) => {
          const locked = requiresProfile && !profile
          if (locked) {
            return (
              <div
                key={path}
                className="sidebar-nav-item locked"
                aria-disabled="true"
                title="Generate your profile to unlock"
              >
                <span className="sidebar-nav-icon"><IconLock /></span>
                <span>{label}</span>
              </div>
            )
          }
          return (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-nav-icon"><Icon /></span>
              <span>{label}</span>
            </NavLink>
          )
        })}

        {isAdmin && (
          <>
            <div className="sidebar-section-label mt-4">Admin</div>
            {ADMIN_MODULES.map(({ path, label, Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-nav-icon"><Icon /></span>
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}

// ── Top bar ─────────────────────────────────────────────
function Topbar() {
  const location = useLocation()
  const title = getPageTitle(location.pathname)

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <h1 className="text-[15px] font-semibold text-white tracking-wide">{title}</h1>
      </div>
    </header>
  )
}

// ── Routes ──────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public route — login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes — everything below requires a token */}
      <Route path="/" element={<ProtectedRoute><Step1Country /></ProtectedRoute>} />
      <Route path="/step2" element={<ProtectedRoute><RequireStep step={2}><Step2Education /></RequireStep></ProtectedRoute>} />
      <Route path="/step3" element={<ProtectedRoute><RequireStep step={3}><Step3Languages /></RequireStep></ProtectedRoute>} />
      <Route path="/step4" element={<ProtectedRoute><RequireStep step={4}><Step4Experience /></RequireStep></ProtectedRoute>} />
      <Route path="/step5" element={<ProtectedRoute><RequireStep step={5}><Step5Generating /></RequireStep></ProtectedRoute>} />
      <Route path="/risk" element={<ProtectedRoute><RequireProfile><RiskView /></RequireProfile></ProtectedRoute>} />
      <Route path="/opportunities" element={<ProtectedRoute><RequireProfile><OpportunitiesView /></RequireProfile></ProtectedRoute>} />

      {/* Owner-or-admin protected routes — backend filters by ownership */}
      <Route path="/profiles" element={<ProtectedRoute><ProfilesListPage /></ProtectedRoute>} />
      <Route path="/profiles/:id" element={<ProtectedRoute><ProfileDetailPage /></ProtectedRoute>} />

      {/* Admin-only protected routes */}
      <Route path="/policy" element={<ProtectedRoute><RequireAdmin><PolicyDashboard /></RequireAdmin></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><RequireAdmin><AdminPanel /></RequireAdmin></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ── Layout shell ────────────────────────────────────────
// Hide the sidebar/topbar chrome on the login route — the LoginPage owns
// its full-viewport background. On every other route the chrome shows.
function Layout() {
  const location = useLocation()
  const onLogin = location.pathname === '/login'
  if (onLogin) return <AppRoutes />

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
      <FlowProvider>
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </FlowProvider>
    </CountryProvider>
  )
}
