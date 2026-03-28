"use client";
import { useState, useRef, useEffect } from "react";

type MatchState = "idle" | "merging" | "merged";

interface DarkMatchEngineProps {
  onMatch?: () => void;
}

export default function DarkMatchEngine({ onMatch }: DarkMatchEngineProps) {
  const [state, setState] = useState<MatchState>("idle");
  const [showToast, setShowToast] = useState(false);
  const [rippleKey, setRippleKey] = useState(0); // increment to retrigger ripple
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function triggerMatch() {
    if (state !== "idle") return;
    clearTimers();
    setState("merging");

    timers.current.push(setTimeout(() => {
      setState("merged");
      setRippleKey(k => k + 1);
      setShowToast(true);
      onMatch?.();
    }, 600));

    timers.current.push(setTimeout(() => setShowToast(false), 3200));
    timers.current.push(setTimeout(() => { setState("idle"); }, 3400));
  }

  useEffect(() => () => clearTimers(), []);

  const isIdle    = state === "idle";
  const isMerging = state === "merging";
  const isMerged  = state === "merged";

  return (
    <>
      {/* CRT Toast */}
      {showToast && (
        <div style={{
          position: "fixed", top: 52, right: 16, zIndex: 200,
          padding: "10px 18px", background: "rgba(3,5,8,0.97)",
          border: "1px solid #FF8C00", color: "#FF8C00",
          fontSize: 9, letterSpacing: 3, textTransform: "uppercase",
          textShadow: "0 0 10px #FF8C00", boxShadow: "0 0 30px rgba(255,140,0,0.25)",
          animation: "crtFlicker 0.65s ease-out forwards",
          fontFamily: "inherit",
        }}>✓ DARK FILL EXECUTED</div>
      )}

      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        padding: "14px 16px",
        border: `1px solid ${isMerged ? "rgba(57,255,20,0.25)" : "rgba(0,220,255,0.10)"}`,
        borderRadius: 8,
        background: isMerged ? "rgba(57,255,20,0.03)" : "rgba(0,220,255,0.02)",
        transition: "all 0.4s",
      }}>
        {/* Shape arena */}
        <div style={{
          position: "relative", width: "100%", height: 44,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Double ripple — remounts on each rippleKey change */}
          {rippleKey > 0 && (
            <RipplePair key={rippleKey} />
          )}

          {/* Left shape */}
          <div style={{
            width: 22, height: 22, borderRadius: 4,
            border: `2px solid ${isMerged ? "#39FF14" : "rgba(0,220,255,0.6)"}`,
            position: "absolute",
            boxShadow: isMerged
              ? "0 0 30px #39FF14, 0 0 60px rgba(57,255,20,0.3)"
              : "0 0 12px rgba(0,220,255,0.4)",
            transform: isMerged
              ? "rotate(45deg) scale(1.35)"
              : isMerging
                ? "translateX(-3px) rotate(45deg) scale(1.1)"
                : "translateX(-22px) rotate(45deg)",
            transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1), border-color 0.3s, box-shadow 0.3s",
          }} />

          {/* Right shape */}
          <div style={{
            width: 22, height: 22, borderRadius: 4,
            border: "2px solid rgba(0,220,255,0.6)",
            boxShadow: "0 0 12px rgba(0,220,255,0.4)",
            position: "absolute",
            transform: isMerged
              ? "translateX(0) rotate(45deg) scale(0.2)"
              : isMerging
                ? "translateX(3px) rotate(45deg) scale(1.1)"
                : "translateX(22px) rotate(45deg)",
            opacity: isMerged ? 0 : 1,
            transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1), opacity 0.35s",
          }} />
        </div>

        {/* Match button */}
        <button
          onClick={triggerMatch}
          disabled={!isIdle}
          style={{
            width: "100%", padding: "9px 0",
            background: isMerged ? "rgba(57,255,20,0.06)" : "transparent",
            borderTop:   `1px solid ${isMerged ? "rgba(57,255,20,0.5)" : "rgba(57,255,20,0.3)"}`,
            borderLeft:  `1px solid ${isMerged ? "rgba(57,255,20,0.5)" : "rgba(57,255,20,0.3)"}`,
            borderRight: `1px solid ${isMerged ? "rgba(57,255,20,0.5)" : "rgba(57,255,20,0.3)"}`,
            borderBottom: isIdle ? "3px solid rgba(0,0,0,0.5)" : "1px solid rgba(0,0,0,0.5)",
            borderRadius: 8,
            color: "#39FF14",
            fontFamily: "inherit", fontSize: 9, letterSpacing: 3, textTransform: "uppercase",
            cursor: isIdle ? "pointer" : "default",
            textShadow: "0 0 8px rgba(57,255,20,0.6)",
            boxShadow: isMerged
              ? "0 0 20px rgba(57,255,20,0.2)"
              : "0 0 10px rgba(57,255,20,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
            transition: "all 0.2s",
            position: "relative", top: isIdle ? 0 : 2,
          }}
          onMouseEnter={e => { if (isIdle) e.currentTarget.style.boxShadow = "0 0 28px rgba(57,255,20,0.25)"; }}
          onMouseLeave={e => { if (isIdle) e.currentTarget.style.boxShadow = "0 0 10px rgba(57,255,20,0.06)"; }}
        >
          {isMerged ? "✓ MATCHED OFF-CHAIN" : isMerging ? "MATCHING..." : "EXECUTE DARK MATCH"}
        </button>
      </div>
    </>
  );
}

// Isolated component so remounting resets animations cleanly
function RipplePair() {
  return (
    <>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 0, height: 0, marginTop: 0, marginLeft: 0,
        borderRadius: "50%", pointerEvents: "none",
        border: "2px solid rgba(57,255,20,0.9)",
        animation: "rippleOut 0.9s ease-out forwards",
      }} />
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 0, height: 0, marginTop: 0, marginLeft: 0,
        borderRadius: "50%", pointerEvents: "none",
        border: "1.5px solid rgba(0,220,255,0.6)",
        animation: "rippleOut2 1.2s ease-out 0.15s forwards",
      }} />
    </>
  );
}
