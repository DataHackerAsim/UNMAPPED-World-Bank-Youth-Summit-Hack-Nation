import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import Shell from '../components/ui/Shell'
import SkillTag from '../components/ui/SkillTag'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-raised border border-border rounded px-3 py-2">
      <p className="font-mono text-[10px] text-text-secondary">{label}</p>
      <p className="font-mono text-sm text-green font-bold">{payload[0].value}%</p>
    </div>
  )
}

export default function RiskView({ fetchRisk, risk, loading, error }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!risk) fetchRisk().catch(() => {})
  }, [])

  /* ── Loading ── */
  if (loading) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-1 rounded-full bg-amber pulse-dot" />
              <span className="font-mono text-[10px] tracking-widest text-amber">MODULE 02 · AI READINESS LENS</span>
            </div>
            <div className="h-8 bg-raised rounded w-64 animate-pulse mb-2" />
            <div className="h-4 bg-raised rounded w-96 animate-pulse" />
          </div>
          <LoadingSkeleton lines={6} />
        </div>
      </Shell>
    )
  }

  if (!risk) return null

  const globalPct    = Math.round(risk.automation_score_global * 100)
  const calibPct     = Math.round(risk.automation_score_lmic_calibrated * 100)
  const riskColor    = calibPct < 40 ? 'text-green' : calibPct < 65 ? 'text-amber' : 'text-red'
  const riskBarColor = calibPct < 40 ? 'bg-green'   : calibPct < 65 ? 'bg-amber'   : 'bg-red'

  return (
    <Shell>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8 fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-1 rounded-full bg-amber pulse-dot" />
            <span className="font-mono text-[10px] tracking-widest text-amber">MODULE 02 · AI READINESS LENS</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-text-primary mb-2">
            Your automation outlook
          </h2>
          <p className="text-text-secondary text-sm">
            Based on Frey-Osborne scores and ILO task indices, calibrated for your regional context.
          </p>
        </div>

        {/* ── ECONOMETRIC SIGNAL 1: Automation Score ── */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-4 fade-in-up delay-1 relative overflow-hidden">
          {/* Background number */}
          <div className={`absolute right-4 top-1/2 -translate-y-1/2 font-display font-extrabold text-8xl opacity-5 ${riskColor}`}>
            {calibPct}
          </div>

          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-1 rounded-full bg-amber" />
            <span className="font-mono text-[10px] tracking-widest text-text-secondary uppercase">
              Automation Risk · Your Region
            </span>
          </div>

          <div className="flex items-end gap-4 mb-4">
            <span className={`font-display text-6xl font-extrabold ${riskColor}`}>
              {calibPct}%
            </span>
            <div className="mb-2">
              <p className="font-mono text-xs text-text-secondary line-through">{globalPct}% global</p>
              <p className="font-mono text-xs text-green">↓ {globalPct - calibPct}pp lower, LMIC calibrated</p>
            </div>
          </div>

          {/* Risk bar */}
          <div className="h-2 bg-raised rounded-full overflow-hidden mb-3">
            <div
              className={`h-2 rounded-full fill-bar ${riskBarColor}`}
              style={{ '--fill-w': `${calibPct}%` }}
            />
          </div>

          {/* Scale labels */}
          <div className="flex justify-between font-mono text-[9px] text-text-muted mb-4">
            <span>LOW RISK</span>
            <span>MODERATE</span>
            <span>HIGH RISK</span>
          </div>

          <p className="font-mono text-xs text-text-secondary italic">{risk.calibration_note}</p>
        </div>

        {/* Data source attribution */}
        <p className="font-mono text-[10px] text-text-muted mb-6 fade-in-up delay-1">
          Source: Frey & Osborne (2013) · ILO Task Indices · LMIC calibration applied
        </p>

        {/* ── 3-zone skill breakdown ── */}
        <div className="flex items-center gap-3 mb-4 fade-in-up delay-2">
          <span className="font-mono text-[10px] tracking-widest text-text-secondary">SKILL BREAKDOWN</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6 fade-in-up delay-2">
          {/* At risk */}
          <div className="bg-red-faint border border-red-dim rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red" />
              <p className="font-mono text-[9px] tracking-widest text-red uppercase">At Risk</p>
            </div>
            <div className="space-y-2">
              {risk.at_risk_tasks.map(s => (
                <SkillTag key={s} label={s} variant="risk" />
              ))}
            </div>
          </div>

          {/* Durable */}
          <div className="bg-green-faint border border-green-muted rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-green" />
              <p className="font-mono text-[9px] tracking-widest text-green uppercase">Durable</p>
            </div>
            <div className="space-y-2">
              {risk.durable_skills.map(s => (
                <SkillTag key={s} label={s} variant="durable" />
              ))}
            </div>
          </div>

          {/* Adjacent */}
          <div className="bg-amber-faint border border-amber-dim rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber" />
              <p className="font-mono text-[9px] tracking-widest text-amber uppercase">Adjacent</p>
            </div>
            <div className="space-y-2">
              {risk.adjacent_skills.map(s => (
                <SkillTag key={s} label={s} variant="adjacent" />
              ))}
            </div>
          </div>
        </div>

        {/* ── ECONOMETRIC SIGNAL 2: Wittgenstein Trend ── */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-6 fade-in-up delay-3">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-1 rounded-full bg-green" />
                <span className="font-mono text-[10px] tracking-widest text-text-secondary uppercase">
                  Education Completion Trend · Your Region
                </span>
              </div>
              <p className="font-mono text-[10px] text-text-muted">
                Wittgenstein Centre projections 2025–2035 · Secondary level
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold text-green">
                {risk.wittgenstein_trend[risk.wittgenstein_trend.length - 1].pct}%
              </p>
              <p className="font-mono text-[10px] text-text-secondary">by 2035</p>
            </div>
          </div>

          <div className="mt-6">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={risk.wittgenstein_trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'Space Mono' }}
                  axisLine={{ stroke: '#1f2937' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'Space Mono' }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                  domain={[30, 60]}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={risk.wittgenstein_trend[0].pct}
                  stroke="#1f2937"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#22c55e', stroke: '#052e16', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="font-mono text-[10px] text-text-secondary leading-relaxed">
              <span className="text-amber">↑ Rising completion rates</span> increase credential competition in your region.
              Skill differentiation matters more than credentials alone over the next decade.
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/opportunities')}
          className="w-full py-4 bg-green hover:bg-green-dim text-black font-display font-bold rounded-lg transition-all duration-200 glow-green hover:scale-[1.01] active:scale-[0.99] fade-in-up delay-4"
        >
          FIND OPPORTUNITIES →
        </button>
      </div>
    </Shell>
  )
}
