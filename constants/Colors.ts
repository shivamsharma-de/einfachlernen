export const Colors = {
  black: '#0d0d0d',
  bg: '#111111',
  surface: '#1a1a1a',
  surface2: '#242424',
  surface3: '#2e2e2e',
  border: '#333333',

  gold: '#f5c842',
  goldDark: '#d4a017',
  goldBg: 'rgba(245,200,66,0.1)',

  green: '#2dc653',
  greenBg: 'rgba(45,198,83,0.12)',

  red: '#e63946',
  redBg: 'rgba(230,57,70,0.1)',

  blue: '#3a86ff',
  blueBg: 'rgba(58,134,255,0.1)',

  purple: '#8338ec',
  purpleBg: 'rgba(131,56,236,0.12)',

  white: '#f5f5f0',
  textMuted: '#888888',
  textDim: '#555555',

  articleDer: '#3a86ff',
  articleDie: '#e63946',
  articleDas: '#2dc653',

  levelA1: '#4caf50',
  levelA2: '#8bc34a',
  levelB1: '#ffb300',
  levelB2: '#f5c842',
  levelC1: '#ff7043',
  levelC2: '#e91e63',
} as const;

export type ColorKey = keyof typeof Colors;
