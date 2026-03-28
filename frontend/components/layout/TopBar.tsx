"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface TopBarProps {
  onMatch?: () => void;
  onInject?: () => void;
}

export default function TopBar({ onMatch, onInject }: TopBarProps) {
  const [clock, setClock] = useState("--:--:-- UTC");
  const [stealth, setStealth] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const tick = () => setClock(new Date().toISOString().slice(11, 19) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Stealth overlay managed here so it works on every page
  return (
    <>
      {/* Global stealth overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 998, pointerEvents: "none",
        background: stealth ? "rgba(0,0,0,0.94)" : "rgba(0,0,0,0)",
        transition: "background 0.6s ease",
      }} />

      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", borderBottom: "1px solid rgba(0,220,255,0.10)",
        background: "rgba(3,5,8,0.97)", position: "relative", zIndex: 999,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* Live dot */}
          <div style={{
            width: 6, height: 6, borderRadius: "50%", background: "#39FF14",
            boxShadow: "0 0 8px #39FF14",
            animation: "blink 1.2s step-end infinite",
          }} />
          {/* Logo */}
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <div className="shimmer-text" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 5, textTransform: "uppercase" }}>
              PHANTOM POOL · v2.0
            </div>
          </Link>
          {/* Nav links */}
          <nav style={{ display: "flex", gap: 16 }}>
            {[
              { href: "/",          label: "MARKETS"  },
              { href: "/dashboard", label: "TERMINAL" },
              { href: "/trade",     label: "TRADE"    },
              { href: "/tron",      label: "TRON"     },
            ].map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} style={{
                  fontSize: 8, letterSpacing: 2, textTransform: "uppercase",
                  color: active ? "#00DCFF" : "rgba(0,220,255,0.4)",
                  textDecoration: "none", transition: "color 0.2s",
                  textShadow: active ? "0 0 8px rgba(0,220,255,0.5)" : "none",
                }}>{label}</Link>
              );
            })}
          </nav>
          {/* Clock */}
          <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(0,220,255,0.35)" }}>{clock}</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {/* INJECT ORDER */}
          <TopBtn
            label="+ INJECT ORDER"
            color="#FF8C00"
            borderColor="rgba(255,140,0,0.3)"
            onClick={onInject ?? (() => router.push("/trade"))}
          />
          {/* DARK MATCH */}
          <TopBtn
            label="DARK MATCH"
            color="#00DCFF"
            borderColor="rgba(0,220,255,0.3)"
            onClick={onMatch ?? (() => router.push("/dashboard"))}
          />
          {/* STEALTH */}
          <TopBtn
            label={stealth ? "● VISIBLE" : "⬛ STEALTH"}
            color="#7b5ea7"
            borderColor="rgba(123,94,167,0.4)"
            active={stealth}
            onClick={() => setStealth(s => !s)}
          />
        </div>
      </header>
    </>
  );
}

function TopBtn({ label, color, borderColor, onClick, active }: {
  label: string; color: string; borderColor: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      fontSize: 8, letterSpacing: 2, padding: "4px 10px",
      border: `1px solid ${active ? color : borderColor}`,
      borderRadius: 2, color, background: active ? `${color}15` : "transparent",
      cursor: "pointer", textTransform: "uppercase", fontFamily: "inherit",
      transition: "all 0.2s",
      boxShadow: active ? `0 0 10px ${color}44` : "none",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = `${color}15`;
      e.currentTarget.style.boxShadow = `0 0 10px ${color}44`;
    }}
    onMouseLeave={e => {
      if (!active) {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.boxShadow = "none";
      }
    }}
    >{label}</button>
  );
}
