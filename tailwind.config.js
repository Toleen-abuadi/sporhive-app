module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B1220',
        surface: '#101B31',
        border: '#22304A',
        textPrimary: '#EAF0FF',
        textMuted: '#A9B4CC',
        accentOrange: '#F97316',
      },
    },
  },
  plugins: [],
};
