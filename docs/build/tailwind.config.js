module.exports = {
  content: [
    "./index.html",
    "./js/**/*.{ts,js}",
    "./dist/**/*.{js,mjs}",
    "./**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        'pink': {
          500: '#ec4899',
          600: '#db2777',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      }
    },
  },
  plugins: [],
}
