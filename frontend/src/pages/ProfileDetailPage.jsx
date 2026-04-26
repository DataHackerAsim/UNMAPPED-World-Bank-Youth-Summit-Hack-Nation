import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Shell from '../components/ui/Shell'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import SkillTag from '../components/ui/SkillTag'
import PhotoUpload from '../components/ui/PhotoUpload'
import { fetchProfile, deleteProfile, reviewProfile } from '../api/client'
import { useAuth } from '../context/AuthContext'

function Field({ label, children }) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-widest text-text-secondary uppercase mb-1">{label}</p>
      <p className="text-sm text-text-primary">{children ?? <span className="text-text-muted italic">—</span>}</p>
    </div>
  )
}

export default function ProfileDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const [profile, setProfile] = useState(null)
  const [error, setError]     = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewedFlag, setReviewedFlag] = useState(true) // tick = "mark as reviewed"
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewMsg, setReviewMsg] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchProfile(id)
      .then(p => {
        if (cancelled) return
        setProfile(p)
        setReviewNotes(p.review_notes || '')
        // Default the toggle to "mark reviewed" iff currently unreviewed
        setReviewedFlag(!p.needs_review || true)
      })
      .catch(err => {
        if (cancelled) return
        const detail = err?.response?.data?.detail
        setError(typeof detail === 'string' ? detail : 'Could not load profile.')
      })
    return () => { cancelled = true }
  }, [id])

  const handleSubmitReview = async () => {
    if (!isAdmin) return
    setSubmittingReview(true)
    setReviewMsg(null)
    try {
      const result = await reviewProfile(profile.id, reviewedFlag, reviewNotes.trim())
      setProfile(prev => ({
        ...prev,
        needs_review: result.needs_review,
        review_notes: result.review_notes ?? reviewNotes.trim(),
      }))
      setReviewMsg({ ok: true, text: reviewedFlag ? 'Marked as reviewed.' : 'Re-flagged for review.' })
    } catch (err) {
      const detail = err?.response?.data?.detail
      setReviewMsg({ ok: false, text: typeof detail === 'string' ? detail : 'Review submit failed.' })
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleDelete = async () => {
    if (!isAdmin) return
    if (!window.confirm(`Delete profile #${profile.id}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteProfile(profile.id)
      navigate('/profiles')
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Delete failed.')
      setDeleting(false)
    }
  }

  if (error) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto text-center py-16">
          <p className="font-mono text-amber text-sm mb-4">⚠ {error}</p>
          <button
            onClick={() => navigate('/profiles')}
            className="px-6 py-3 border border-border rounded-lg font-mono text-xs text-text-secondary"
          >
            ← BACK TO PROFILES
          </button>
        </div>
      </Shell>
    )
  }

  if (!profile) {
    return (
      <Shell>
        <div className="max-w-3xl mx-auto">
          <LoadingSkeleton lines={8} />
        </div>
      </Shell>
    )
  }

  const riskPct = profile.automation_risk_score == null
    ? '—' : `${Math.round(profile.automation_risk_score * 100)}%`

  return (
    <Shell>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-border flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green" />
              <span className="font-mono text-[10px] tracking-widest text-green">PROFILE #{profile.id}</span>
              {profile.needs_review ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-dim bg-amber-faint font-mono text-[9px] text-amber tracking-widest">
                  ⚠ Needs review
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-green/40 bg-green-faint font-mono text-[9px] text-green tracking-widest">
                  ✓ Reviewed
                </span>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-text-primary">
              {profile.isco_title || 'Occupation pending review'}
            </h1>
            <p className="font-mono text-xs text-text-secondary mt-1">
              ISCO {profile.isco_code || '—'} · {profile.country_code || '—'} ·
              {profile.location_city ? ` ${profile.location_city} ·` : ''} captured {new Date(profile.data_collection_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => navigate('/profiles')}
              className="px-3 py-2 border border-border bg-surface font-mono text-[10px] text-text-secondary tracking-widest rounded hover:border-green/40"
            >
              ← BACK
            </button>
            {isAdmin && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 border border-red/40 bg-red-faint text-red font-mono text-[10px] tracking-widest rounded hover:bg-red-dim disabled:opacity-50"
              >
                {deleting ? 'DELETING…' : '🗑 DELETE'}
              </button>
            )}
          </div>
        </div>

        {/* Identity + headline metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 bg-surface border border-border rounded-lg p-5">
          <Field label="Name">{profile.name}</Field>
          <Field label="Age">{profile.age}</Field>
          <Field label="Country">{profile.country_code}</Field>
          <Field label="Automation risk">
            <span className={
              profile.automation_risk_score == null ? 'text-text-secondary'
                : profile.automation_risk_score < 0.4 ? 'text-green'
                  : profile.automation_risk_score < 0.65 ? 'text-amber' : 'text-red'
            }>{riskPct}</span>
          </Field>
          <Field label="Portability">{profile.portability_score == null ? '—' : `${profile.portability_score}/100`}</Field>
          <Field label="Completeness">{profile.profile_completeness_score == null ? '—' : `${Math.round(profile.profile_completeness_score * 100)}%`}</Field>
          <Field label="Duration (years)">{profile.duration_years}</Field>
          <Field label="Frequency">{profile.frequency}</Field>
          <Field label="Income range">{profile.income_range}</Field>
        </div>

        {/* Skills */}
        <div className="bg-surface border border-border rounded-lg p-5 mb-6">
          <p className="font-mono text-[10px] tracking-widest text-text-secondary uppercase mb-3">Skill tags · ESCO</p>
          {(profile.skill_tags || []).length === 0 ? (
            <p className="font-mono text-xs text-text-muted italic">No skill tags extracted.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.skill_tags.map(tag => <SkillTag key={tag} label={tag} />)}
            </div>
          )}
        </div>

        {/* Resilience + tools + description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-surface border border-border rounded-lg p-5">
            <p className="font-mono text-[10px] tracking-widest text-text-secondary uppercase mb-3">Resilience skills</p>
            {(profile.resilience_skills || []).length === 0 ? (
              <p className="font-mono text-xs text-text-muted italic">None recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.resilience_skills.map(s => <SkillTag key={s} label={s} variant="durable" />)}
              </div>
            )}
          </div>
          <div className="bg-surface border border-border rounded-lg p-5">
            <p className="font-mono text-[10px] tracking-widest text-text-secondary uppercase mb-3">Tools used</p>
            {(profile.tools_used || []).length === 0 ? (
              <p className="font-mono text-xs text-text-muted italic">None recorded.</p>
            ) : (
              <ul className="text-sm text-text-primary space-y-1">
                {profile.tools_used.map(t => <li key={t}>· {t}</li>)}
              </ul>
            )}
          </div>
        </div>

        {profile.skill_description && (
          <div className="bg-surface border border-border rounded-lg p-5 mb-6">
            <p className="font-mono text-[10px] tracking-widest text-text-secondary uppercase mb-3">Skill description</p>
            <p className="text-sm text-text-primary leading-relaxed">{profile.skill_description}</p>
          </div>
        )}

        {/* Photos */}
        <div className="mb-6">
          <PhotoUpload
            profileId={profile.id}
            initialPhotoPaths={profile.photo_paths || []}
            initialCaptions={profile.photo_descriptions || []}
            onUploaded={(updated) => setProfile(prev => ({ ...prev, ...updated }))}
          />
        </div>

        {/* Review panel — admin only */}
        {isAdmin && (
          <div className="bg-surface border border-amber-dim rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber" />
              <p className="font-mono text-[10px] tracking-widest text-amber uppercase">
                Admin review
              </p>
            </div>

            <label htmlFor="review-notes" className="form-label">Review notes</label>
            <textarea
              id="review-notes"
              rows={4}
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              placeholder="Notes for the next reviewer or for the worker (optional)…"
              className="dark-textarea mb-3"
            />

            <label className="flex items-center gap-3 cursor-pointer select-none mb-4">
              <input
                type="checkbox"
                checked={reviewedFlag}
                onChange={e => setReviewedFlag(e.target.checked)}
                className="w-4 h-4 accent-[#1aA882]"
              />
              <span className="font-mono text-xs text-text-secondary">
                Mark as reviewed (clears the needs-review flag)
              </span>
            </label>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 20px' }}
              >
                {submittingReview ? 'Submitting…' : 'Submit review'}
              </button>
              {reviewMsg && (
                <p className={`font-mono text-xs ${reviewMsg.ok ? 'text-green' : 'text-red'}`}>
                  {reviewMsg.ok ? '✓ ' : '⚠ '}{reviewMsg.text}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Raw debug — collapsed JSON for transparency */}
        <details className="bg-raised border border-border rounded-lg p-4 font-mono text-[10px] text-text-secondary">
          <summary className="cursor-pointer">Raw ProfileOut JSON</summary>
          <pre className="mt-3 overflow-x-auto">{JSON.stringify(profile, null, 2)}</pre>
        </details>
      </div>
    </Shell>
  )
}
