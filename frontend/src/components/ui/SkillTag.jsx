// SkillTag.jsx — refined pill badge using CSS vars from design system

const variants = {
  default: {
    background: 'var(--color-teal-50)',
    color: 'var(--color-teal-800)',
    border: '1px solid var(--color-teal-100)',
  },
  risk: {
    background: 'var(--color-risk-bg)',
    color: 'var(--color-risk-text)',
    border: '1px solid var(--color-risk-border)',
  },
  durable: {
    background: 'var(--color-durable-bg)',
    color: 'var(--color-durable-text)',
    border: '1px solid var(--color-durable-border)',
  },
  adjacent: {
    background: 'var(--color-adjacent-bg)',
    color: 'var(--color-adjacent-text)',
    border: '1px solid var(--color-adjacent-border)',
  },
}

const dots = {
  default:  'var(--color-teal-400)',
  risk:     'var(--color-risk-text)',
  durable:  'var(--color-durable-text)',
  adjacent: 'var(--color-adjacent-text)',
}

export default function SkillTag({ label, variant = 'default', showDot = false }) {
  const style = variants[variant] ?? variants.default
  const dotColor = dots[variant] ?? dots.default

  return (
    <span style={{
      ...style,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 12px',
      borderRadius: '999px',
      fontSize: '0.78rem',
      fontWeight: '500',
      fontFamily: "'DM Sans', sans-serif",
      letterSpacing: '0.01em',
      lineHeight: 1.4,
      transition: 'opacity 0.15s ease',
      whiteSpace: 'nowrap',
    }}>
      {showDot && (
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
        }} />
      )}
      {label}
    </span>
  )
}
