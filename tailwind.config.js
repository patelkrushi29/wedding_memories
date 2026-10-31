/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#0E0E10',
        pitch: '#000000',
        plate: { DEFAULT: '#1C1B1E', 2: '#242327' },
        veil: '#34323A',
        paper: '#F5F2EC',
        ash: '#A8A39A',
        dim: '#858077',
        accent: {
          DEFAULT: '#F4B23E',
          ink: '#0E0E10',
          deep: '#3A2C12',
        },
      },
      borderRadius: {
        card: '20px',
        panel: '24px',
        sheet: '28px',
      },
    },
  },
  plugins: [],
};
