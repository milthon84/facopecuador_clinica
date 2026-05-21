import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Paleta solicitada: dorado, blanco, lila, negro
        gold: {
          DEFAULT: "#C9A961",
          50: "#FBF7EE",
          100: "#F5ECD3",
          200: "#EBD9A7",
          300: "#E0C57B",
          400: "#D6B25F",
          500: "#C9A961",
          600: "#A88940",
          700: "#7E6730",
          800: "#544420",
          900: "#2A2210",
        },
        lilac: {
          DEFAULT: "#B19CD9",
          50: "#F5F1FB",
          100: "#EAE2F6",
          200: "#D6C6EE",
          300: "#C2A9E5",
          400: "#B19CD9",
          500: "#9A7EC9",
          600: "#7E5DB4",
          700: "#604390",
          800: "#412D63",
          900: "#251A38",
        },
        ink: {
          DEFAULT: "#0F0F0F",
          900: "#0F0F0F",
          800: "#1F1F1F",
          700: "#2D2D2D",
          600: "#3D3D3D",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
