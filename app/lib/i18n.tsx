"use client";
// /app/lib/i18n.tsx — Internationalization context (ES / EN)

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "es";

// ── Translations type ─────────────────────────────────────────
export interface Translations {
  openApp: string;
  appName: string;
  connectIRacing: string;
  support: string;
  favorites: string;
  myContent: string;
  season: string;
  loading: string;
  live: string;
  series: string;
  cards: string;
  calendar: string;
  schedule: string;
  filterType: string;
  filterLicense: string;
  filterStatus: string;
  filterFavorites: string;
  filterOwned: string;
  filterReset: string;
  searchPlaceholder: string;
  trackRotation: string;
  moreWeeks: (n: number) => string;
  duration: string;
  weeks: string;
  official: string;
  fixed: string;
  open: string;
  wkLive: (n: number) => string;
  now: string;
  noSeriesFound: string;
  noSeriesHint: string;
  resetFilters: string;
  mySchedule: string;
  activeWeeks: (s: number, w: number) => string;
  racingNow: string;
  past: string;
  noSchedule: string;
  noScheduleHint: string;
  removeFromSchedule: string;
  comparing: (n: number) => string;
  clearAll: string;
  filterAll: (n: number) => string;
  calendarWeek: string;
  stats: string;
  avgSof: string;
  avgDrivers: string;
  splits: string;
  raceTime: string;
  allowedCars: string;
  raceSchedule: string;
  fullCalendar: string;
  seriesInfo: string;
  seasonLabel: string;
  minLicense: string;
  teamDriving: string;
  multiclass: string;
  yes: string;
  no: string;
  free: string;
  contentOwned: string;
  missingContent: string;
  copyLink: string;
  notAffiliated: string;
  madeBy: string;
  footerDesc: string;
  project: string;
  heroTitle1: string;
  heroTitle2: string;
  heroSubtitle: string;
  openPitBoard: string;
  viewOnGithub: string;
  freeOpenSource: string;
  everythingTitle: string;
  everythingSubtitle: string;
  howItWorksTitle: string;
  howItWorksSubtitle: string;
  faqTitle: string;
  readyTitle: string;
  readyCta: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  faq: { q: string; a: string }[];
  seriesPerSeason: string;
  activeDrivers: string;
  trackConfigs: string;
  seasonsTracked: string;
  features: { title: string; desc: string }[];
  weekChangedTitle: string;
  weekLabel: string;
  weekChangedScheduled: (n: number) => string;
  weekChangedNoSchedule: string;
  yourSchedule: string;
  racingThisWeek: string;
  memberSince: string;
  statsPerCategory: string;
  catRoad: string;
  catOval: string;
  catDirtRoad: string;
  catDirtOval: string;
  starts: string;
  demoStatsNote: string;
  logout: string;
  eligible: string;
  myLicenseLabel: string;
  myLicenseTooltip: string;
  installTitle: string;
  installDesc: string;
  installBtn: string;
  exportIcal: string;
  exportedIcal: string;
  exportGcal: string;
  loginRedirect: string;
  loginBenefit1: string;
  loginBenefit2: string;
  loginBenefit3: string;
  loginCta: string;
  loginFinePrint: string;
}

