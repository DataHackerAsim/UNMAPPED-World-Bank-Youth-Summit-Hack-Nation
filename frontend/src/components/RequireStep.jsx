import { Navigate } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'
import { useAuth } from '../context/AuthContext'

/**
 * Route guard: ensures the user has completed all preceding onboarding steps
 * before accessing `step`. Redirects to the first incomplete step otherwise.
 *
 * Usage:
 *   <Route path="/step3" element={<RequireStep step={3}><Step3 /></RequireStep>} />
 */
export default function RequireStep({ step, children }) {
  const { completedSteps } = useFlow()
  for (let s = 1; s < step; s++) {
    if (!completedSteps.has(s)) {
      // Step 1 lives at "/", every other step lives at "/stepN".
      const target = s === 1 ? '/' : `/step${s}`
      return <Navigate to={target} replace />
    }
  }
  return children
}

/**
 * Route guard: ensures a generated profile exists before accessing modules
 * (Risk View, Opportunities). Redirects to step 1 ("/") otherwise.
 */
export function RequireProfile({ children }) {
  const { profile } = useFlow()
  if (!profile) return <Navigate to="/" replace />
  return children
}

/**
 * Route guard: requires the current user to be an admin (per AuthContext,
 * which uses the `username === 'admin'` rule). Non-admins are bounced to
 * the home page — admin links are also hidden from the sidebar so the
 * URL is the only way they'd land here.
 */
export function RequireAdmin({ children }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
