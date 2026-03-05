/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        ink: {
          50:  '#091828',
          100: '#094067',
          200: '#122839',
          300: '#183344',
          400: '#1b3d52',
          500: '#1f4760',
          600: '#5f6c7b',
          700: '#90b4ce',
          800: '#d8eefe',
          900: '#f5f7fa',
          950: '#fffffe',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover:   'rgb(var(--accent-hover) / <alpha-value>)',
          dark:    'rgb(var(--accent-dark) / <alpha-value>)',
        },
        success: '#166534',
        warning: '#92400e',
        danger:  '#ef4565',
      },
      animation: {
        'fade-in':       'fadeIn 0.22s ease-out both',
        'slide-up':      'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-right':'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in':      'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
        // Anime.js inspired spring animations
        'spring-in':     'springIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'spring-up':     'springUp 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'stagger-fade':  'staggerFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'counter-pop':   'counterPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'glow-pulse':    'glowPulse 2.5s ease-in-out infinite',
        'float':         'float 3s ease-in-out infinite',
        'slide-in-left': 'slideInLeft 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        fadeIn:       { from: { opacity: 0 },                                        to: { opacity: 1 } },
        slideUp:      { from: { opacity: 0, transform: 'translateY(10px)' },          to: { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: 0, transform: 'translateX(16px)' },          to: { opacity: 1, transform: 'translateX(0)' } },
        scaleIn:      { from: { opacity: 0, transform: 'scale(0.97) translateY(4px)' }, to: { opacity: 1, transform: 'scale(1) translateY(0)' } },
        // Anime.js spring keyframes
        springIn: {
          from: { opacity: 0, transform: 'scale(0.88) translateY(24px)', filter: 'blur(4px)' },
          to:   { opacity: 1, transform: 'scale(1) translateY(0)',        filter: 'blur(0)' },
        },
        springUp: {
          from: { opacity: 0, transform: 'translateY(20px) scale(0.95)' },
          '60%': { transform: 'translateY(-4px) scale(1.02)' },
          to:   { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        staggerFade: {
          from: { opacity: 0, transform: 'translateY(14px) scale(0.96)' },
          to:   { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        counterPop: {
          from: { opacity: 0, transform: 'scale(0.5) translateY(10px)' },
          '65%': { transform: 'scale(1.12) translateY(-2px)' },
          to:   { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--accent) / 0.35)' },
          '50%':       { boxShadow: '0 0 0 8px rgb(var(--accent) / 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-6px)' },
        },
        slideInLeft: {
          from: { opacity: 0, transform: 'translateX(-20px)' },
          to:   { opacity: 1, transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
