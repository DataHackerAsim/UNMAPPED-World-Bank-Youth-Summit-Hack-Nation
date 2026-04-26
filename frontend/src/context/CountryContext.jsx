import { createContext, useContext, useState } from 'react'
import { COUNTRY_CONFIGS } from '../data/countries'

const CountryContext = createContext(null)

export function CountryProvider({ children }) {
  const [countryCode, setCountryCode] = useState('GH')

  const config = COUNTRY_CONFIGS[countryCode]

  const switchCountry = (code) => {
    setCountryCode(code)
  }

  return (
    <CountryContext.Provider value={{ countryCode, config, switchCountry }}>
      {children}
    </CountryContext.Provider>
  )
}

export function useCountry() {
  const ctx = useContext(CountryContext)
  if (!ctx) throw new Error('useCountry must be used inside CountryProvider')
  return ctx
}