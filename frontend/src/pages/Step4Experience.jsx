import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useCountry } from '../context/CountryContext'
import Shell from '../components/ui/Shell'

export default function Step4Experience({ updateForm, formData }) {
  const { t } = useTranslation()
  const { config } = useCountry()
  const navigate = useNavigate()
  const [sector, setSector] = useState(formData.sector || '')
  const [years, setYears] = useState(formData.years_experience || '')
  const [description, setDescription] = useState(formData.experience_description || '')

  const handleNext = () => {
    updateForm({ sector, years_experience: years, experience_description: description })
    navigate('/step5')
  }

  const isValid = sector && years && description.length > 20

  const charTarget = 120
  const charPct = Math.min((description.length / charTarget) * 100, 100)
  const charColor = description.length < 20
    ? 'text-[#fca5a5]'
    : description.length < charTarget
      ? 'text-[#fcd34d]'
      : 'text-[#6ee7b7]'
  const barColor = description.length < 20
    ? 'bg-[#fca5a5]'
    : description.length < charTarget
      ? 'bg-[#fcd34d]'
      : 'bg-[#6ee7b7]'

  return (
    <Shell>
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-[#1e293b]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1aA882]" />
          <span className="font-mono text-[10px] tracking-widest text-[#1aA882]">STEP 04</span>
        </div>
        <h1 className="text-2xl font-semibold text-white mb-1">{t('step_experience')}</h1>
        <p className="text-sm text-[#94a3b8]">Include informal and self-employed work. If you ran a business, say so.</p>
      </div>

      {/* Form fields */}
      <div className="flex flex-col gap-6 mb-8">
        {/* Sector */}
        <div className="fade-up fade-up-1">
          <label className="form-label">Primary work area</label>
          <select
            value={sector}
            onChange={e => setSector(e.target.value)}
            className="dark-select"
          >
            <option value="">Select a sector…</option>
            {config.sectors.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Years */}
        <div className="fade-up fade-up-2">
          <label className="form-label">Years of experience</label>
          <input
            type="number"
            min="0"
            max="50"
            value={years}
            onChange={e => setYears(e.target.value)}
            placeholder="e.g. 3"
            className="dark-input"
          />
        </div>

        {/* Description */}
        <div className="fade-up fade-up-3">
          <label className="form-label">Describe what you actually do</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            placeholder="e.g. I repair smartphones and tablets — screens, batteries, charging ports. I deal with customers directly, diagnose problems, order parts, and run my own shop."
            className="dark-textarea"
          />

          {/* Character progress */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-[3px] bg-[#1e293b] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${charPct}%` }}
              />
            </div>
            <span className={`text-[0.72rem] font-medium shrink-0 ${charColor}`}>
              {description.length} chars
            </span>
          </div>
          <p className="text-[0.72rem] text-[#64748b] mt-1">
            More detail = better profile. Aim for {charTarget}+ characters.
          </p>
        </div>
      </div>

      {/* Nav buttons */}
      <div className="flex gap-3 fade-up fade-up-4">
        <button onClick={() => navigate('/step3')} className="btn-ghost flex-1">
          {t('btn_back')}
        </button>
        <button className="btn-primary flex-1" onClick={handleNext} disabled={!isValid}>
          {t('btn_next')}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </Shell>
  )
}
