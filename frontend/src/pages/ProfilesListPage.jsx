import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../components/ui/Shell'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import { listProfiles, deleteProfile } from '../api/client'
import { useAuth } from '../context/AuthContext'

function riskColor(score) {
  if (score == null) return 'text-text-secondary'
  if (score < 0.4) return 'text-green'
  if (score < 0.65) return 'text-amber'
  return 'text-red'
}

export default function ProfilesListPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let cancelled = false
    listProfiles()
      .then(data => { if (!cancelled) setRows(data) })
      .catch(() => { if (!cancelled) setError('Could not load profiles.') })
    return () => { cancelled = true }
  }, [])

  const handleDelete = async (id) => {
    // window.confirm is intentionally simple — matches the spec's
    // "confirmation prompt before calling DELETE".
    if (!window.confirm(`Delete profile #${id}? This cannot be undone.`)) return
    setBusyId(id)
    try {
      await deleteProfile(id)
      setRows(prev => (prev || []).filter(p => p.id !== id))
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Delete failed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Shell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-border flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green" />
              <span className="font-mono text-[10px] tracking-widest text-green">PROFILES · BROWSE</span>
            </div>
            <h1 className="text-2xl font-semibold text-text-primary mb-1">
              {isAdmin ? 'All profiles' : 'My profiles'}
            </h1>
            <p className="text-sm text-text-secondary">
              {isAdmin
                ? 'Every worker skill record across all signed-in users.'
                : 'Worker skill records you submitted via the 5-step onboarding wizard.'
              }
              {isAdmin && (
                <> Login accounts are managed separately in the <a href="/admin" className="text-green underline">Admin Panel</a>.</>
              )}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="px-3 py-2 border border-border bg-surface font-mono text-[10px] text-text-secondary tracking-widest rounded hover:border-amber/40 hover:text-amber transition-colors"
            >
              ADMIN PANEL →
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 border border-red/40 bg-red-faint rounded font-mono text-xs text-red">
            {error}
          </div>
        )}

        {rows === null && <LoadingSkeleton lines={6} />}

        {rows && rows.length === 0 && (
          <div className="text-center py-12">
            <p className="font-mono text-sm text-text-secondary mb-4">No profiles yet.</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-green hover:bg-green-dim text-black font-display font-bold rounded-lg text-sm"
            >
              CREATE FIRST PROFILE →
            </button>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-raised">
                <tr className="text-left">
                  <th className="px-4 py-3 font-mono text-[10px] tracking-widest text-text-secondary">ID</th>
                  <th className="px-4 py-3 font-mono text-[10px] tracking-widest text-text-secondary">Name</th>
                  <th className="px-4 py-3 font-mono text-[10px] tracking-widest text-text-secondary">Country</th>
                  <th className="px-4 py-3 font-mono text-[10px] tracking-widest text-text-secondary">ISCO Title</th>
                  <th className="px-4 py-3 font-mono text-[10px] tracking-widest text-text-secondary text-right">Risk</th>
                  <th className="px-4 py-3 font-mono text-[10px] tracking-widest text-text-secondary">Review</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {rows.map(p => {
                  const pct = p.automation_risk_score == null ? '—' : `${Math.round(p.automation_risk_score * 100)}%`
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-raised cursor-pointer"
                      onClick={() => navigate(`/profiles/${p.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">#{p.id}</td>
                      <td className="px-4 py-3 text-text-primary max-w-48 truncate" title={p.name || ''}>
                        {p.name || <span className="text-text-muted italic">unnamed</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{p.country_code || '—'}</td>
                      <td className="px-4 py-3 text-text-primary truncate max-w-[18rem]" title={p.isco_title || ''}>
                        {p.isco_title || <span className="text-text-muted italic">pending review</span>}
                      </td>
                      <td className={`px-4 py-3 font-mono text-xs text-right ${riskColor(p.automation_risk_score)}`}>
                        {pct}
                      </td>
                      <td className="px-4 py-3">
                        {p.needs_review ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-dim bg-amber-faint font-mono text-[9px] text-amber tracking-widest">
                            ⚠ Needs review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-green/40 bg-green-faint font-mono text-[9px] text-green tracking-widest">
                            ✓ Reviewed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                            disabled={busyId === p.id}
                            className="px-3 py-1 border border-red/40 text-red font-mono text-[10px] tracking-widest rounded hover:bg-red-faint disabled:opacity-50"
                          >
                            {busyId === p.id ? '…' : 'DELETE'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  )
}
