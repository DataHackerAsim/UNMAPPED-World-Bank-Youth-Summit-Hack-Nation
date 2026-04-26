import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useFlow } from '../context/FlowContext'
import { validateIscoCode } from '../api/client'
import Shell from '../components/ui/Shell'
import SkillTag from '../components/ui/SkillTag'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import PhotoUpload from '../components/ui/PhotoUpload'

const LOADING_STEPS = [
  'Parsing experience description...',
  'Querying ISCO-08 taxonomy...',
  'Matching ESCO skill URIs...',
  'Calibrating for regional context...',
  'Generating plain-language summary...',
  'Finalising skills passport...',
]

export default function Step5Generating() {
  const navigate = useNavigate()
  const { submitProfile, profile, loading, error, setError, setProfileFromBackend } = useFlow()
  const cardRef = useRef(null)
  const submitOnceRef = useRef(false)
  const [loadStep, setLoadStep] = useState(0)
  const [exporting, setExporting] = useState(false)
  // ISCO validation result: null=pending, true=valid, false=unverified
  const [iscoValid, setIscoValid] = useState(null)

  // One-shot submit on mount. Ref guard survives StrictMode's double-invoke
  // and prevents duplicate POSTs that would create two backend profiles.
  useEffect(() => {
    if (submitOnceRef.current) return
    if (profile) return
    submitOnceRef.current = true
    submitProfile().catch(() => {})
  }, [profile, submitProfile])

  // Cycle through loading messages
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadStep(prev => (prev + 1) % LOADING_STEPS.length)
    }, 600)
    return () => clearInterval(interval)
  }, [loading])

  // Validate the displayed ISCO code against the official classification
  // once the profile lands. Treat pipeline errors as "unverified" rather
  // than blocking the passport from rendering.
  useEffect(() => {
    if (!profile) return
    const code = profile.skills?.isco_codes?.[0]
    if (!code || code === '0000') {
      setIscoValid(false)
      return
    }
    let cancelled = false
    validateIscoCode(code)
      .then(res => { if (!cancelled) setIscoValid(!!res?.valid) })
      .catch(() => { if (!cancelled) setIscoValid(false) })
    return () => { cancelled = true }
  }, [profile])

  const handleRetry = () => {
    setError(null)
    submitOnceRef.current = true
    submitProfile().catch(() => {})
  }

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: '#0f1217' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = (canvas.height * pdfW) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 10, pdfW, pdfH)
      pdf.save('unmapped-skills-passport.pdf')
    } finally {
      setExporting(false)
    }
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-full bg-surface border border-border rounded-lg overflow-hidden mb-8">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-raised">
              <div className="w-2 h-2 rounded-full bg-red-dim" />
              <div className="w-2 h-2 rounded-full bg-amber-dim" />
              <div className="w-2 h-2 rounded-full bg-green-muted" />
              <span className="font-mono text-[10px] text-text-secondary ml-2 tracking-widest">UNMAPPED · SKILLS ENGINE</span>
            </div>
            <div className="p-6 font-mono text-xs space-y-2 text-left min-h-[200px]">
              {LOADING_STEPS.slice(0, loadStep + 1).map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-green-dim">{'>'}</span>
                  <span className={i === loadStep ? 'text-green' : 'text-text-secondary'}>
                    {step}
                    {i === loadStep && <span className="blink ml-1">█</span>}
                  </span>
                  {i < loadStep && <span className="text-green ml-auto">✓</span>}
                </div>
              ))}
            </div>
          </div>
          <LoadingSkeleton lines={3} className="w-full" />
        </div>
      </Shell>
    )
  }

  /* ── Error state ── */
  if (error && !profile) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-2 h-2 rounded-full bg-red mb-4" />
          <p className="font-mono text-red text-sm mb-2">Profile generation failed</p>
          <p className="font-mono text-text-secondary text-xs mb-6 max-w-md">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/step4')}
              className="px-6 py-3 border border-border rounded-lg font-mono text-xs text-text-secondary hover:border-red/40"
            >
              ← GO BACK
            </button>
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-green hover:bg-green-dim text-black font-display font-bold rounded-lg text-sm"
            >
              RETRY →
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  /* ── Idle (no profile, no loading, no error — initial render before effect fires) ── */
  if (!profile) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
          <LoadingSkeleton lines={3} className="w-full" />
        </div>
      </Shell>
    )
  }

  const iscoCode = profile.skills?.isco_codes?.[0] || '0000'
  const raw = profile._raw || {}

  /* ── Profile card ── */
  return (
    <Shell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-1 rounded-full bg-green pulse-dot" />
            <span className="font-mono text-[10px] tracking-widest text-green">PROFILE GENERATED · MODULE 01 COMPLETE</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-text-primary mb-1">
            Your skills passport
          </h2>
          <p className="text-text-secondary text-sm">This is yours. You own it. Share it with any employer, training provider, or government service.</p>
        </div>

        {/* The card — ref for PDF export */}
        <div
          ref={cardRef}
          className="bg-surface border border-green-muted rounded-lg overflow-hidden mb-6 glow-green fade-in-up delay-1"
        >
          <div className="bg-raised border-b border-border px-6 py-4 flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-green mb-1">ISCO-08 OCCUPATION CODE</p>
              <h3 className="font-display text-xl font-bold text-text-primary">{profile.skills.isco_title}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="font-mono text-xs text-text-secondary">
                  {profile.skills.isco_codes.join(' · ')} · O*NET {profile.skills.onet_soc}
                </p>
                {/* ISCO validation badge */}
                {iscoValid === true && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-green/40 bg-green-faint font-mono text-[9px] text-green tracking-widest"
                    title={`ISCO code ${iscoCode} matches the official ILO classification.`}
                  >
                    ✓ Valid ISCO code
                  </span>
                )}
                {iscoValid === false && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-dim bg-amber-faint font-mono text-[9px] text-amber tracking-widest"
                    title={`ISCO code ${iscoCode} could not be verified against the official classification.`}
                  >
                    ⚠ Unverified code
                  </span>
                )}
                {iscoValid === null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-raised font-mono text-[9px] text-text-secondary tracking-widest">
                    Validating…
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] text-text-muted tracking-widest">VERIFIED BY</p>
              <p className="font-mono text-[10px] text-green">UNMAPPED</p>
            </div>
          </div>

          <div className="px-6 py-5 border-b border-border">
            <p className="font-mono text-[10px] tracking-widest text-text-secondary mb-3">PROFILE SUMMARY</p>
            <p className="text-sm text-text-secondary leading-relaxed border-l-2 border-green pl-4">
              {profile.skills.summary}
            </p>
          </div>

          <div className="px-6 py-5 border-b border-border">
            <p className="font-mono text-[10px] tracking-widest text-text-secondary mb-3">SKILL PORTFOLIO · ESCO TAXONOMY</p>
            <div className="flex flex-wrap gap-2">
              {profile.skills.esco_skill_tags.map(tag => (
                <SkillTag key={tag} label={tag} />
              ))}
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="font-mono text-[10px] tracking-widest text-text-secondary mb-4">COMPETENCY LEVELS</p>
            <div className="space-y-3">
              {Object.entries(profile.skills.competency_levels).map(([domain, level]) => {
                const w = level === 'advanced' ? '100%' : level === 'intermediate' ? '65%' : '30%'
                const color = level === 'advanced' ? 'bg-green' : level === 'intermediate' ? 'bg-amber' : 'bg-red'
                return (
                  <div key={domain} className="flex items-center gap-4">
                    <span className="font-mono text-xs text-text-secondary w-40 shrink-0 capitalize">
                      {domain.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 h-1 bg-raised rounded-full overflow-hidden">
                      <div
                        className={`h-1 rounded-full fill-bar ${color}`}
                        style={{ '--fill-w': w }}
                      />
                    </div>
                    <span className={`font-mono text-[10px] w-20 text-right ${
                      level === 'advanced' ? 'text-green' : level === 'intermediate' ? 'text-amber' : 'text-red'
                    }`}>{level.toUpperCase()}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Photos — separate from PDF card */}
        <div className="mb-6 fade-in-up delay-2">
          <PhotoUpload
            profileId={profile.profile_id}
            initialPhotoPaths={raw.photo_paths || []}
            initialCaptions={raw.photo_descriptions || []}
            onUploaded={setProfileFromBackend}
          />
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4 fade-in-up delay-3">
          <button
            onClick={handleDownloadPDF}
            disabled={exporting}
            className="py-4 border border-green/40 bg-green-faint text-green font-display font-bold rounded-lg hover:bg-green-muted transition-all text-sm disabled:opacity-60"
          >
            {exporting ? 'EXPORTING...' : '↓ DOWNLOAD PASSPORT'}
          </button>
          <button
            onClick={() => navigate('/risk')}
            className="py-4 bg-green hover:bg-green-dim text-black font-display font-bold rounded-lg transition-all duration-200 glow-green hover:scale-[1.01] text-sm"
          >
            ASSESS MY FUTURE →
          </button>
        </div>

        <p className="font-mono text-[10px] text-text-muted text-center fade-in-up delay-4">
          Powered by ILO ISCO-08 · ESCO Skills Taxonomy · Anthropic Claude
        </p>
      </div>
    </Shell>
  )
}
