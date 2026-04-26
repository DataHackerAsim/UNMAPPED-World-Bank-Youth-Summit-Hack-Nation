import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import Shell from '../components/ui/Shell'
import MetricCard from '../components/ui/MetricCard'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import { useCountry } from '../context/CountryContext'
import { getPolicyData } from '../api/client'

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-raised border border-border rounded px-3 py-2">
      <p className="font-mono text-[10px] text-text-secondary mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="font-mono text-xs font-bold" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function PolicyDashboard() {
  const navigate = useNavigate()
  const { config } = useCountry()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setData(null)
    setError(null)
    getPolicyData(config.code)
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError('Policy data unavailable for this region.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [config.code])

  if (loading) {
    return (
      <Shell>
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-1 rounded-full bg-green pulse-dot" />
              <span className="font-mono text-[10px] tracking-widest text-green">POLICY VIEW · AGGREGATE SIGNALS</span>
            </div>
            <div className="h-8 bg-raised rounded w-72 animate-pulse mb-2" />
            <div className="h-4 bg-raised rounded w-80 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-surface border border-border rounded-lg p-5 h-24 animate-pulse" />
            ))}
          </div>
          <LoadingSkeleton lines={5} />
        </div>
      </Shell>
    )
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-2 h-2 rounded-full bg-amber mb-4" />
          <p className="font-mono text-amber text-sm mb-2">Dashboard unavailable</p>
          <p className="font-mono text-text-secondary text-xs mb-6 max-w-md">
            {error ?? 'No data returned for this region.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 border border-border rounded-lg font-mono text-xs text-text-secondary hover:border-amber/40"
          >
            ← CHANGE CONTEXT
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8 fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-1 rounded-full bg-green pulse-dot" />
                <span className="font-mono text-[10px] tracking-widest text-green">POLICY VIEW · AGGREGATE SIGNALS</span>
              </div>
              <h2 className="font-display text-3xl font-bold text-text-primary mb-1">
                Regional skills dashboard
              </h2>
              <p className="text-text-secondary text-sm">{config.label} · {config.region}</p>
            </div>
            <button
              onClick={() => navigate('/opportunities')}
              className="px-3 py-2 border border-border bg-surface font-mono text-[10px] text-text-secondary tracking-widest rounded hover:border-green/40 hover:text-green transition-colors"
            >
              YOUTH VIEW →
            </button>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 mb-6 fade-in-up delay-1">
          <MetricCard
            label="Profiles Registered"
            value={data.total_profiles.toLocaleString()}
            sub="this month across all contexts"
            accent="green"
          />
          <MetricCard
            label="Avg Automation Risk"
            value={`${data.avg_automation_risk_pct}%`}
            sub="LMIC-calibrated exposure average"
            accent="amber"
          />
          <MetricCard
            label="Biggest Skills Gap"
            value={data.biggest_skills_gap}
            sub="highest demand vs supply deficit"
            accent="green"
          />
          <MetricCard
            label="Top At-Risk Occupation"
            value={data.top_at_risk_occupation}
            sub="highest automation probability"
            accent="amber"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 fade-in-up delay-2">

          {/* Skills distribution */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-1 rounded-full bg-green" />
              <p className="font-mono text-[10px] tracking-widest text-text-secondary uppercase">
                Skills Distribution by Education Level
              </p>
            </div>
            <p className="font-mono text-[10px] text-text-muted mb-5">Registered profiles · {config.label}</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={data.skills_distribution}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'Space Mono' }} axisLine={{ stroke: '#1f2937' }} tickLine={false} />
                <YAxis type="category" dataKey="level" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.skills_distribution.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#7f1d1d' : i === 1 ? '#14532d' : i === 2 ? '#22c55e' : i === 3 ? '#f59e0b' : '#16a34a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sector gap */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-1 rounded-full bg-amber" />
              <p className="font-mono text-[10px] tracking-widest text-text-secondary uppercase">
                Sector Demand vs Supply Gap
              </p>
            </div>
            <p className="font-mono text-[10px] text-text-muted mb-5">
              Source: ILO ILOSTAT · World Bank Enterprise Surveys
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.sector_gap} margin={{ top: 0, right: 16, left: -20, bottom: 0 }}>
                <XAxis dataKey="sector" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'Space Mono' }} axisLine={{ stroke: '#1f2937' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="demand" name="Demand" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="supply" name="Supply" fill="#14532d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-green" />
                <span className="font-mono text-[10px] text-text-secondary">Employer demand</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-green-muted" />
                <span className="font-mono text-[10px] text-text-secondary">Skills supply</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data attribution */}
        <div className="mt-4 p-4 bg-surface border border-border rounded-lg fade-in-up delay-3">
          <p className="font-mono text-[10px] text-text-secondary tracking-widest mb-2">DATA INFRASTRUCTURE</p>
          <p className="font-mono text-[10px] text-text-muted leading-relaxed">
            ILO ILOSTAT · World Bank WDI · World Bank Enterprise Surveys (WBES) ·
            ILO Global Labour Database · Frey-Osborne Automation Scores ·
            Wittgenstein Centre Education Projections 2025–2035
          </p>
        </div>
      </div>
    </Shell>
  )
}
