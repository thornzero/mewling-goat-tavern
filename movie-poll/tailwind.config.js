/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.go",
    "./static/**/*.html",
    "./static/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'goat': {
          300: '#a0a0a0',
          400: '#9ca3af',
          500: '#404040',
          600: '#404040',
          700: '#2d2d2d',
          800: '#2d2d2d',
          900: '#1a1a1a',
        },
        'tavern': {
          300: '#f0d75a',
          400: '#e6c547',
          500: '#d4af37',
          600: '#b8941f',
        }
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      },
      keyframes: {
        spin: {
          'to': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
}
