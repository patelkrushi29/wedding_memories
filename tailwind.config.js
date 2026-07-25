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
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'Menlo', 'monospace'],
      },
      colors: {
        ink: '#15100D',
        pitch: '#0C0907',
        plate: '#1F1815',
        veil: '#2E2622',
        paper: '#F6EFE6',
        ash: '#A39287',
        dim: '#6E625B',
        halide: {
          DEFAULT: '#7ECFC2',
          deep: '#2A4B47',
        },
      },
      borderRadius: {
        card: '14px',
        panel: '22px',
        sheet: '30px',
      },
    },
  },
  plugins: [],
};
