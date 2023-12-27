import * as daisyui from "daisyui"

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // backgroundImage: {
      //   "custom-radial-gradient":
      //     "radial-gradient(62.24% 62.24% at 50% 50%, #1E283A 68.83%, #293344 100%)",
      // },
    },
  },
  plugins: [require("@tailwindcss/typography"), daisyui],
  daisyui: {
    themes: ["light", "dark", "cupcake"],
  },
}
