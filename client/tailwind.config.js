export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        port: {
          bg:      '#0D1117',
          surface: '#161B22',
          border:  '#30363D',
          accent:  '#00C2FF',
          text:    '#F0F6FC',
          muted:   '#8B949E',
          faint:   '#4B5563',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    }
  },
  plugins: [],
}
