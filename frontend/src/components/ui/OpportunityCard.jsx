import { useTranslation } from 'react-i18next'
import { useCountry } from '../../context/CountryContext'

const pathwayConfig = {
  immediate: {
    label: 'opp_pathway_immediate',
    bg: 'var(--color-durable-bg)',
    color: 'var(--color-durable-text)',
    border: 'var(--color-durable-border)',
    dot: 'var(--color-durable-text)',
  },
  with_training: {
    label: 'opp_pathway_training',
    bg: 'var(--color-adjacent-bg)',
    color: 'var(--color-adjacent-text)',
    border: 'var(--color-adjacent-border)',
    dot: 'var(--color-adjacent-text)',
  },
  with_credential: {
    label: 'opp_pathway_credential',
    bg: 'var(--color-purple-50)',
    color: 'var(--color-purple-800)',
    border: 'var(--color-purple-100)',
    dot: 'var(--color-purple-400)',
  },
}

export default function OpportunityCard({ opp }) {
  const { t } = useTranslation()
  const { config } = useCountry()

  const wageLocal = Math.round(opp.wage_floor_usd_month * config.usdRate)
  const pw = pathwayConfig[opp.pathway] ?? pathwayConfig.immediate

  return (
    <div
      style={{
        background: 'var(--color-content-surface)',
        border: '1px solid var(--color-content-border)',
        borderRadius: '14px',
        padding: '22px 24px',
        transition: 'box-shadow 0.18s ease, border-color 0.18s ease, transform 0.18s ease',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--color-teal-200)'
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,168,130,0.09)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--color-content-border)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <h3 style={{
          fontFamily: "'Fraunces', serif",
          fontSize: '1rem',
          fontWeight: '500',
          color: 'var(--color-content-text)',
          margin: 0,
          lineHeight: 1.3,
          minWidth: 0,
          flex: 1,
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}>
          {opp.title}
        </h3>

        {/* Pathway badge */}
        <span style={{
          background: pw.bg,
          color: pw.color,
          border: `1px solid ${pw.border}`,
          borderRadius: '999px',
          fontSize: '0.7rem',
          fontWeight: '600',
          padding: '3px 10px',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          flexShrink: 0,
          letterSpacing: '0.01em',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: pw.dot, flexShrink: 0 }} />
          {t(pw.label)}
        </span>
      </div>

      {/* Match reason */}
      <p style={{
        fontSize: '0.82rem',
        color: 'var(--color-content-muted)',
        margin: 0,
        lineHeight: 1.55,
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}>
        {opp.match_reason}
      </p>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--color-content-border)' }} />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-content-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '500', marginBottom: '3px' }}>
            {t('opp_wage')}
          </p>
          <p style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--color-content-text)', margin: 0 }}>
            {config.currencySymbol}{wageLocal.toLocaleString()}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-content-muted)', fontWeight: '400' }}>/mo</span>
          </p>
        </div>

        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-content-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '500', marginBottom: '3px' }}>
            {t('opp_growth')}
          </p>
          <p style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--color-durable-text)', margin: 0 }}>
            +{opp.sector_growth_pct.toFixed(1)}%
          </p>
        </div>

        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-content-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '500', marginBottom: '3px' }}>
            Sector
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-content-text)', margin: 0, fontWeight: '500', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {opp.sector}
          </p>
        </div>

        {/* Source pushed to right */}
        <p style={{
          marginLeft: 'auto',
          fontSize: '0.68rem',
          color: 'var(--color-content-border)',
          margin: 0,
          alignSelf: 'flex-end',
        }}>
          {opp.source}
        </p>
      </div>
    </div>
  )
}
