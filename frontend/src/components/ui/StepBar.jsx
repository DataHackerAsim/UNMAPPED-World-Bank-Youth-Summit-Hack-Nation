const STEPS = [
  { label: 'Context', short: 'CTX' },
  { label: 'Education', short: 'EDU' },
  { label: 'Languages', short: 'LNG' },
  { label: 'Experience', short: 'EXP' },
  { label: 'Profile', short: 'PRO' },
]

export default function StepBar({ current }) {
  return (
    <div className="flex items-center w-full max-w-2xl">
      {STEPS.map((s, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current

        return (
          <div key={s.label} className="flex items-center flex-1">
            {/* Left Track */}
            {i > 0 && (
              <div className={`flex-1 h-[2px] transition-colors duration-300 ${done || active ? 'bg-[#1aA882]' : 'bg-[#1e293b]'}`} />
            )}

            {/* Node */}
            <div className="flex items-center gap-2 px-3">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold font-mono transition-all duration-300
                ${done ? 'bg-[#1aA882]/20 text-[#1aA882]' 
                : active ? 'bg-[#1aA882] text-white ring-2 ring-[#1aA882]/30' 
                : 'bg-[#121a24] border border-[#1e293b] text-[#64748b]'}`}
              >
                {done ? '✓' : idx}
              </div>
              <span className={`text-[11px] font-medium hidden sm:block ${active ? 'text-white' : done ? 'text-[#1aA882]' : 'text-[#64748b]'}`}>
                {s.label}
              </span>
            </div>

            {/* Right Track */}
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-[2px] transition-colors duration-300 ${done ? 'bg-[#1aA882]' : 'bg-[#1e293b]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}