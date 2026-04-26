import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Shell from '../components/ui/Shell'
import SkillTag from '../components/ui/SkillTag'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'

const LOADING_STEPS = [
  'Parsing experience description...',
  'Querying ISCO-08 taxonomy...',
  'Matching ESCO skill URIs...',
  'Calibrating for regional context...',
  'Generating plain-language summary...',
  'Finalising skills passport...',
]

export default function Step5Generating({ submitProfile, profile, loading, error }) {
  const navigate      = useNavigate()
  const cardRef       = useRef(null)
  const [generated,   setGenerated]   = useState(false)
  const [loadStep,    setLoadStep]    = useState(0)
  const [exporting,   setExporting]   = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    if (!generated) {
      setGenerated(true)
      submitProfile().then(() => setShowProfile(true)).catch(() => {})
    }
  }, [])

  // Cycle through loading messages
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadStep(prev => (prev + 1) % LOADING_STEPS.length)
    }, 600)
    return () => clearInterval(interval)
  }, [loading])

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return
    setExporting(true)
    try {
      const canvas   = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: '#0f1217' })
      const imgData  = canvas.toDataURL('image/png')
      const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW     = pdf.internal.pageSize.getWidth()
      const pdfH     = (canvas.height * pdfW) / canvas.width
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
          {/* Terminal window */}
          <div className="w-full bg-surface border border-border rounded-lg overflow-hidden mb-8">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-raised">
              <div className="w-2 h-2 rounded-full bg-red-dim" />
              <div className="w-2 h-2 rounded-full bg-amber-dim" />
              <div className="w-2 h-2 rounded-full bg-green-muted" />
              <span className="font-mono text-[10px] text-text-secondary ml-2 tracking-widest">UNMAPPED · SKILLS ENGINE</span>
            </div>
            {/* Terminal body */}
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
  if (error) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-2 h-2 rounded-full bg-red mb-4" />
          <p className="font-mono text-red text-sm mb-6">{error}</p>
          <button onClick={() => navigate('/step4')} className="px-6 py-3 border border-border rounded-lg font-mono text-xs text-text-secondary hover:border-red/40">
            ← GO BACK
          </button>
        </div>
      </Shell>
    )
  }

  if (!profile) return null

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
          {/* Card header */}
          <div className="bg-raised border-b border-border px-6 py-4 flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-green mb-1">ISCO-08 OCCUPATION CODE</p>
              <h3 className="font-display text-xl font-bold text-text-primary">{profile.skills.isco_title}</h3>
              <p className="font-mono text-xs text-text-secondary mt-1">
                {profile.skills.isco_codes.join(' · ')} · O*NET {profile.skills.onet_soc}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] text-text-muted tracking-widest">VERIFIED BY</p>
              <p className="font-mono text-[10px] text-green">UNMAPPED</p>
            </div>
          </div>

          {/* Summary */}
          <div className="px-6 py-5 border-b border-border">
            <p className="font-mono text-[10px] tracking-widest text-text-secondary mb-3">PROFILE SUMMARY</p>
            <p className="text-sm text-text-secondary leading-relaxed border-l-2 border-green pl-4">
              {profile.skills.summary}
            </p>
          </div>

          {/* Skills */}
          <div className="px-6 py-5 border-b border-border">
            <p className="font-mono text-[10px] tracking-widest text-text-secondary mb-3">SKILL PORTFOLIO · ESCO TAXONOMY</p>
            <div className="flex flex-wrap gap-2">
              {profile.skills.esco_skill_tags.map(tag => (
                <SkillTag key={tag} label={tag} />
              ))}
            </div>
          </div>

          {/* Competency levels */}
          <div className="px-6 py-5">
            <p className="font-mono text-[10px] tracking-widest text-text-secondary mb-4">COMPETENCY LEVELS</p>
            <div className="space-y-3">
              {Object.entries(profile.skills.competency_levels).map(([domain, level]) => {
                const w = level === 'advanced' ? '100%' : level === 'intermediate' ? '65%' : '30%'
                const color = level === 'advanced' ? 'bg-green' : level === 'intermediate' ? 'bg-amber' : 'bg-red'
                return (
                  <div key={domain} className="flex items-center gap-4">
                    <span className="font-mono text-xs text-text-secondary w-40 flex-shrink-0 capitalize">
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

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4 fade-in-up delay-3">
          <button
            onClick={handleDownloadPDF}
            disabled={exporting}
            className="py-4 border border-green/40 bg-green-faint text-green font-display font-bold rounded-lg hover:bg-green-muted transition-all text-sm"
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
