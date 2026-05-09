export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6C3483",
          primary: "#6C3483",
          dark: "#5B2C6F",
          bright: "#8E44AD",
          soft: "#9B59B6",
          deep: "#7D3C98",
          lbg: "#f5e6fb",
          burnt: "#65237f",
        },
        pine: {
          lbg: "#ecfdf5",
          soft: "#34d399",
          50: "#ecfdf5", // your value
          100: "#d1fae5", // your value
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669", // your value
          700: "#047857", // your value
          800: "#065f46",
          900: "#064e3b", // your value
        },
        olive: {
          lbg: "#f0ffce",
          primary: "#84cc16",
          dark: "#65a30d",
          light: "#bef264",
          deep: "#4d7c0f",
          soft: "#a3e635",
          50: "#ecf7d4",
          100: "#ecfccb",
          200: "#d9f99d",
          300: "#bef264",
          400: "#a3e635",
          500: "#84cc16", // your value
          600: "#65a30d", // your value
          700: "#4d7c0f", // your value
          800: "#3f6212",
          900: "#365314",
        },
        pink: {
          lbg: "#faebf2",
          primary: "#E84393",
          dark: "#D81B60",
          light: "#FF6FB5",
          deep: "#C2185B",
          soft: "#F8BBD0",
        },
        teal: {
          lbg: "rgb(218, 255, 251)",
          primary: "#1ABC9C",
          dark: "#117A65",
          muted: "#16A085",
          light: "#48C9B0",
          soft: "#A2D9CE",
        },
        green: {
          lbg: "#c6f9db",
          bright: "#2ECC71",
          dark: "#27AE60",
          deep: "#0E6655",
          light: "#7DCEA0",
          soft: "#a0f4c3",
        },
        blue: {
          lbg: "#D6EAF8",
          primary: "#3C8DBC",
          bright: "#3498DB",
          medium: "#2E86C1",
          dark: "#1F618D",
          light: "#85C1E9",
          soft: "#96caec",
        },
        yellow: {
          lbg: "#fef7dc",
          primary: "#F1C40F",
          gold: "#F39C12",
          google: "#F4B400",
          light: "#F7DC6F",
          dark: "#D4AC0D",
          soft: "#F9E79F",
        },
        orange: {
          lbg: "#ffedd5",
          primary: "#E67E22",
          dark: "#D35400",
          soft: "#EB984E",
          burnt: "#CA6F1E",
        },
        red: {
          lbg: "#ffe5e5",
          primary: "#E74C3C",
          dark: "#C0392B",
          muted: "#CB4335",
          deep: "#922B21",
          soft: "#F1948A",
        },
        dark: {
          lbg: "#c2e0fe",
          primary: "#2C3E50",
          charcoal: "#2D3436",
          deepblue: "#1C2833",
          almostblack: "#17202A",
          soft: "#566573",
          dark: "#212F3D",
        },
        light: {
          white: "#FFFFFF",
          soft: "#FDFEFE",
          bg: "#F8F9F9",
          ui: "#EAEAEA",
          border: "#D5D8DC",
          muted: "#CCD1D1",
          lbg: "#F5F8F9",
        },
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.75s ease-out forwards",
      },
    },
  },
  plugins: [],
};