// ── Translations ──────────────────────────────────────────────
const translations: Record<Lang, Translations> = {
  en: {
    // Nav
    openApp: "Open App",
    // Header planner
    appName: "PitBoard",
    connectIRacing: "Connect iRacing",
    support: "Support",
    favorites: "Favorites",
    myContent: "My Content",
    // Season
    season: "Season",
    loading: "Loading...",
    live: "LIVE",
    series: "series",
    // View toggle
    cards: "Cards",
    calendar: "Calendar",
    schedule: "Schedule",
    // Filters
    filterType: "Type",
    filterLicense: "License",
    filterStatus: "Status",
    filterFavorites: "Favorites",
    filterOwned: "Owned",
    filterReset: "Reset",
    searchPlaceholder: "Search series...",
    // Series card
    trackRotation: "Track Rotation",
    moreWeeks: (n: number) => `+${n} more tracks`,
    duration: "Duration",
    weeks: "Weeks",
    official: "Official",
    fixed: "Fixed",
    open: "Open",
    // Active week
    wkLive: (n: number) => `WK ${n} LIVE`,
    now: "NOW",
    // Empty state
    noSeriesFound: "No series found",
    noSeriesHint: "Try adjusting or resetting your filters.",
    resetFilters: "Reset Filters",
    // Schedule view
    mySchedule: "My Schedule",
    activeWeeks: (s: number, w: number) => `${s} series · ${w} active weeks`,
    racingNow: "RACING NOW",
    past: "Past",
    noSchedule: "No series in your schedule",
    noScheduleHint: "Click the clock icon on any series card to add it here.",
    removeFromSchedule: "Remove from schedule",
    // Compare bar
    comparing: (n: number) => `Comparing ${n} series`,
    clearAll: "Clear all",
    // Calendar view
    filterAll: (n: number) => `All (${n})`,
    calendarWeek: "Week",
    // Detail panel
    stats: "Stats",
    avgSof: "Avg SOF",
    avgDrivers: "Avg Drivers",
    splits: "Splits",
    raceTime: "Race Time",
    allowedCars: "Allowed Cars",
    raceSchedule: "Race Schedule",
    fullCalendar: "Full Track Calendar",
    seriesInfo: "Series Info",
    seasonLabel: "Season",
    minLicense: "Min License",
    teamDriving: "Team Driving",
    multiclass: "Multiclass",
    yes: "Yes",
    no: "No",
    free: "FREE",
    contentOwned: "Content owned",
    missingContent: "Missing content",
    copyLink: "Copy share link",
    // Footer
    notAffiliated:
      "PitBoard · Not affiliated with iRacing.com Motorsport Simulations",
    madeBy: "Made with ♥ by Victor",
    footerDesc:
      "Season planner and schedule browser for iRacing drivers. Track rotations, license requirements, and owned content at a glance.",
    project: "Project",
    // Landing
    heroTitle1: "Plan your",
    heroTitle2: "iRacing season",
    heroSubtitle:
      "Browse every series, track rotation and schedule for the current iRacing season. Filter by license, category, and owned content.",
    openPitBoard: "Open PitBoard",
    viewOnGithub: "View on GitHub",
    freeOpenSource: "Free & open source",
    everythingTitle: "Everything you need to plan",
    everythingSubtitle:
      "No more digging through PDFs or the iRacing member site. PitBoard puts it all in one place.",
    howItWorksTitle: "How it works",
    howItWorksSubtitle: "Up and running in seconds. No setup required.",
    faqTitle: "Frequently asked questions",
    readyTitle: "Ready to race smarter?",
    readyCta:
      "Free to use. No account required to browse. Connect iRacing for the full experience.",
    // How it works steps
    step1Title: "Browse without an account",
    step1Desc:
      "Open PitBoard and immediately see every iRacing series for the current season. No login needed to explore.",
    step2Title: "Filter to your situation",
    step2Desc:
      "Use the filter bar to narrow down by license class, category, fixed/open setup, or just search by name.",
    step3Title: "Connect iRacing (optional)",
    step3Desc:
      "Link your iRacing account to see which cars and tracks you already own highlighted across every series.",
    // FAQ
    faq: [
      {
        q: "Is PitBoard free?",
        a: "Yes, completely free. PitBoard is an open source project with no ads, no subscriptions, and no paywalls.",
      },
      {
        q: "Do I need an iRacing account to use it?",
        a: "No. You can browse all series, track rotations and schedules without logging in. Connecting your account is optional and only adds owned-content highlighting.",
      },
      {
        q: "Is my iRacing password safe?",
        a: "PitBoard uses the official iRacing OAuth2 authorization flow. Your credentials go directly to iRacing — PitBoard never sees your password.",
      },
      {
        q: "How often is the data updated?",
        a: "Series and schedule data comes directly from the iRacing API and reflects the current season in real time.",
      },
      {
        q: "Which iRacing season is shown?",
        a: "The current active season is shown by default. You can switch between seasons using the selector at the top of the app.",
      },
      {
        q: "Can I share a specific series with someone?",
        a: "Yes. When you open a series detail panel, the URL updates automatically. Just copy and send the link — the panel will open directly for them.",
      },
    ],
    // Week change banner
    weekChangedTitle: "New Week",
    weekLabel: "Week",
    weekChangedScheduled: (n: number) =>
      `${n} series in your schedule racing now`,
    weekChangedNoSchedule: "New circuits this week",
    yourSchedule: "Your schedule",
    racingThisWeek: "Racing this week",
    // Driver stats
    memberSince: "Member since",
    statsPerCategory: "Stats by category",
    catRoad: "Road",
    catOval: "Oval",
    catDirtRoad: "Dirt Road",
    catDirtOval: "Dirt Oval",
    starts: "starts",
    demoStatsNote: "Demo data — connect iRacing for real stats",
    logout: "Disconnect iRacing",
    eligible: "Eligible",
    myLicenseLabel: "My License",
    myLicenseTooltip: "Mark your license to see eligible series",
    installTitle: "Install PitBoard",
    installDesc: "Add to home screen for quick access",
    installBtn: "Install",
    exportIcal: "Export .ics",
    exportedIcal: "Downloaded!",
    exportGcal: "Google Calendar",
    loginRedirect:
      "You'll be redirected to iRacing's official login page. PitBoard never sees your password.",
    loginBenefit1: "Real season schedules & track rotations",
    loginBenefit2: "See which cars & tracks you own",
    loginBenefit3: "Sync favorites across devices",
    loginCta: "Continue with iRacing",
    loginFinePrint:
      "You'll be taken to oauth.iracing.com to sign in securely. PitBoard only requests read-only access.",
    // Stats bar
    seriesPerSeason: "Series per season",
    activeDrivers: "Active drivers",
    trackConfigs: "Track configs",
    seasonsTracked: "Seasons tracked",
    // Features
    features: [
      {
        title: "Full Season Calendar",
        desc: "Browse every series, every week. Track rotations visualized clearly so you can plan ahead.",
      },
      {
        title: "Owned Content",
        desc: "Connect your iRacing account to see exactly which cars and tracks you already own.",
      },
      {
        title: "Series Stats",
        desc: "Average SOF, typical driver counts and split info so you know what level of competition to expect.",
      },
      {
        title: "License Filtering",
        desc: "Filter by your license class to only see series you're eligible for right now.",
      },
      {
        title: "Track Details",
        desc: "Every circuit for every week at a glance — including config name and start dates.",
      },
      {
        title: "Team Racing",
        desc: "Quickly identify team driving series and multi-class events for endurance planning.",
      },
    ],
  },

  es: {
    // Nav
    openApp: "Abrir App",
    // Header planner
    appName: "PitBoard",
    connectIRacing: "Conectar iRacing",
    support: "Apoyar",
    favorites: "Favoritos",
    myContent: "Mi Contenido",
    // Season
    season: "Temporada",
    loading: "Cargando...",
    live: "EN VIVO",
    series: "series",
    // View toggle
    cards: "Tarjetas",
    calendar: "Calendario",
    schedule: "Mi Horario",
    // Filters
    filterType: "Tipo",
    filterLicense: "Licencia",
    filterStatus: "Estado",
    filterFavorites: "Favoritos",
    filterOwned: "Propios",
    filterReset: "Limpiar",
    searchPlaceholder: "Buscar series...",
    // Series card
    trackRotation: "Rotación de circuitos",
    moreWeeks: (n: number) => `+${n} más`,
    duration: "Duración",
    weeks: "Semanas",
    official: "Oficial",
    fixed: "Fijo",
    open: "Libre",
    // Active week
    wkLive: (n: number) => `SEM ${n} EN VIVO`,
    now: "AHORA",
    // Empty state
    noSeriesFound: "Sin resultados",
    noSeriesHint: "Prueba a ajustar o limpiar los filtros.",
    resetFilters: "Limpiar filtros",
    // Schedule view
    mySchedule: "Mi Horario",
    activeWeeks: (s: number, w: number) => `${s} series · ${w} semanas activas`,
    racingNow: "CORRIENDO AHORA",
    past: "Pasada",
    noSchedule: "No hay series en tu horario",
    noScheduleHint:
      "Pulsa el icono del reloj en cualquier tarjeta para añadirla aquí.",
    removeFromSchedule: "Quitar del horario",
    // Compare bar
    comparing: (n: number) => `Comparando ${n} series`,
    clearAll: "Limpiar todo",
    // Calendar view
    filterAll: (n: number) => `Todas (${n})`,
    calendarWeek: "Semana",
    // Detail panel
    stats: "Estadísticas",
    avgSof: "SOF Medio",
    avgDrivers: "Pilotos Medios",
    splits: "Splits",
    raceTime: "Tiempo Carrera",
    allowedCars: "Coches Permitidos",
    raceSchedule: "Horario de Carreras",
    fullCalendar: "Calendario Completo",
    seriesInfo: "Info de Serie",
    seasonLabel: "Temporada",
    minLicense: "Licencia Mín.",
    teamDriving: "Conducción en Equipo",
    multiclass: "Multiclase",
    yes: "Sí",
    no: "No",
    free: "GRATIS",
    contentOwned: "Contenido propio",
    missingContent: "Contenido no comprado",
    copyLink: "Copiar enlace",
    // Footer
    notAffiliated:
      "PitBoard · No afiliado a iRacing.com Motorsport Simulations",
    madeBy: "Hecho con ♥ por Victor",
    footerDesc:
      "Planificador de temporada y explorador de calendarios para pilotos de iRacing. Rotaciones de circuitos, licencias y contenido propio de un vistazo.",
    project: "Proyecto",
    // Landing
    heroTitle1: "Planifica tu",
    heroTitle2: "temporada de iRacing",
    heroSubtitle:
      "Explora todas las series, rotaciones de circuitos y horarios de la temporada actual. Filtra por licencia, categoría y contenido propio.",
    openPitBoard: "Abrir PitBoard",
    viewOnGithub: "Ver en GitHub",
    freeOpenSource: "Gratis y open source",
    everythingTitle: "Todo lo que necesitas para planificar",
    everythingSubtitle:
      "Sin buscar en PDFs ni en el member site de iRacing. PitBoard lo tiene todo en un mismo lugar.",
    howItWorksTitle: "Cómo funciona",
    howItWorksSubtitle: "Listo en segundos. Sin configuración.",
    faqTitle: "Preguntas frecuentes",
    readyTitle: "¿Listo para correr mejor?",
    readyCta:
      "Gratis. Sin cuenta para explorar. Conecta iRacing para la experiencia completa.",
    // How it works steps
    step1Title: "Explora sin cuenta",
    step1Desc:
      "Abre PitBoard y ve todas las series de la temporada actual al instante. No necesitas iniciar sesión.",
    step2Title: "Filtra según tu situación",
    step2Desc:
      "Usa la barra de filtros para acotar por clase de licencia, categoría, setup fijo/libre o busca por nombre.",
    step3Title: "Conecta iRacing (opcional)",
    step3Desc:
      "Vincula tu cuenta de iRacing para ver qué coches y circuitos ya tienes destacados en cada serie.",
    // FAQ
    faq: [
      {
        q: "¿Es gratuito PitBoard?",
        a: "Sí, completamente gratis. PitBoard es un proyecto open source sin anuncios, suscripciones ni muros de pago.",
      },
      {
        q: "¿Necesito una cuenta de iRacing para usarlo?",
        a: "No. Puedes explorar todas las series, rotaciones y horarios sin iniciar sesión. Conectar tu cuenta es opcional y solo añade el marcado de contenido propio.",
      },
      {
        q: "¿Es segura mi contraseña de iRacing?",
        a: "PitBoard usa el flujo oficial OAuth2 de iRacing. Tus credenciales van directamente a iRacing — PitBoard nunca ve tu contraseña.",
      },
      {
        q: "¿Con qué frecuencia se actualizan los datos?",
        a: "Los datos de series y horarios vienen directamente de la API de iRacing y reflejan la temporada actual en tiempo real.",
      },
      {
        q: "¿Qué temporada de iRacing se muestra?",
        a: "Se muestra la temporada activa por defecto. Puedes cambiar entre temporadas con el selector en la parte superior de la app.",
      },
      {
        q: "¿Puedo compartir una serie con alguien?",
        a: "Sí. Al abrir el panel de detalle de una serie, la URL se actualiza automáticamente. Solo copia y envía el enlace.",
      },
    ],
    // Week change banner
    weekChangedTitle: "Nueva Semana",
    weekLabel: "Semana",
    weekChangedScheduled: (n: number) =>
      `${n} series de tu horario corren ahora`,
    weekChangedNoSchedule: "Nuevos circuitos esta semana",
    yourSchedule: "Tu horario",
    racingThisWeek: "Corriendo esta semana",
    // Driver stats
    memberSince: "Miembro desde",
    statsPerCategory: "Stats por categoría",
    catRoad: "Carretera",
    catOval: "Óvalo",
    catDirtRoad: "Tierra/Carretera",
    catDirtOval: "Tierra/Óvalo",
    starts: "salidas",
    demoStatsNote: "Datos demo — conecta iRacing para stats reales",
    logout: "Desconectar iRacing",
    eligible: "Elegible",
    myLicenseLabel: "Mi Licencia",
    myLicenseTooltip: "Selecciona tu licencia para ver series elegibles",
    installTitle: "Instalar PitBoard",
    installDesc: "Añadir a pantalla de inicio",
    installBtn: "Instalar",
    exportIcal: "Exportar .ics",
    exportedIcal: "¡Descargado!",
    exportGcal: "Google Calendar",
    loginRedirect:
      "Serás redirigido a la página oficial de iRacing. PitBoard nunca ve tu contraseña.",
    loginBenefit1: "Calendarios y rotaciones de circuitos en tiempo real",
    loginBenefit2: "Ver qué coches y circuitos ya tienes",
    loginBenefit3: "Sincronizar favoritos entre dispositivos",
    loginCta: "Continuar con iRacing",
    loginFinePrint:
      "Serás llevado a oauth.iracing.com para iniciar sesión de forma segura. PitBoard solo solicita acceso de lectura.",
    // Stats bar
    seriesPerSeason: "Series por temporada",
    activeDrivers: "Pilotos activos",
    trackConfigs: "Configs de circuito",
    seasonsTracked: "Temporadas",
    // Features
    features: [
      {
        title: "Calendario completo",
        desc: "Explora cada serie, cada semana. Rotaciones de circuitos visualizadas para que puedas planificar.",
      },
      {
        title: "Contenido propio",
        desc: "Conecta tu cuenta de iRacing para ver exactamente qué coches y circuitos ya tienes.",
      },
      {
        title: "Estadísticas de serie",
        desc: "SOF medio, número de pilotos y splits para saber qué nivel de competición esperar.",
      },
      {
        title: "Filtro por licencia",
        desc: "Filtra por tu clase de licencia para ver solo las series en las que puedes participar ahora.",
      },
      {
        title: "Detalles de circuito",
        desc: "Todos los circuitos de cada semana de un vistazo, incluyendo configuración y fechas de inicio.",
      },
      {
        title: "Conducción en equipo",
        desc: "Identifica rápidamente series de equipo y eventos multiclase para planificar endurances.",
      },
    ],
  },
};

// ── Context ───────────────────────────────────────────────────
interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("pitboard_lang") as Lang | null;
    if (saved === "en" || saved === "es") {
      setLangState(saved);
    } else {
      // Auto-detect from browser
      const browser = navigator.language.toLowerCase();
      const detected: Lang = browser.startsWith("es") ? "es" : "en";
      setLangState(detected);
      localStorage.setItem("pitboard_lang", detected);
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("pitboard_lang", l);
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
