# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are active and prospective iRacing sim racers—ranging from rookies aiming to progress through safety ratings to veterans managing complex weekly multi-series campaigns across Sports Car, Formula, Oval, Dirt Oval, and Dirt Road disciplines.

- **The Weekly Competitor**: Needs to quickly see what series and tracks are active this week ("Week Live"), verify license eligibility, and check whether they own the required car and track without booting the sim.
- **The Season Budgeter / Planner**: Needs to plan an entire 12-week season in advance, identify which track purchases yield the highest participation across multiple favorite series, and export race sessions into Google Calendar or Apple Calendar.
- **The Team / Multi-Series Driver**: Needs to compare up to 3 series side by side (race durations, fixed vs. open setups, SOF, car rosters) and inspect driver profiles/statistics.

## Product Purpose

BoxBoxBoard exists to eliminate the friction, clunkiness, and fragmentation of planning iRacing seasons through static PDF documents, forum threads, or the official member site.

Success means a sim racer can open the application, instantly see active track rotations and schedules for their license level, verify owned content (automatically or manually), build their personal race calendar, and get back into the cockpit in seconds.

## Positioning

BoxBoxBoard is a fast, reactive, open-source iRacing season planner and schedule browser. Unlike monolithic or ad-laden reference sites, it provides:
- Instant guest-mode browsing with real or demo schedule data—no mandatory login or account creation.
- Dual-track content tracking: official iRacing OAuth2 (PKCE) for automated owned-content highlighting, combined with local manual selection for privacy-minded racers.
- Multi-dimensional schedule views: visual cards, full season matrix calendar, personal race schedule with calendar export (.ics / Google Calendar), and interactive circuit maps.
- Zero ads, zero paywalls, and community-driven transparency.

## Operating Context

- **Temporal Rhythm**: iRacing operates in quarterly seasons (typically 12 official race weeks followed by "Week 13"). Race weeks roll over every Tuesday at 00:00 UTC. The app must dynamically recognize active season weeks and upcoming transitions.
- **Physical Environment**: Used on desktop rigs (often on secondary displays or dedicated tablet pit boards mounted next to racing wheels) in dark cockpit rooms, as well as on mobile phones while away from the sim rig.
- **Language & Locality**: Global motorsport audience, with primary bilingual support for English and Spanish (auto-detected with manual override).
- **Network / Availability**: Must degrade gracefully when iRacing APIs undergo weekly deployment downtime by serving demo/cached schedule data.

## Capabilities and Constraints

### Confirmed Capabilities
- **Schedule Exploration**: Filter series by category (Sports Car, Formula, Oval, Dirt Oval, Dirt Road), license class (Rookie, D, C, B, A, Pro), setup type (Fixed, Open), official status, duration, and search keywords.
- **Multi-View System**:
  - *Cards View*: Visual overview with track rotation previews, live week badges, and rapid action shortcuts.
  - *Calendar View*: Global matrix cross-referencing all series against season weeks.
  - *Schedule View*: Curated personal race itinerary with week-by-week status and one-click iCal / Google Calendar export.
  - *Track Map*: Leaflet-powered geographical circuit locator with track configurations.
- **Series Comparison**: Side-by-side comparator for up to 3 series assessing license minimums, car classes, race lengths, and track overlap.
- **Content Tracking**:
  - Automated detection of owned cars and tracks via official iRacing OAuth2 (`data-server` audience with PKCE).
  - Manual local content tracking allowing users to track owned content without logging in.
- **Driver Profile & Telemetry Insights**: Driver search by name/customer ID, license class breakdowns, iRating / Safety Rating progression, recent race results, and interactive 3D helmet preview.
- **PWA & Responsiveness**: Installable Progressive Web App with offline caching and mobile-optimized layouts.

### Confirmed Constraints
- **Trademark & Affiliation**: Strict legal disclaimers stating BoxBoxBoard is not affiliated with, endorsed by, or associated with iRacing.com Motorsport Simulations.
- **Security & Privacy**: User passwords must never be seen, handled, or stored by the app. Authentication strictly uses official OAuth2 authorization code with PKCE.
- **Zero-Friction Access**: Browsing, filtering, comparing, and scheduling must remain accessible without requiring an iRacing login.

## Brand Commitments

- **Name**: BoxBoxBoard (referencing the universal motorsport pit confirmation call "Box, box, box").
- **Visual & Conceptual Tone**: Motorsport pit board meets telemetry dashboard—clean, high-density, precise, functional, and devoid of marketing fluff.
- **Voice**: Practical, racer-to-racer, motorsport-literate. Uses authentic terminology: SOF (Strength of Field), splits, fixed/open, license tiers (R/D/C/B/A), Week 13, track rotation, multiclass.
- **Identity Assets**: Dark mode primary palette with vibrant category accents (`#3B9EFF` Sports Car, `#A855F7` Formula, `#F97316` Oval, `#EAB308` Dirt Oval, `#22C55E` Dirt Road) and motorsport red accent (`#E8002D`).

## Evidence on Hand

- Production web application deployed at [boxboxboard.app](https://boxboxboard.app).
- Full source codebase in Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide icons, Three.js, and Leaflet.
- Bilingual i18n dictionaries for English and Spanish in `app/lib/i18n.tsx`.
- Integrated OAuth2 client proxy routes (`app/api/auth/*` and `app/api/iracing/*`).
- PWA manifest, service worker, and application icons in `public/`.
- Absences to respect: No fabricated user testimonials, no artificial paywalls, no sponsored affiliate placements without user consent.

## Product Principles

1. **Frictionless Discovery First**: Immediate access to season information without forcing sign-up, modal walls, or initial setup steps.
2. **Dual-Track Content Privacy**: Empower racers with automatic OAuth synchronization when desired, while preserving full manual control for users who prefer not to link accounts.
3. **Glanceable Pit-Board Density**: Optimize layout and hierarchy so drivers can check eligibility, schedules, and times at a glance between practice sessions.
4. **Motorsport Authenticity & Cadence**: Respect the real-world operational rules of iRacing (Tuesday UTC week rollovers, 12-week schedules, official vs. unofficial series).

## Accessibility & Inclusion

- Optimized contrast for low-light simulator environments with dedicated dark and light themes.
- Accessible font sizing and distinct color-coding paired with text badges to avoid reliance on color alone for categories or licenses.
- Responsive, touch-friendly hit targets on mobile and tablet pit board displays.
- Bilingual localization (EN/ES) matching the user's browser language with explicit manual switching.
