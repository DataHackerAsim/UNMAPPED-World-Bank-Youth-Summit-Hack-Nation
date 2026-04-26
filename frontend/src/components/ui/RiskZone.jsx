// RiskZone.jsx — three-column risk breakdown card
// Displays at-risk, durable, and adjacent skill groups with visual hierarchy

import SkillTag from './SkillTag'

const ZONE_CONFIG = {
  risk: {
    label: 'At Risk',
    subtitle: 'Likely automated',
    icon: '⚠',
    accentColor: 'var(--color-risk-text)',
    bgColor: 'var(--color-risk-bg)',
    borderColor: 'var(--color-risk-border)',
    headerBg: 'linear-gradient(135deg, #fff4f2 0%, #ffe8e4 100%)',
  },
  durable: {
    label: 'Durable',
    subtitle: 'Resilient long-term',
    icon: '✦',
    accentColor: 'var(--color-durable-text)',
    bgColor: 'var(--color-durable-bg)',
    borderColor: 'var(--color-durable-border)',
    headerBg: 'linear-gradient(135deg, #f0faf5 0%, #ddf5ea 100%)',
  },
  adjacent: {
    label: 'Adjacent',
    subtitle: 'Worth developing',
    icon: '→',
    accentColor: 'var(--color-adjacent-text)',
    bgColor: 'var(--color-adjacent-bg)',
    borderColor: 'var(--color-adjacent-border)',
    headerBg: 'linear-gradient(135deg, #fffbf0 0%, #fef3d0 100%)',
  },
}

function ZoneColumn({ type, skills = [] }) {
  const cfg = ZONE_CONFIG[type]

  return (
    <div style={{
      flex: 1,
      border: `1px solid ${cfg.borderColor}`,
      borderRadius: '12px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
    }}>
      {/* Column header */}
      <div style={{
        background: cfg.headerBg,
        padding: '14px 16px',
        borderBottom: `1px solid ${cfg.borderColor}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{
            fontSize: '1rem',
            color: cfg.accentColor,
            fontWeight: '600',
            lineHeight: 1,
          }}>
            {cfg.icon}
          </span>
          <span style={{
            fontFamily: "'Fraunces', serif",
            fontSize: '0.95rem',
            fontWeight: '500',
            color: cfg.accentColor,
          }}>
            {cfg.label}
          </span>
          {skills.length > 0 && (
            <span style={{
              marginLeft: 'auto',
              fontSize: '0.7rem',
              fontWeight: '600',
              color: cfg.accentColor,
              background: cfg.bgColor,
              border: `1px solid ${cfg.borderColor}`,
              padding: '2px 7px',
              borderRadius: '999px',
            }}>
              {skills.length}
            </span>
          )}
        </div>
        <div style={{
          fontSize: '0.72rem',
          color: 'var(--color-content-muted)',
          fontWeight: '400',
        }}>
          {cfg.subtitle}
        </div>
      </div>

      {/* Skills list */}
      <div style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flex: 1,
        background: 'var(--color-content-surface)',
      }}>
        {skills.length === 0 ? (
          <span style={{
            fontSize: '0.78rem',
            color: 'var(--color-content-muted)',
            fontStyle: 'italic',
            padding: '8px 0',
          }}>
            No skills identified
          </span>
        ) : (
          skills.map((skill, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: cfg.accentColor,
                marginTop: '7px',
                flexShrink: 0,
                opacity: 0.6,
              }} />
              <SkillTag
                label={typeof skill === 'string' ? skill : skill.name}
                variant={type}
                showDot={false}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function RiskZone({ atRisk = [], durable = [], adjacent = [] }) {
  return (
    <div>
      {/* Section header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{
          fontFamily: "'Fraunces', serif",
          fontSize: '1.15rem',
          fontWeight: '500',
          color: 'var(--color-content-text)',
          margin: 0,
        }}>
          Skill Landscape
        </h2>
        <p style={{
          fontSize: '0.82rem',
          color: 'var(--color-content-muted)',
          marginTop: '4px',
          marginBottom: 0,
        }}>
          How your skills map to automation exposure and opportunity
        </p>
      </div>

      {/* Three columns */}
      <div style={{
        display: 'flex',
        gap: '14px',
        alignItems: 'stretch',
      }}>
        <ZoneColumn type="risk"     skills={atRisk}   />
        <ZoneColumn type="durable"  skills={durable}  />
        <ZoneColumn type="adjacent" skills={adjacent}  />
      </div>
    </div>
  )
}
