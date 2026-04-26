import { createContext, useContext, useState, useEffect } from 'react'
import { COUNTRY_CONFIGS } from '../data/countries'

const CountryContext = createContext(null)

// ── World Bank API → app config shape ─────────────────────────────
const LMIC_INCOME_GROUPS = new Set([
  'Low income',
  'Lower middle income',
  'Upper middle income',
])

const REGION_CALIBRATION = {
  'Sub-Saharan Africa':           'Sub-Saharan Africa calibrated',
  'South Asia':                   'South Asia calibrated',
  'East Asia and Pacific':        'East Asia & Pacific calibrated',
  'Middle East and North Africa': 'MENA calibrated',
  'Latin America & Caribbean':    'Latin America calibrated',
  'Europe and Central Asia':      'Central Asia calibrated',
}

const REGION_SECTORS = {
  'Sub-Saharan Africa':           ['Agriculture', 'Trade & Retail', 'Construction', 'ICT & Mobile', 'Manufacturing'],
  'South Asia':                   ['Agriculture', 'Garment & Textile', 'Construction', 'Trade & Retail', 'ICT Services'],
  'East Asia and Pacific':        ['Manufacturing', 'ICT & Electronics', 'Trade & Retail', 'Construction', 'Agriculture'],
  'Middle East and North Africa': ['Construction', 'Trade & Retail', 'Manufacturing', 'ICT Services', 'Agriculture'],
  'Latin America & Caribbean':    ['Agriculture', 'Trade & Retail', 'ICT Services', 'Construction', 'Finance'],
  'Europe and Central Asia':      ['Manufacturing', 'Agriculture', 'Trade & Retail', 'Construction', 'ICT Services'],
}

const DEFAULT_SECTORS = ['Agriculture', 'Trade & Retail', 'Construction', 'ICT Services', 'Manufacturing']

const CURRENCY_MAP = {
  AF:'AFN',BD:'BDT',BJ:'XOF',BO:'BOB',BR:'BRL',BF:'XOF',BI:'BIF',
  CM:'XAF',CF:'XAF',TD:'XAF',CL:'CLP',CN:'CNY',CO:'COP',CD:'CDF',
  CI:'XOF',DJ:'DJF',EG:'EGP',SV:'USD',ET:'ETB',GM:'GMD',GH:'GHS',
  GT:'GTQ',GN:'GNF',HT:'HTG',HN:'HNL',IN:'INR',ID:'IDR',IQ:'IQD',
  JO:'JOD',KE:'KES',KH:'KHR',KZ:'KZT',LB:'LBP',LS:'LSL',LR:'LRD',
  MG:'MGA',MW:'MWK',ML:'XOF',MR:'MRU',MX:'MXN',MD:'MDL',MZ:'MZN',
  MM:'MMK',NA:'NAD',NP:'NPR',NI:'NIO',NE:'XOF',NG:'NGN',PK:'PKR',
  PG:'PGK',PY:'PYG',PE:'PEN',PH:'PHP',RW:'RWF',SN:'XOF',SL:'SLE',
  SO:'SOS',ZA:'ZAR',SS:'SSP',SD:'SDG',SZ:'SZL',TJ:'TJS',TZ:'TZS',
  TH:'THB',TL:'USD',TG:'XOF',TN:'TND',UG:'UGX',UA:'UAH',UZ:'UZS',
  VN:'VND',YE:'YER',ZM:'ZMW',ZW:'ZWL',MA:'MAD',EC:'USD',VE:'VES',
  GE:'GEL',AM:'AMD',AZ:'AZN',MN:'MNT',LA:'LAK',KG:'KGS',TM:'TMT',
}

function mapWBCountry(c) {
  const sectors     = REGION_SECTORS[c.region?.value] || DEFAULT_SECTORS
  const calibration = REGION_CALIBRATION[c.region?.value] || 'Global calibrated'
  const currency    = CURRENCY_MAP[c.id] || 'USD'

  return {
    code: c.id,
    label: `${c.name} — ${c.region?.value?.split(' ')[0] || 'Developing'} Economy`,
    language: 'en',
    currency,
    currencySymbol: currency,
    usdRate: 1,
    automationLabel: calibration,
    region: c.region?.value || 'Global',
    incomeLevel: c.incomeLevel?.value || '',
    educationLevels: [
      { value: 'none',       label: 'No formal education' },
      { value: 'primary',    label: 'Primary school' },
      { value: 'secondary',  label: 'Secondary school' },
      { value: 'vocational', label: 'Vocational / TVET' },
      { value: 'tertiary',   label: 'University / College' },
    ],
    sectors,
    opportunityTypes: ['Self-employment', 'Gig work', 'Training pathway', 'Formal employment'],
  }
}

async function fetchWBCountries() {
  const res = await fetch(
    'https://api.worldbank.org/v2/country?format=json&per_page=300&incomeLevel=LIC;LMC;UMC'
  )
  if (!res.ok) throw new Error(`WB API ${res.status}`)
  const [, data] = await res.json()

  return data
    .filter(c =>
      c.region?.id !== 'NA' &&
      c.capitalCity &&
      LMIC_INCOME_GROUPS.has(c.incomeLevel?.value)
    )
    .map(mapWBCountry)
    .sort((a, b) => a.label.localeCompare(b.label))
}

// ── Context ────────────────────────────────────────────────────────

export function CountryProvider({ children }) {
  const [countryCode,   setCountryCode]   = useState('GH')
  const [liveCountries, setLiveCountries] = useState(null)
  const [fetchError,    setFetchError]    = useState(false)

  useEffect(() => {
    fetchWBCountries()
      .then(countries => {
        const merged = {}
        countries.forEach(c => { merged[c.code] = c })
        // Hardcoded configs override live data (richer sector/education detail)
        Object.entries(COUNTRY_CONFIGS).forEach(([code, cfg]) => {
          merged[code] = { ...merged[code], ...cfg }
        })
        setLiveCountries(merged)
      })
      .catch(() => {
        setFetchError(true)
        setLiveCountries(COUNTRY_CONFIGS)
      })
  }, [])

  const countries = liveCountries ?? COUNTRY_CONFIGS
  const config    = countries[countryCode] ?? Object.values(countries)[0]

  return (
    <CountryContext.Provider value={{
      countryCode,
      config,
      switchCountry: setCountryCode,
      countries,
      isLoading: liveCountries === null,
      fetchError,
    }}>
      {children}
    </CountryContext.Provider>
  )
}

export function useCountry() {
  const ctx = useContext(CountryContext)
  if (!ctx) throw new Error('useCountry must be used inside CountryProvider')
  return ctx
}
