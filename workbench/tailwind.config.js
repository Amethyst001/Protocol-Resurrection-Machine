/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class', // Use class-based dark mode strategy
  theme: {
    extend: {
      colors: {
        // Custom color palette for IDE-like appearance
        editor: {
          bg: '#1e1e1e',
          'bg-light': '#ffffff',
          sidebar: '#252526',
          'sidebar-light': '#f3f3f3',
          border: '#3e3e42',
          'border-light': '#e5e5e5',
          hover: '#2a2d2e',
          'hover-light': '#e8e8e8',
          active: '#094771',
          'active-light': '#0066cc',
        },
        // Syntax highlighting colors
        syntax: {
          keyword: '#569cd6',
          string: '#ce9178',
          number: '#b5cea8',
          comment: '#6a9955',
          function: '#dcdcaa',
          variable: '#9cdcfe',
          type: '#4ec9b0',
          error: '#f48771',
        },
        // Status colors
        status: {
          success: '#89d185',
          warning: '#cca700',
          error: '#f48771',
          info: '#75beff',
        },
      },
      // Responsive breakpoints matching common screen sizes
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        'workbench': '900px', // Custom breakpoint for workbench layout
      },
      // Custom spacing for IDE-like layouts
      spacing: {
        'toolbar': '48px',
        'statusbar': '24px',
        'sidebar': '240px',
      },
      // Custom z-index values
      zIndex: {
        'modal': '1000',
        'dropdown': '900',
        'toolbar': '800',
        'sidebar': '700',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
