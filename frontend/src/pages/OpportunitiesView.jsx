import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Shell from '../components/ui/Shell'
import OpportunityCard from '../components/ui/OpportunityCard'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import { useCountry } from '../context/CountryContext'
import { useFlow } from '../context/FlowContext'

export default function OpportunitiesView() {
  const navigate = useNavigate()
  const { config } = useCountry()
  const { fetchOpportunities, opportunities, loading, error, profile, resetFlow } = useFlow()
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    if (!profile) return
    if (opportunities) return
    fetchedRef.current = true
    fetchOpportunities().catch(() => {})
  }, [profile, opportunities, fetchOpportunities])

  const handleNewProfile = () => {
    resetFlow()
    navigate('/')
  }

  /* ── Loading ── */
  if (loading && !opportunities) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-1 rounded-full bg-green pulse-dot" />
              <span className="font-mono text-[10px] tracking-widest text-green">MODULE 03 · OPPORTUNITY MATCHING</span>
            </div>
            <div className="h-8 bg-raised rounded w-72 animate-pulse mb-2" />
            <div className="h-4 bg-raised rounded w-80 animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface border border-border rounded-lg p-5">
                <LoadingSkeleton lines={4} />
              </div>
            ))}
          </div>
        </div>
      </Shell>
    )
  }

  /* ── Error ── */
  if (error && !opportunities) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-2 h-2 rounded-full bg-amber mb-4" />
          <p className="font-mono text-amber text-sm mb-2">Opportunities unavailable</p>
          <p className="font-mono text-text-secondary text-xs mb-6 max-w-md">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/risk')}
              className="px-6 py-3 border border-border rounded-lg font-mono text-xs text-text-secondary hover:border-amber/40"
            >
              ← BACK TO RISK
            </button>
            <button
              onClick={() => { fetchedRef.current = true; fetchOpportunities().catch(() => {}) }}
              className="px-6 py-3 bg-green hover:bg-green-dim text-black font-display font-bold rounded-lg text-sm"
            >
              RETRY →
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
          <p className="font-mono text-text-secondary text-sm">No opportunities matched yet.</p>
        </div>
      </Shell>
    )
  }

  /* Aggregate stats for summary bar */
  const avgWage = Math.round(opportunities.reduce((s, o) => s + o.wage_floor_usd_month, 0) / opportunities.length)
  const avgGrowth = (opportunities.reduce((s, o) => s + o.sector_growth_pct, 0) / opportunities.length).toFixed(1)
  const immediate = opportunities.filter(o => o.pathway === 'immediate').length

  return (
    <Shell>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6 fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-1 rounded-full bg-green pulse-dot" />
            <span className="font-mono text-[10px] tracking-widest text-green">MODULE 03 · OPPORTUNITY MATCHING</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-text-primary mb-2">
                Realistic opportunities
              </h2>
              <p className="text-text-secondary text-sm">
                Matched to your skills profile. Grounded in ILOSTAT wage and employment data for {config.label}.
              </p>
            </div>
            <button
              onClick={() => navigate('/policy')}
              className="flex-shrink-0 px-3 py-2 border border-border bg-surface font-mono text-[10px] text-text-secondary tracking-widest rounded hover:border-green/40 hover:text-green transition-colors"
            >
              POLICY VIEW →
            </button>
          </div>
        </div>

        {/* Summary stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6 fade-in-up delay-1">
          <div className="bg-surface border border-border rounded-lg p-4 text-center">
            <p className="font-display text-2xl font-bold text-green">
              {opportunities.length}
            </p>
            <p className="font-mono text-[10px] text-text-secondary tracking-widest mt-1">MATCHES FOUND</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4 text-center">
            <p className="font-display text-2xl font-bold text-green">
              ${avgWage}
            </p>
            <p className="font-mono text-[10px] text-text-secondary tracking-widest mt-1">AVG WAGE / MO</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4 text-center">
            <p className="font-display text-2xl font-bold text-green">
              {immediate}
            </p>
            <p className="font-mono text-[10px] text-text-secondary tracking-widest mt-1">IMMEDIATE ACCESS</p>
          </div>
        </div>

        {/* Sort / filter row */}
        <div className="flex items-center gap-3 mb-4 fade-in-up delay-2">
          <span className="font-mono text-[10px] tracking-widest text-text-secondary">
            {opportunities.length} RESULTS · RANKED BY MATCH SCORE
          </span>
          <div className="flex-1 h-px bg-border" />
          <span className="font-mono text-[10px] text-text-muted">
            +{avgGrowth}% avg sector growth
          </span>
        </div>

        {/* Opportunity cards */}
        <div className="space-y-4 mb-8">
          {opportunities.map((opp, i) => (
            <OpportunityCard key={opp.id} opp={opp} index={i} />
          ))}
        </div>

        {/* Data attribution */}
        <div className="bg-surface border border-border rounded-lg p-4 mb-6 fade-in-up">
          <p className="font-mono text-[10px] text-text-secondary tracking-widest mb-2">DATA SOURCES</p>
          <p className="font-mono text-[10px] text-text-muted leading-relaxed">
            ILO ILOSTAT wage and employment data · World Bank WDI ·
            Frey-Osborne automation scores (LMIC calibrated) ·
            World Bank STEP skills measurement · Wittgenstein Centre projections
          </p>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-3 fade-in-up">
          <button
            onClick={() => navigate('/risk')}
            className="py-4 border border-border bg-surface text-text-secondary font-mono text-xs tracking-widest rounded-lg hover:border-green/40 hover:text-green transition-colors"
          >
            ← RISK VIEW
          </button>
          <button
            onClick={handleNewProfile}
            className="py-4 border border-green/40 bg-green-faint text-green font-display font-bold rounded-lg hover:bg-green-muted transition-colors text-sm"
          >
            NEW PROFILE
          </button>
        </div>
      </div>
    </Shell>
  )
}
