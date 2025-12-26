/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        loteca: {
          green: '#009045', // Verde Caixa
          yellow: '#F4C900', // Amarelo Caixa
          dark: '#1a1a1a',
        }
      }
    },
  },
  plugins: [],
}