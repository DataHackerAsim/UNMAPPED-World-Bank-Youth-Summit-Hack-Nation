import { useNavigate } from 'react-router-dom'
import { useCountry } from '../context/CountryContext'
import { useFlow } from '../context/FlowContext'
import Shell from '../components/ui/Shell'

export default function Step1Country() {
  const { countryCode, config, switchCountry, countries, isLoading, fetchError } = useCountry()
  const { updateForm, markStepComplete, formData } = useFlow()
  const navigate = useNavigate()

  const selectedCode = formData.country_code ?? countryCode

  const handleSelect = (code) => {
    switchCountry(code)
    updateForm({ country_code: code })
  }

  const handleNext = () => {
    updateForm({ country_code: countryCode })
    markStepComplete(1)
    navigate('/step2')
  }

  return (
    <Shell>
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-[#1e293b]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1aA882]" />
          <span className="font-mono text-[10px] tracking-widest text-[#1aA882]">STEP 01</span>
        </div>
        <h1 className="text-2xl font-semibold text-white mb-1">Select Context</h1>
        <p className="text-sm text-[#94a3b8]">
          Choose the target region to calibrate the economic mapping model.
          {fetchError && <span className="text-amber-400 ml-2">— showing offline list</span>}
        </p>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[140px] rounded-lg border-2 border-[#2a3444] bg-[#121a24] animate-pulse" />
          ))}
        </div>
      )}

      {/* Country cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
          {Object.values(countries).map((cfg) => {
            const active = selectedCode === cfg.code
            return (
              <button
                key={cfg.code}
                onClick={() => handleSelect(cfg.code)}
                aria-pressed={active}
                className={`group text-left p-5 rounded-lg border-2 transition-all duration-200 relative flex flex-col justify-between min-h-[140px]
                  ${active
                    ? 'border-[#1aA882] bg-[#1aA882]/8'
                    : 'border-[#2a3444] bg-[#121a24] hover:border-[#475569] hover:bg-[#1e293b]/40'
                  }`}
              >
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <span className={`font-mono text-[11px] tracking-widest block mb-1 ${active ? 'text-[#1aA882]' : 'text-[#64748b]'}`}>
                      {cfg.code}
                    </span>
                    <span className="font-semibold text-[15px] text-white block leading-snug">
                      {cfg.label}
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 mt-0.5
                    ${active
                      ? 'bg-[#1aA882] border-[#1aA882]'
                      : 'border-[#94a3b8] bg-transparent group-hover:border-[#cbd5e1]'
                    }`}
                  >
                    {active && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 6l2.5 2.5 4.5-5" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <p className="font-mono text-[11px] text-[#94a3b8] tracking-widest mb-0.5">CURRENCY</p>
                    <p className="font-mono text-sm text-white font-medium">{cfg.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[11px] text-[#94a3b8] tracking-widest mb-0.5">CALIBRATION</p>
                    <p className="font-mono text-sm text-white font-medium">{cfg.automationLabel}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Bottom action bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-[#1a2332] border border-[#2a3444] rounded-lg px-6 py-4">
        <div className="flex items-center gap-8 font-mono text-[12px]">
          <div>
            <span className="text-[#94a3b8] mr-2">ACTIVE:</span>
            <span className="text-[#1aA882] font-semibold">{config.label?.split('—')[0]?.trim()}</span>
          </div>
          <div>
            <span className="text-[#94a3b8] mr-2">REGION:</span>
            <span className="text-white font-medium">{config.region || '—'}</span>
          </div>
          <div>
            <span className="text-[#94a3b8] mr-2">SECTORS:</span>
            <span className="text-white font-medium">{config.sectors?.length || 0} Tracked</span>
          </div>
        </div>
        <button
          onClick={handleNext}
          disabled={isLoading}
          className="mt-4 sm:mt-0 px-7 py-2.5 bg-[#1aA882] hover:bg-[#12967A] disabled:opacity-50 text-white text-[13px] font-semibold rounded-md transition-colors flex items-center gap-2 shrink-0"
        >
          Save & Continue
          <span className="text-lg leading-none">→</span>
        </button>
      </div>
    </Shell>
  )
}
