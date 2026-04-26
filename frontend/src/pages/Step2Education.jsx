import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useCountry } from '../context/CountryContext'
import Shell from '../components/ui/Shell'

export default function Step2Education({ updateForm, formData }) {
  const { t } = useTranslation()
  const { config } = useCountry()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(formData.education_level || '')

  const handleNext = () => {
    updateForm({ education_level: selected })
    navigate('/step3')
  }

  return (
    <Shell>
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-[#1e293b]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1aA882]" />
          <span className="font-mono text-[10px] tracking-widest text-[#1aA882]">STEP 02</span>
        </div>
        <h1 className="text-2xl font-semibold text-white mb-1">{t('step_education')}</h1>
        <p className="text-sm text-[#94a3b8]">Select your highest completed level. Partial completion counts — pick the level you reached.</p>
      </div>

      {/* Education options */}
      <div className="flex flex-col gap-3 mb-8">
        {config.educationLevels.map((level, i) => {
          const active = selected === level.value
          return (
            <button
              key={level.value}
              onClick={() => setSelected(level.value)}
              className={`fade-up fade-up-${Math.min(i + 1, 4)} w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between gap-4
                ${active
                  ? 'border-[#1aA882] bg-[#1aA882]/8'
                  : 'border-[#1e293b] bg-[#121a24] hover:border-[#334155] hover:bg-[#1e293b]/50'
                }`}
            >
              <span className={`text-[0.9rem] ${active ? 'text-white font-medium' : 'text-[#cbd5e1]'}`}>
                {level.label}
              </span>

              {/* Radio indicator */}
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                ${active
                  ? 'border-[#1aA882] bg-[#1aA882]'
                  : 'border-[#475569] bg-transparent'
                }`}
              >
                {active && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Nav buttons */}
      <div className="flex gap-3 fade-up fade-up-4">
        <button onClick={() => navigate('/step1')} className="btn-ghost flex-1">
          {t('btn_back')}
        </button>
        <button className="btn-primary flex-1" onClick={handleNext} disabled={!selected}>
          {t('btn_next')}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </Shell>
  )
}
