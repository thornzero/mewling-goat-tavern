module.exports = {
  content: [
    "../index.html",
    "../js/script.js",
    "../**/*.{html,js}"
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
