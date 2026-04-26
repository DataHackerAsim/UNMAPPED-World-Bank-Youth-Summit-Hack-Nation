import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Shell from '../components/ui/Shell'

const LANGUAGES = [
  'English', 'French', 'Arabic', 'Swahili', 'Hausa',
  'Twi / Akan', 'Yoruba', 'Amharic', 'Bengali', 'Hindi',
  'Urdu', 'Tagalog', 'Portuguese', 'Spanish', 'Mandarin',
]

export default function Step3Languages({ updateForm, formData }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(formData.languages || [])

  const toggle = (lang) => {
    setSelected(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
  }

  const handleNext = () => {
    updateForm({ languages: selected })
    navigate('/step4')
  }

  return (
    <Shell>
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-[#1e293b]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1aA882]" />
          <span className="font-mono text-[10px] tracking-widest text-[#1aA882]">STEP 03</span>
        </div>
        <h1 className="text-2xl font-semibold text-white mb-1">{t('step_languages')}</h1>
        <p className="text-sm text-[#94a3b8]">Select all languages you can hold a work conversation in.</p>
      </div>

      {/* Language chips */}
      <div className="flex flex-wrap gap-2.5 mb-6">
        {LANGUAGES.map(lang => {
          const active = selected.includes(lang)
          return (
            <button
              key={lang}
              onClick={() => toggle(lang)}
              className={`px-4 py-2 rounded-full border transition-all duration-200 text-[0.84rem] font-medium
                ${active
                  ? 'bg-[#1aA882] border-[#1aA882] text-white shadow-[0_2px_12px_rgba(26,168,130,0.3)]'
                  : 'bg-[#121a24] border-[#2a3444] text-[#cbd5e1] hover:border-[#475569] hover:bg-[#1e293b]'
                }`}
            >
              {lang}
            </button>
          )
        })}
      </div>

      {/* Selected summary */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#1aA882]/20 bg-[#1aA882]/6 mb-8 fade-up">
          <span className="w-6 h-6 rounded-full bg-[#1aA882] text-white text-[0.7rem] font-bold flex items-center justify-center shrink-0">
            {selected.length}
          </span>
          <span className="text-[0.82rem] text-[#6ee7b7] font-medium">
            {selected.join(' · ')}
          </span>
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex gap-3 fade-up fade-up-3">
        <button onClick={() => navigate('/step2')} className="btn-ghost flex-1">
          {t('btn_back')}
        </button>
        <button className="btn-primary flex-1" onClick={handleNext} disabled={selected.length === 0}>
          {t('btn_next')}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </Shell>
  )
}
