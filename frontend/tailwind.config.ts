import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        black:   "#030508",
        navy:    "#060d1a",
        cyan:    "#00DCFF",
        green:   "#39FF14",
        amber:   "#FF8C00",
        red:     "#FF3A3A",
        purple:  "#7b5ea7",
        teal:    "#4fa8c7",
        glass:   "rgba(5,12,28,0.72)",
        border:  "rgba(0,220,255,0.10)",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Courier New'", "monospace"],
      },
      keyframes: {
        shimmer:    { to: { backgroundPosition: "200% center" } },
        blink:      { "50%": { opacity: "0" } },
        bergBreathe:{ "0%,100%": { boxShadow:"0 0 16px rgba(0,220,255,0.25),0 0 40px rgba(0,220,255,0.08)", filter:"brightness(1)" }, "50%": { boxShadow:"0 0 32px rgba(0,220,255,0.6),0 0 80px rgba(0,220,255,0.2)", filter:"brightness(1.4)" } },
        scanPulse:  { "0%,100%":{ opacity:"1" }, "50%":{ opacity:"0.3" } },
        flash:      { "50%":{ opacity:"0.3" } },
        freshLine:  { from:{ backgroundColor:"rgba(0,220,255,0.12)" }, to:{ backgroundColor:"transparent" } },
      },
      animation: {
        shimmer:     "shimmer 5s linear infinite",
        blink:       "blink 1.2s step-end infinite",
        bergBreathe: "bergBreathe 3.5s ease-in-out infinite",
        scanPulse:   "scanPulse 2s ease-in-out infinite",
        flash:       "flash 1.8s ease-in-out infinite",
        freshLine:   "freshLine 0.5s ease-out forwards",
      },
      backgroundSize: { "200": "200% auto" },
    },
  },
  plugins: [],
};
export default config;
