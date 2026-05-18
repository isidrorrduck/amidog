export const colors = {
  background: '#f6f8f6',
  surface: '#ffffff',
  surfaceMuted: '#eef4f0',
  border: '#d9e2dc',
  text: '#17231d',
  textMuted: '#607068',
  brand: {
    50: '#edf8f2',
    100: '#d7efe1',
    500: '#26895f',
    600: '#1f6f50',
    700: '#185840',
  },
  accent: {
    50: '#fff7e8',
    500: '#d98c1f',
    600: '#b86f16',
  },
  danger: {
    50: '#fef2f2',
    600: '#dc2626',
  },
  success: {
    50: '#ecfdf5',
    600: '#059669',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: '#17231d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  raised: {
    shadowColor: '#17231d',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
};

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    display: 32,
  },
  lineHeights: {
    tight: 20,
    normal: 24,
    relaxed: 28,
    display: 38,
  },
};

export const tokens = {
  colors,
  spacing,
  radius,
  shadows,
  typography,
};
