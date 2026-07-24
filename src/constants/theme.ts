export const lightColors = {
  background: '#F4F8FC',
  backgroundAccent: '#E7F3FF',
  surface: '#FFFFFF',
  surfaceRaised: '#F9FCFF',
  text: '#102A43',
  textMuted: '#5D7083',
  border: '#D8E5EF',
  accent: '#0B84F3',
  accentPressed: '#086CC7',
  accentSoft: '#DCEEFF',
  mint: '#0C9F83',
  mintSoft: '#DDF7F1',
  warning: '#A85E00',
  warningSoft: '#FFF2D8',
  danger: '#C23B49',
  dangerSoft: '#FFE8EB',
  overlay: 'rgba(7, 27, 44, 0.55)',
  shadow: 'rgba(16, 42, 67, 0.12)',
} as const;

export const darkColors = {
  background: '#071B2C',
  backgroundAccent: '#0A2943',
  surface: '#0D2A42',
  surfaceRaised: '#12344E',
  text: '#F1F7FC',
  textMuted: '#AFC4D5',
  border: '#244A65',
  accent: '#49A8FF',
  accentPressed: '#79BFFF',
  accentSoft: '#153D5C',
  mint: '#52D5BC',
  mintSoft: '#123F3A',
  warning: '#FFC36A',
  warningSoft: '#493717',
  danger: '#FF8B98',
  dangerSoft: '#4C242B',
  overlay: 'rgba(0, 8, 16, 0.74)',
  shadow: 'rgba(0, 0, 0, 0.34)',
} as const;

export type AppColors = {
  [Key in keyof typeof lightColors]: string;
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  hero: 48,
} as const;

export const radii = {
  control: 14,
  card: 20,
  section: 22,
  hero: 28,
  pill: 999,
} as const;

export const shadows = {
  control: '0 3px 10px',
  card: '0 8px 24px',
  hero: '0 16px 48px',
  dialog: '0 20px 60px',
  popover: '0 12px 32px',
} as const;

export const motion = {
  duration: {
    pressIn: 100,
    pressOut: 150,
    toggle: 160,
    popover: 180,
    content: 220,
    dialog: 240,
  },
  scale: {
    pressed: 0.96,
    surfaceEnter: 0.97,
  },
  offset: {
    popover: -4,
    content: 6,
  },
  easing: {
    out: [0.23, 1, 0.32, 1],
    inOut: [0.77, 0, 0.175, 1],
  },
} as const;

export const contentMaxWidth = 960;
