/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#14532d',
          lime: '#84cc16',
          gold: '#fbbf24',
          cream: '#f8fafc',
          charcoal: '#0f172a',
        },
      },
      boxShadow: {
        glow: '0 10px 30px rgba(20, 83, 45, 0.18)',
      },
    },
  },
  plugins: [],
};
