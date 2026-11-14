tailwind.config = {
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        'brand-bg':     '#F8FAFC',
        'brand-orange': '#FF7A59',
        'brand-navy':   '#1E293B',
        'brand-mint':   '#34D399',
        'brand-yellow': '#FBBF24',
        'brand-red':    '#C8431F',
        'brand-terracotta': '#FF7A59',
        'brand-terracota': '#D04835',
        'brand-terracota-dark': '#B53B2B',
        'brand-mint-light': '#E8F5F3',
        'brand-cream': '#EFEAE4',
        arena: '#E8DFD8',
        'arena-light': '#F6F3F0',
        sand: '#E8DFD8',
        sandLight: '#FAF6F2',
        navy: {
          DEFAULT: '#212930',
          light: '#313C47',
          muted: '#637080'
        },
        terracota: {
          DEFAULT: '#D04836',
          dark: '#B83B2B',
          light: '#FDF0ED'
        },
        mint: {
          DEFAULT: '#228276',
          dark: '#1B6A60',
          light: '#E6F4F1'
        },
        yellowAlert: {
          DEFAULT: '#E9C46A',
          light: '#FEF9EC',
          dark: '#B08821'
        },
        yellowAccent: '#E9C46A'
      },
      borderRadius: {
        'xl-friendly':  '18px',
        '2xl-friendly': '28px'
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(33, 41, 48, 0.06), 0 2px 6px -1px rgba(33, 41, 48, 0.04)',
        'card': '0 8px 24px -4px rgba(33, 41, 48, 0.07), 0 2px 6px -1px rgba(33, 41, 48, 0.04)',
        'nav': '0 -4px 20px rgba(33, 41, 48, 0.06)'
      }
    }
  }
};
