export type SeasonKey =
  | 'default'
  | 'navidad'
  | 'pascua'
  | 'dia_muertos'
  | 'dia_trabajo';

export interface BrandLogo {
  name: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface LoginTheme {
  key: SeasonKey;
  title: string;
  subtitle: string;
  accent: string;
  accentSoft: string;
  panelBg: string;
  panelBorder: string;
  textPrimary: string;
  textSecondary: string;
  buttonText: string;
  backgroundImage: string;
  estiaLogo: string;
  estiaLogoWidth: number;
  showSeasonBadge: boolean;
  seasonBadgeText?: string;
  decorativeEmoji?: string;
  brandLogos: BrandLogo[];
}

const brandLogosBase: BrandLogo[] = [
  {
    name: 'Palestra',
    src: '/assets/logos/palestra.png',
    alt: 'Logo Palestra',
    width: 120,
  },
  {
    name: 'Machete',
    src: '/assets/logos/machete.png',
    alt: 'Logo Machete',
    width: 120,
  },
  {
    name: 'Workaholic',
    src: '/assets/logos/workaholic.png',
    alt: 'Logo Workaholic',
    width: 140,
  },
];

export const loginThemes: Record<SeasonKey, LoginTheme> = {
  default: {
    key: 'default',
    title: 'Grupo Workaholic',
    subtitle: 'Acceso multiempresa',
    accent: '#caa36b',
    accentSoft: 'rgba(202,163,107,0.18)',
    panelBg: 'rgba(8, 10, 14, 0.58)',
    panelBorder: 'rgba(202,163,107,0.22)',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    buttonText: '#0b0b0b',
    backgroundImage: '/assets/login/background-default.jpg',
    estiaLogo: '/assets/logos/estia.png',
    estiaLogoWidth: 110,
    showSeasonBadge: false,
    brandLogos: brandLogosBase,
  },

  navidad: {
    key: 'navidad',
    title: 'Grupo Workaholic',
    subtitle: 'Temporada navideña',
    accent: '#d4af37',
    accentSoft: 'rgba(212,175,55,0.18)',
    panelBg: 'rgba(16, 18, 24, 0.62)',
    panelBorder: 'rgba(212,175,55,0.24)',
    textPrimary: '#f8fafc',
    textSecondary: '#dbe4ee',
    buttonText: '#0b0b0b',
    backgroundImage: '/assets/login/background-navidad.jpg',
    estiaLogo: '/assets/logos/estia.png',
    estiaLogoWidth: 96,
    showSeasonBadge: true,
    seasonBadgeText: 'Especial navideño',
    decorativeEmoji: '🎄',
    brandLogos: brandLogosBase,
  },

  pascua: {
    key: 'pascua',
    title: 'Grupo Workaholic',
    subtitle: 'Temporada de pascua',
    accent: '#b794f4',
    accentSoft: 'rgba(183,148,244,0.18)',
    panelBg: 'rgba(12, 14, 20, 0.58)',
    panelBorder: 'rgba(183,148,244,0.24)',
    textPrimary: '#f8fafc',
    textSecondary: '#dbe4ee',
    buttonText: '#0b0b0b',
    backgroundImage: '/assets/login/background-pascua.jpg',
    estiaLogo: '/assets/logos/estia.png',
    estiaLogoWidth: 96,
    showSeasonBadge: true,
    seasonBadgeText: 'Especial de pascua',
    decorativeEmoji: '🐣',
    brandLogos: brandLogosBase,
  },

  dia_muertos: {
    key: 'dia_muertos',
    title: 'Grupo Workaholic',
    subtitle: 'Temporada conmemorativa',
    accent: '#f59e0b',
    accentSoft: 'rgba(245,158,11,0.18)',
    panelBg: 'rgba(14, 10, 16, 0.60)',
    panelBorder: 'rgba(245,158,11,0.24)',
    textPrimary: '#f8fafc',
    textSecondary: '#dbe4ee',
    buttonText: '#0b0b0b',
    backgroundImage: '/assets/login/background-dia-muertos.jpg',
    estiaLogo: '/assets/logos/estia.png',
    estiaLogoWidth: 96,
    showSeasonBadge: true,
    seasonBadgeText: 'Día de Muertos',
    decorativeEmoji: '💀',
    brandLogos: brandLogosBase,
  },

  dia_trabajo: {
    key: 'dia_trabajo',
    title: 'Grupo Workaholic',
    subtitle: 'Reconocimiento al esfuerzo',
    accent: '#60a5fa',
    accentSoft: 'rgba(96,165,250,0.18)',
    panelBg: 'rgba(9, 12, 18, 0.58)',
    panelBorder: 'rgba(96,165,250,0.24)',
    textPrimary: '#f8fafc',
    textSecondary: '#dbe4ee',
    buttonText: '#0b0b0b',
    backgroundImage: '/assets/login/background-dia-trabajo.jpg',
    estiaLogo: '/assets/logos/estia.png',
    estiaLogoWidth: 96,
    showSeasonBadge: true,
    seasonBadgeText: 'Día del Trabajo',
    decorativeEmoji: '⚒️',
    brandLogos: brandLogosBase,
  },
};

// Cambia aquí la temporada activa
export const activeLoginTheme: SeasonKey = 'default';
