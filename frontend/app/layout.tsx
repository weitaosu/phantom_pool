import type { Metadata } from "next";
import "../styles/globals.css";
import ParticleBg from "@/components/layout/ParticleBg";

export const metadata: Metadata = {
  title: "PHANTOM POOL · Dark Pool Intelligence",
  description: "Agentic dark pool for prediction markets",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ParticleBg />
        {children}
      </body>
    </html>
  );
}
