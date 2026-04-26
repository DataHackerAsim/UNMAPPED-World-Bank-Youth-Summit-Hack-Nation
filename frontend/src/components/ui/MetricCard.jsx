// MetricCard.jsx — policy dashboard stat box
// Supports optional trend indicator and accent color theming

const accentMap = {
  teal:   { bg: 'var(--color-teal-50)',    color: 'var(--color-teal-600)',    bar: 'var(--color-teal-400)'   },
  amber:  { bg: 'var(--color-amber-50)',   color: 'var(--color-amber-400)',   bar: 'var(--color-amber-400)'  },
  purple: { bg: 'var(--color-purple-50)',  color: 'var(--color-purple-400)',  bar: 'var(--color-purple-400)' },
  risk:   { bg: 'var(--color-risk-bg)',    color: 'var(--color-risk-text)',   bar: 'var(--color-risk-text)'  },
}

export default function MetricCard({ label, value, sub, accent = 'teal', trend }) {
  const a = accentMap[accent] ?? accentMap.teal

  // trend: { direction: 'up'|'down', label: string }
  const trendUp   = trend?.direction === 'up'
  const trendDown = trend?.direction === 'down'

  return (
    <div style={{
      background: 'var(--color-content-surface)',
      border: '1px solid var(--color-content-border)',
      borderRadius: '14px',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'box-shadow 0.15s ease',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Accent bar on top */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '3px',
        background: a.bar,
        borderRadius: '14px 14px 0 0',
      }} />

      {/* Label */}
      <p style={{
        fontSize: '0.68rem',
        fontWeight: '600',
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: 'var(--color-content-muted)',
        margin: 0,
        marginTop: '4px',
      }}>
        {label}
      </p>

      {/* Value */}
      <p style={{
        fontFamily: "'Fraunces', serif",
        fontSize: '2rem',
        fontWeight: '500',
        color: 'var(--color-content-text)',
        margin: 0,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </p>

      {/* Sub + trend row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        {sub && (
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--color-content-muted)',
            margin: 0,
          }}>
            {sub}
          </p>
        )}
        {trend && (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: '600',
            color: trendUp ? 'var(--color-durable-text)' : trendDown ? 'var(--color-risk-text)' : 'var(--color-content-muted)',
            background: trendUp ? 'var(--color-durable-bg)' : trendDown ? 'var(--color-risk-bg)' : 'transparent',
            border: `1px solid ${trendUp ? 'var(--color-durable-border)' : trendDown ? 'var(--color-risk-border)' : 'transparent'}`,
            padding: '2px 8px',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}>
            {trendUp ? '↑' : trendDown ? '↓' : '→'} {trend.label}
          </span>
        )}
      </div>
    </div>
  )
}
