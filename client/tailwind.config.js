export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        port: {
          bg:       '#0A1628',
          surface:  '#0F1F3D',
          surface2: '#162B52',
          border:   '#1E3A6E',
          accent:   '#0099E6',
          accent2:  '#00C2FF',
          text:     '#F0F6FC',
          muted:    '#8BA4C4',
          faint:    '#3D5A80',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'ocean-gradient': 'linear-gradient(135deg, #0A1628 0%, #0F2547 50%, #0A1628 100%)',
      }
    }
  },
  plugins: [],
}
