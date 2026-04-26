// LoadingSkeleton.jsx — shimmer placeholder using design system skeleton class

// Widths cycle so multiple lines look natural, not robotic
const WIDTH_CYCLE = ['92%', '78%', '85%', '60%', '72%', '88%']

export default function LoadingSkeleton({ lines = 3, className = '', variant = 'lines' }) {

  if (variant === 'card') {
    // Full card shimmer — used for OpportunityCard / MetricCard placeholders
    return (
      <div style={{
        background: 'var(--color-content-surface)',
        border: '1px solid var(--color-content-border)',
        borderRadius: '14px',
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        className,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="skeleton" style={{ height: '18px', width: '55%', borderRadius: '6px' }} />
          <div className="skeleton" style={{ height: '22px', width: '80px', borderRadius: '999px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton" style={{ height: '13px', width: '90%' }} />
          <div className="skeleton" style={{ height: '13px', width: '70%' }} />
        </div>
        <div style={{ height: '1px', background: 'var(--color-content-border)' }} />
        <div style={{ display: 'flex', gap: '24px' }}>
          {[40, 36, 50].map((w, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="skeleton" style={{ height: '10px', width: `${w}px` }} />
              <div className="skeleton" style={{ height: '20px', width: `${w + 10}px` }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'metric') {
    return (
      <div style={{
        background: 'var(--color-content-surface)',
        border: '1px solid var(--color-content-border)',
        borderRadius: '14px',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <div className="skeleton" style={{ height: '10px', width: '60%' }} />
        <div className="skeleton" style={{ height: '32px', width: '45%' }} />
        <div className="skeleton" style={{ height: '10px', width: '75%' }} />
      </div>
    )
  }

  // Default: lines variant
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      className,
    }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: i === 0 ? '16px' : '13px',
            width: WIDTH_CYCLE[i % WIDTH_CYCLE.length],
            borderRadius: '6px',
          }}
        />
      ))}
    </div>
  )
}
