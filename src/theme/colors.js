import { theme } from './theme';

export const palette = {
  light: theme.light.colors,
  dark: theme.dark.colors,
};

export const getColors = (mode = 'light') => palette[mode] || palette.light;
