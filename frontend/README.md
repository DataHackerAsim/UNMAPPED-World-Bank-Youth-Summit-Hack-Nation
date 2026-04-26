# UNMAPPED — Frontend
 
<p>
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Recharts-2.10-22c55e" alt="Recharts" />
  <img src="https://img.shields.io/badge/i18next-EN_|_FR-26A69A" alt="i18n" />
  <img src="https://img.shields.io/badge/Vitest-1.6-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
</p>
> Dark-themed, data-dense single-page application for informal labour market skills mapping. Built for the World Bank Youth Summit × Hack-Nation 2026.
 
---
 
## Table of Contents
 
- [Quick Start](#quick-start)
- [Application Flow](#application-flow)
- [Project Structure](#project-structure)
- [Pages & Modules](#pages--modules)
- [State Management](#state-management)
- [API Client](#api-client)
- [Design System](#design-system)
- [Country Configuration](#country-configuration)
- [Internationalization](#internationalization)
- [Offline / Mock Mode](#offline--mock-mode)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)
- [Environment Variables](#environment-variables)
---
 
## Quick Start
 
### Development
 
```bash
npm install
npm run dev
```
 
The Vite dev server starts at [http://localhost:5173](http://localhost:5173) with hot module replacement.
 
### With Backend
 
Ensure the FastAPI backend is running on port 8000 (see [backend README](../backend/README.md)), then open the frontend. The app authenticates via the login page — default credentials are `admin` / `admin`.
 
### Without Backend (Mock Mode)
 
```bash
# In .env
VITE_USE_MOCK=true
```
 
Runs the entire application with a complete mock data layer — every API function has a corresponding mock that returns realistic sample data. No network requests are made.
 
---
 
## Application Flow
 
The platform follows a **linear 5-step onboarding** flow that gates access to analytical modules:
 
```
┌─────────────────────────────────────────────────────────────────┐
│  /login  →  JWT Authentication (OAuth2 password flow)           │
└──────┬──────────────────────────────────────────────────────────┘
       ▼
┌──────────────── Onboarding (Steps 1–5) ─────────────────────────┐
│                                                                  │
│  Step 1: /          Country & regional context selection          │
│  Step 2: /step2     Education level (locale-aware options)        │
│  Step 3: /step3     Languages spoken                             │
│  Step 4: /step4     Work experience (sector, description, years) │
│  Step 5: /step5     Profile generation → 4-stage backend pipeline│
│                                                                  │
│  Each step must be completed in order (enforced by FlowContext   │
│  + RequireStep route guard). Sidebar shows lock icons for        │
│  inaccessible steps and checkmarks for completed ones.           │
└──────┬──────────────────────────────────────────────────────────┘
       ▼
┌──────────────── Analytical Modules ─────────────────────────────┐
│                                                                  │
│  /risk           Module 2 — AI Readiness Lens (automation risk)  │
│  /opportunities  Module 3 — Opportunity Matching                 │
│  /profiles       My Profiles — list of all generated profiles    │
│  /profiles/:id   Profile detail view                             │
│                                                                  │
│  Requires a generated profile (enforced by RequireProfile guard) │
└──────┬──────────────────────────────────────────────────────────┘
       ▼
┌──────────────── Admin-Only Modules ─────────────────────────────┐
│                                                                  │
│  /policy         Module 4 — Policy Dashboard (country analytics) │
│  /admin          Module 5 — Admin Panel (user + profile mgmt)    │
│                                                                  │
│  Requires admin role (enforced by RequireAdmin guard)             │
└─────────────────────────────────────────────────────────────────┘
```
 
---
 
## Project Structure
 
```
frontend/
├── public/
│   ├── favicon.svg                 # App favicon
│   └── icons.svg                   # SVG icon sprite
│
├── src/
│   ├── main.jsx                    # React DOM entry point + AuthProvider
│   ├── App.jsx                     # Router, sidebar, topbar, layout, route guards
│   ├── index.css                   # Design system (Tailwind v4 theme, components)
│   ├── i18n.js                     # i18next configuration
│   │
│   ├── pages/                      # 11 page components
│   │   ├── LoginPage.jsx           #   Full-viewport login form
│   │   ├── Step1Country.jsx        #   Country/region selection
│   │   ├── Step2Education.jsx      #   Education level picker (locale-aware)
│   │   ├── Step3Languages.jsx      #   Language input
│   │   ├── Step4Experience.jsx     #   Sector, description, years, tools
│   │   ├── Step5Generating.jsx     #   Profile generation (calls POST /profiles)
│   │   ├── RiskView.jsx            #   Automation risk dashboard
│   │   ├── OpportunitiesView.jsx   #   Opportunity matching cards
│   │   ├── PolicyDashboard.jsx     #   Country-level aggregate analytics
│   │   ├── ProfilesListPage.jsx    #   Profile browser (owner or admin)
│   │   ├── ProfileDetailPage.jsx   #   Single profile detail view
│   │   └── AdminPanel.jsx          #   User creation + user list
│   │
│   ├── components/
│   │   ├── RequireStep.jsx         #   Route guards (RequireStep, RequireProfile, RequireAdmin)
│   │   └── ui/                     # Reusable UI primitives
│   │       ├── Shell.jsx           #   Page wrapper (max-width, padding, scroll)
│   │       ├── MetricCard.jsx      #   Stat card (value + label + trend)
│   │       ├── OpportunityCard.jsx #   Opportunity listing card
│   │       ├── RiskZone.jsx        #   Risk category zone
│   │       ├── SkillTag.jsx        #   Skill tag pill (risk/durable/adjacent variants)
│   │       ├── StepBar.jsx         #   Step progress indicator
│   │       ├── LoadingSkeleton.jsx  #   Animated loading placeholder
│   │       └── PhotoUpload.jsx     #   Photo upload with preview
│   │
│   ├── context/                    # React Context state management
│   │   ├── AuthContext.jsx         #   JWT token, login/logout, admin detection
│   │   ├── FlowContext.jsx         #   Onboarding state, profile, risk, opportunities
│   │   └── CountryContext.jsx      #   Selected country configuration
│   │
│   ├── api/
│   │   ├── client.js               #   Axios HTTP client (17 API functions)
│   │   └── mock.js                 #   Complete mock layer for offline mode
│   │
│   ├── data/
│   │   └── countries.js            #   Country configs (Ghana, Bangladesh, ...)
│   │
│   ├── locales/
│   │   ├── en/translation.json     #   English translations
│   │   └── fr/translation.json     #   French translations
│   │
│   └── test/
│       └── setup.js                #   Vitest + Testing Library setup
│
├── dist/                           # Production build output
├── Dockerfile                      # Node 20 Alpine
├── package.json
├── vite.config.js
├── eslint.config.js
└── .env
```
 
---
 
## Pages & Modules
 
### Login (`/login`)
 
Full-viewport login form. Submits `POST /token` via `AuthContext.login()`. On success, persists the JWT to `localStorage` and redirects to the original intended route (or `/` by default). The sidebar and topbar chrome are hidden on this route — `LoginPage` owns its full-screen layout.
 
### Onboarding (Steps 1–5)
 
Each step collects one category of data, validates it, stores it in `FlowContext.formData`, and marks the step complete. Steps are gated sequentially — Step 3 is inaccessible until Steps 1 and 2 are completed.
 
| Step | Route | Collects | Country-Aware |
|------|-------|----------|---------------|
| 1 | `/` | Country/region code | Loads country config |
| 2 | `/step2` | Education level | Education options from country config |
| 3 | `/step3` | Languages spoken | — |
| 4 | `/step4` | Sector, experience description, years, tools | Sectors from country config |
| 5 | `/step5` | — (generates profile) | Triggers `POST /profiles` via `generateProfile()` |
 
Step 5 is the pipeline trigger. It maps the accumulated `formData` into a `ProfileIn` payload (via `mapFormToProfileIn()` in `client.js`), submits it to the backend, and transforms the response into the frontend's internal shape (via `mapProfileOutToFrontend()`).
 
### Risk View (`/risk`)
 
Displays automation risk assessment from `POST /risk/assess`:
 
- **Automation score**: Large numeric display with LMIC calibration (global score crossed out, calibrated score highlighted)
- **Risk bar**: Animated fill bar with low/moderate/high color coding (green/amber/red)
- **ILO employment share**: Live SDMX lookup showing thousands of workers in the 2-digit ISCO group for the worker's country
- **Skill breakdown**: Three-zone grid (at-risk, durable, adjacent) with `SkillTag` pills
- **Wittgenstein trend**: Line chart (Recharts `LineChart`) showing projected education completion rates 2025–2035
### Opportunities (`/opportunities`)
 
Displays matched employment opportunities from `POST /opportunities/match`:
 
- **Summary stats**: Matches found, average wage floor, immediate-access count
- **Opportunity cards**: Each card shows title, sector, pathway classification (immediate / with training / career change), wage floor (USD/month), sector growth rate, match reason, and data source
- **Data attribution**: Lists all underlying data sources (ILO, World Bank, Frey-Osborne, Wittgenstein)
### Policy Dashboard (`/policy`)
 
Admin-only aggregate analytics from `GET /policy/{country}`:
 
- **Metric cards**: Total profiles, top at-risk occupation, biggest skills gap sector, average automation risk
- **Education distribution**: Bar chart of education levels across all profiles
- **Sector supply/demand gap**: Side-by-side bar chart of supply (registered profiles) vs. demand (ILO projections)
### Admin Panel (`/admin`)
 
User management interface: create new accounts (with admin toggle), view all existing users. Visible only to admin role.
 
### Profiles (`/profiles`, `/profiles/:id`)
 
Browse and inspect generated profiles. Non-admins see only their own profiles; admins see all. Detail view shows the full pipeline output including ESCO/ISCO mapping, automation risk, skill tags, and review status.
 
---
 
## State Management
 
The app uses three React Contexts with no external state library:
 
### `AuthContext`
 
Owns the JWT lifecycle. Persists `token` and `username` to `localStorage` so authentication survives page reloads. Provides `login()`, `logout()`, `isAdmin`, `username`, and `token` to consumers.
 
- `login(username, password)` → calls `POST /token`, stores the returned JWT
- `logout()` → clears storage, hard-navigates to `/login` to reset all in-memory state
- `isAdmin` → derived from `username === 'admin'` (backend is the canonical source for role checks)
### `FlowContext`
 
Manages the entire onboarding and analytics flow. Persists to `sessionStorage` so progress survives in-tab refreshes but not new tabs (intentional — each tab is an independent session).
 
| State | Type | Description |
|-------|------|-------------|
| `formData` | `object` | Accumulated form inputs across steps 1–4 |
| `completedSteps` | `Set<number>` | Which steps are done (serialized as array) |
| `profile` | `object \| null` | Generated profile (frontend shape) |
| `risk` | `object \| null` | Risk assessment response |
| `opportunities` | `array \| null` | Matched opportunities response |
| `loading` | `boolean` | API call in progress |
| `error` | `string \| null` | Last error message |
| `backendReady` | `boolean \| null` | Health check result |
 
Key methods: `updateForm()`, `markStepComplete()`, `isStepUnlocked()`, `submitProfile()`, `fetchRisk()`, `fetchOpportunities()`, `resetFlow()`.
 
### `CountryContext`
 
Provides the selected country's configuration object (education levels, sectors, currency, region label) to all consumers. Updated when Step 1 is completed.
 
---
 
## API Client
 
`src/api/client.js` is the single HTTP interface to the backend. It wraps **17 API functions** and handles:
 
- **Token injection**: An Axios request interceptor reads the JWT from `localStorage` and attaches `Authorization: Bearer {token}` to every request
- **Form ↔ schema mapping**: `mapFormToProfileIn()` transforms the frontend's multi-step form data into the backend's `ProfileIn` Pydantic schema; `mapProfileOutToFrontend()` transforms `ProfileOut` into the frontend's internal shape
- **Mock switching**: Every function checks `VITE_USE_MOCK` and delegates to the corresponding mock implementation when enabled
### API Functions
 
| Function | Backend Endpoint | Description |
|----------|-----------------|-------------|
| `login()` | `POST /token` | OAuth2 password flow |
| `getMe()` | `GET /me` | Current user identity |
| `createUser()` | `POST /users` | Admin: create account |
| `listUsers()` | `GET /users` | Admin: list all accounts |
| `generateProfile()` | `POST /profiles` | Trigger 4-stage pipeline |
| `listProfiles()` | `GET /profiles` | List profiles with filters |
| `fetchProfile()` | `GET /profiles/{id}` | Single profile |
| `deleteProfile()` | `DELETE /profiles/{id}` | Admin: delete profile |
| `reviewProfile()` | `PATCH /profiles/{id}/review` | Admin: review toggle |
| `uploadPhoto()` | `POST /profiles/{id}/photos` | Photo upload |
| `getPhotoUrl()` | `GET /profiles/{id}/photos/{filename}` | Presigned URL |
| `assessRisk()` | `POST /risk/assess` | Risk assessment |
| `matchOpportunities()` | `POST /opportunities/match` | Opportunity matching |
| `getPolicyData()` | `GET /policy/{code}` | Policy analytics |
| `getEmploymentData()` | `GET /ilostat/employment` | ILOSTAT lookup |
| `validateIscoCode()` | `GET /validate/isco` | ISCO code check |
| `checkHealth()` | `GET /health` | System health |
 
---
 
## Design System
 
### Typography
 
| Role | Font | Usage |
|------|------|-------|
| Display / headings | **Fraunces** (serif, variable optical size) | Page titles, large numbers, brand |
| Body / UI | **DM Sans** (sans-serif) | Paragraphs, labels, buttons |
| Data / monospace | **Space Mono** (via Tailwind) | Metric values, codes, technical labels |
 
### Color Palette
 
The design uses a dark theme with a teal accent system:
 
| Token | Hex | Usage |
|-------|-----|-------|
| `content-bg` | `#0b1117` | Page background |
| `content-surface` | `#121a24` | Card / panel background |
| `content-border` | `#1e293b` | Borders, dividers |
| `teal-500` | `#12967A` | Primary accent, active states |
| `green` (`teal-400`) | `#1aA882` | Success, positive metrics, CTAs |
| `amber` | System amber | Warnings, moderate risk, adjacent skills |
| `red` | System red | High risk, at-risk skills |
 
### Risk Visualization
 
Three semantic color zones used consistently across the UI:
 
| Zone | Background | Text | Border | Usage |
|------|-----------|------|--------|-------|
| At-risk | `rgba(220,38,38,0.1)` | `#fca5a5` | `rgba(220,38,38,0.2)` | Tasks/skills threatened by automation |
| Durable | `rgba(26,168,130,0.1)` | `#6ee7b7` | `rgba(26,168,130,0.2)` | Skills resistant to automation |
| Adjacent | `rgba(217,119,6,0.1)` | `#fcd34d` | `rgba(217,119,6,0.2)` | Upskilling pathways and recommendations |
 
### Layout
 
- **Sidebar**: Fixed 240px left sidebar with brand, account info, navigation (onboarding steps + modules + admin sections)
- **Topbar**: Sticky header with dynamic page title
- **Content area**: Scrollable, max-width constrained (`max-w-2xl` for forms, `max-w-3xl` for dashboards)
- **Login page**: Full-viewport, no sidebar/topbar chrome
### Animations
 
- `fade-in-up`: Staggered entry animations with delay classes (`delay-1` through `delay-4`)
- `fill-bar`: CSS custom property animation for risk bars (`--fill-w`)
- `pulse-dot`: Subtle pulse on module indicator dots
- Skeleton loading: `animate-pulse` on placeholder elements
---
 
## Country Configuration
 
`src/data/countries.js` exports `COUNTRY_CONFIGS` — an object keyed by ISO alpha-2 codes. Each country config provides locale-aware options:
 
```javascript
{
  code: 'GH',
  label: 'Ghana — Urban Informal Economy',
  language: 'en',
  currency: 'GHS',
  currencySymbol: '₵',
  usdRate: 15.4,
  automationLabel: 'West Africa calibrated',
  region: 'West Africa',
  educationLevels: [
    { value: 'primary', label: 'Basic Education (BECE)' },
    { value: 'secondary', label: 'Secondary (WASSCE)' },
    { value: 'vocational', label: 'Vocational (NVTI)' },
    { value: 'tertiary', label: 'University / Polytechnic' },
  ],
  sectors: ['ICT & Electronics', 'Trade & Retail', 'Construction', ...],
  opportunityTypes: ['Self-employment', 'Gig work', 'Training pathway', ...],
}
```
 
Currently configured for **Ghana** (urban informal economy) and **Bangladesh** (rural agricultural). Adding a new country requires only a new entry in this file — no code changes needed elsewhere.
 
---
 
## Internationalization
 
The app uses `react-i18next` with bundled translation files (no async loading):
 
- `src/locales/en/translation.json` — English (35 keys)
- `src/locales/fr/translation.json` — French (35 keys)
Translation keys cover all user-facing labels: page titles, button text, form labels, metric labels, and module descriptions. The language is set to English by default with French as an alternative.
 
---
 
## Offline / Mock Mode
 
Setting `VITE_USE_MOCK=true` activates a complete mock layer in `src/api/mock.js`. Every API function in `client.js` has a corresponding mock:
 
| Mock | Simulates |
|------|-----------|
| `mockGenerateProfile()` | Full pipeline response with realistic skill tags and scores |
| `mockAssessRisk()` | Risk assessment with Frey-Osborne-calibrated scores |
| `mockMatchOpportunities()` | 4 opportunity cards with sectors, wages, pathways |
| `mockGetPolicyData()` | Country-level aggregate stats with distributions |
| `mockListProfiles()` | Profile list with mixed review states |
| `mockGetEmploymentData()` | ILOSTAT employment thousands |
| `mockValidateIsco()` | Always-valid ISCO response |
 
Mock mode is useful for frontend development without a running backend, demos, and UI testing.
 
---
 
## Testing
 
```bash
# Run all tests
npm test
 
# Watch mode
npm run test:watch
```
 
Tests use **Vitest** + **React Testing Library** + **jsdom**:
 
| Test File | Covers |
|-----------|--------|
| `RequireStep.test.jsx` | Step-gate navigation: blocked when incomplete, allowed when complete |
| `AuthContext.test.jsx` | Login flow, token persistence, logout, admin detection |
| `FlowContext.test.jsx` | Step completion, form data accumulation, session persistence |
| `Step2Education.test.jsx` | Education level rendering, country-aware option display |
 
---
 
## Build & Deployment
 
### Production Build
 
```bash
npm run build
```
 
Outputs optimized assets to `dist/`. The build is a static SPA — serve with any static file server.
 
### Preview Production Build
 
```bash
npm run preview
```
 
### Docker
 
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```
 
> **Note:** The Docker image runs the Vite dev server for development convenience. For production, build the static assets and serve via nginx or a CDN.
 
---
 
## Environment Variables
 
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API base URL |
| `VITE_USE_MOCK` | `false` | Enable offline mock mode (`true` = no backend needed) |
 
Both variables are injected at build time by Vite and available via `import.meta.env`.
 
---
 
## Dependencies
 
### Runtime
 
| Package | Version | Role |
|---------|---------|------|
| `react` | 18.2 | UI framework |
| `react-dom` | 18.2 | DOM rendering |
| `react-router-dom` | 6.21 | Client-side routing |
| `axios` | 1.6 | HTTP client |
| `recharts` | 2.10 | Data visualization (line charts, bar charts) |
| `i18next` | 23.7 | Internationalization framework |
| `react-i18next` | 13.5 | React bindings for i18next |
| `clsx` | 2.1 | Conditional CSS class utility |
| `html2canvas` | 1.4 | Screenshot capture (PDF export) |
| `jspdf` | 2.5 | PDF generation (skills passport download) |
 
### Development
 
| Package | Version | Role |
|---------|---------|------|
| `vite` | 5.0 | Build tool + dev server |
| `@vitejs/plugin-react` | 4.2 | React fast refresh |
| `tailwindcss` | 4.0 | Utility-first CSS |
| `@tailwindcss/vite` | 4.0 | Tailwind Vite integration |
| `vitest` | 1.6 | Test runner |
| `@testing-library/react` | 14.1 | Component testing utilities |
| `@testing-library/jest-dom` | 6.4 | DOM assertion matchers |
| `@testing-library/user-event` | 14.5 | User interaction simulation |
| `jsdom` | 24.0 | Browser environment for tests |
