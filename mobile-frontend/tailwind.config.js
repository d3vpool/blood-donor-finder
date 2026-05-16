/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#ff5a3c',
        darkLayout: '#000000',
        darkHeaderBorder: '#1a1a1a',
        darkCard: '#1e1e1e',
        darkSubCard: '#2a2a2a',
        darkBorder: '#333333',
        grayText: '#cccccc',
        lightGrayText: '#888888',
        lightCard: '#f5f5f5',
        footerBg: '#0a0a0a',
        footerContactBg: '#1a0a0a',
        footerContactBorder: '#300a0a'
      }
    },
  },
  plugins: [],
}
