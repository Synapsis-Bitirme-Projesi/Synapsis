import type { Config } from 'tailwindcss'
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Bu satırın 'class' olduğundan emin ol
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  // ... diğer ayarlar
}
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config