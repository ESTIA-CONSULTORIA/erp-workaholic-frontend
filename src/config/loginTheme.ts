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
  overlay: string;
  estiaLogo: string;
  estiaLogoWidth: number;
  showSeasonBadge: boolean;
  seasonBadgeText?: string;
  decorativeEmoji?: string;
  brandLogos: BrandLogo[];
}

const buildLogos = (season: SeasonKey): BrandLogo[] => [
  {
    name: 'Palestra',
    src: `/assets/logos/${season}/palestra.png`,
    alt: 'Palestra',
    width: 110,
  },
  {
    name: 'Machete',
    src: `/assets/logos/${season}/machete.png`,
    alt: 'Machete',
    width: 110,
  },
  {
    name: 'Workaholic',
    src: `/assets/logos/${season}/workaholic.png`,
    alt: 'Workaholic',
    width: 130,
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
    backgroundImage: '/assets/login/default/background.jpg',
    overlay: 'rgba(5,8,12,0.62)',
    estiaLogo: '/assets/logos/default/estia.png',
    estiaLogoWidth: 84,
    showSeasonBadge: false,
    brandLogos: buildLogos('default'),
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
    backgroundImage: '/assets/login/navidad/background.jpg',
    overlay: 'rgba(16,8,8,0.58)',
    estiaLogo: '/assets/logos/navidad/estia.png',
    estiaLogoWidth: 78,
    showSeasonBadge: true,
    seasonBadgeText: 'Especial navideño',
    decorativeEmoji: '🎄',
    brandLogos: buildLogos('navidad'),
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
    backgroundImage: '/assets/login/pascua/background.jpg',
    overlay: 'rgba(11,10,18,0.5)',
    estiaLogo: '/assets/logos/pascua/estia.png',
    estiaLogoWidth: 78,
    showSeasonBadge: true,
    seasonBadgeText: 'Especial de pascua',
    decorativeEmoji: '🐣',
    brandLogos: buildLogos('pascua'),
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
    backgroundImage: '/assets/login/dia_muertos/background.jpg',
    overlay: 'rgba(12,7,14,0.66)',
    estiaLogo: '/assets/logos/dia_muertos/estia.png',
    estiaLogoWidth: 78,
    showSeasonBadge: true,
    seasonBadgeText: 'Día de Muertos',
    decorativeEmoji: '💀',
    brandLogos: buildLogos('dia_muertos'),
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
    backgroundImage: '/assets/login/dia_trabajo/background.jpg',
    overlay: 'rgba(7,11,18,0.58)',
    estiaLogo: '/assets/logos/dia_trabajo/estia.png',
    estiaLogoWidth: 78,
    showSeasonBadge: true,
    seasonBadgeText: 'Día del Trabajo',
    decorativeEmoji: '⚒️',
    brandLogos: buildLogos('dia_trabajo'),
  },
};

// 🔧 CAMBIAS SOLO ESTA LÍNEA PARA FORZAR TEMPORADA
export const activeLoginTheme: SeasonKey = 'default';
