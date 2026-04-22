export type SeasonKey =
  | 'default'
  | 'navidad'
  | 'pascua'
  | 'dia_muertos'
  | 'dia_trabajo';

export interface BrandLogo {
  name: string;
  src: string;
  width?: number;
}

export interface LoginTheme {
  key: SeasonKey;
  title: string;
  subtitle: string;
  accent: string;
  panelBg: string;
  textPrimary: string;
  textSecondary: string;
  backgroundImage: string;
  overlay: string;
  estiaLogo: string;
  estiaLogoWidth: number;
  brandLogos: BrandLogo[];
}

const buildLogos = (season: SeasonKey): BrandLogo[] => [
  { name: 'Palestra', src: `/assets/logos/${season}/palestra.png`, width: 110 },
  { name: 'Machete', src: `/assets/logos/${season}/machete.png`, width: 110 },
  { name: 'Workaholic', src: `/assets/logos/${season}/workaholic.png`, width: 130 },
];

export const loginThemes: Record<SeasonKey, LoginTheme> = {
  default: {
    key: 'default',
    title: 'Grupo Workaholic',
    subtitle: 'Acceso multiempresa',
    accent: '#caa36b',
    panelBg: 'rgba(0,0,0,0.5)',
    textPrimary: '#ffffff',
    textSecondary: '#cccccc',
    backgroundImage: '/assets/login/default/background.jpg',
    overlay: 'rgba(5,8,12,0.6)',
    estiaLogo: '/assets/logos/default/estia.png',
    estiaLogoWidth: 85,
    brandLogos: buildLogos('default'),
  },

  navidad: {
    key: 'navidad',
    title: 'Grupo Workaholic',
    subtitle: 'Temporada navideña',
    accent: '#d4af37',
    panelBg: 'rgba(0,0,0,0.5)',
    textPrimary: '#ffffff',
    textSecondary: '#dddddd',
    backgroundImage: '/assets/login/navidad/background.jpg',
    overlay: 'rgba(16,8,8,0.58)',
    estiaLogo: '/assets/logos/navidad/estia.png',
    estiaLogoWidth: 75,
    brandLogos: buildLogos('navidad'),
  },

  pascua: {
    key: 'pascua',
    title: 'Grupo Workaholic',
    subtitle: 'Temporada de pascua',
    accent: '#b794f4',
    panelBg: 'rgba(0,0,0,0.5)',
    textPrimary: '#ffffff',
    textSecondary: '#dddddd',
    backgroundImage: '/assets/login/pascua/background.jpg',
    overlay: 'rgba(11,10,18,0.5)',
    estiaLogo: '/assets/logos/pascua/estia.png',
    estiaLogoWidth: 75,
    brandLogos: buildLogos('pascua'),
  },

  dia_muertos: {
    key: 'dia_muertos',
    title: 'Grupo Workaholic',
    subtitle: 'Día de Muertos',
    accent: '#f59e0b',
    panelBg: 'rgba(0,0,0,0.5)',
    textPrimary: '#ffffff',
    textSecondary: '#dddddd',
    backgroundImage: '/assets/login/dia_muertos/background.jpg',
    overlay: 'rgba(12,7,14,0.66)',
    estiaLogo: '/assets/logos/dia_muertos/estia.png',
    estiaLogoWidth: 75,
    brandLogos: buildLogos('dia_muertos'),
  },

  dia_trabajo: {
    key: 'dia_trabajo',
    title: 'Grupo Workaholic',
    subtitle: 'Día del Trabajo',
    accent: '#60a5fa',
    panelBg: 'rgba(0,0,0,0.5)',
    textPrimary: '#ffffff',
    textSecondary: '#dddddd',
    backgroundImage: '/assets/login/dia_trabajo/background.jpg',
    overlay: 'rgba(7,11,18,0.58)',
    estiaLogo: '/assets/logos/dia_trabajo/estia.png',
    estiaLogoWidth: 75,
    brandLogos: buildLogos('dia_trabajo'),
  },
};

// 🔧 SOLO CAMBIA ESTA LÍNEA CUANDO QUIERAS CAMBIAR TEMA
export const activeLoginTheme: SeasonKey = 'default';
