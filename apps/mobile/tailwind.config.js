/** @type {import('tailwindcss').Config} */
// Palette lifted from the web app's manifest.json so the mobile build reads
// as the same product: #0f1419 ground, #f59e0b amber accent.
module.exports = {
  content: ['./index.ts', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ground: '#0f1419',
        surface: '#131a21',
        amber: '#f59e0b',
      },
    },
  },
  plugins: [],
};
