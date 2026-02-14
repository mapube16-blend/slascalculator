/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores extraídos del diseño de Figma
        primary: {
          DEFAULT: '#4DD4D4',  // Turquesa principal - botones, gráficas
          light: '#E0F2FE',    // Fondos de íconos
          dark: '#2BB8B8',     // Hover states
        },
        success: {
          DEFAULT: '#10B981',  // Verde - Tickets cerrados, SLA cumplido
          light: '#D1FAE5',
          dark: '#059669',
        },
        danger: {
          DEFAULT: '#EF4444',  // Rojo - Tickets abiertos, SLA incumplido
          light: '#FEE2E2',
          dark: '#DC2626',
        },
        warning: {
          DEFAULT: '#F59E0B',  // Amarillo - Tickets pendientes
          light: '#FEF3C7',
          dark: '#D97706',
        },
        info: {
          DEFAULT: '#3B82F6',  // Azul - Info
          light: '#DBEAFE',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',      // Fondo principal
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',      // Texto secundario
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',      // Texto principal
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'card': '0.75rem',    // 12px - cards
        'button': '0.5rem',   // 8px - botones
      },
    },
  },
  plugins: [],
}
