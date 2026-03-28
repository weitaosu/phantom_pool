"use client";
import React, { useEffect, useRef, useState } from "react";

type StepState = "idle" | "active" | "done";
const STEPS = [
  { id: "s1", label: "🔐 Lock" },
  { id: "s2", label: "⚡ Verify" },
  { id: "s3", label: "🔑 Release" },
  { id: "s4", label: "✓ Settled" },
];

interface SettlementSeqProps { trigger?: number; onComplete?: () => void; }

export default function SettlementSeq({ trigger = 0, onComplete }: SettlementSeqProps) {
  const [states, setStates] = useState<StepState[]>(["idle","idle","idle","idle"]);
  const prev = useRef(0);

  useEffect(() => {
    if (trigger === 0 || trigger === prev.current) return;
    prev.current = trigger;
    setStates(["idle","idle","idle","idle"]);
    STEPS.forEach((_, i) => {
      setTimeout(() => {
        setStates(s => s.map((v, j) => j < i ? "done" : j === i ? "active" : v));
      }, i * 500);
    });
    setTimeout(() => { setStates(["done","done","done","done"]); onComplete?.(); }, STEPS.length * 500);
  }, [trigger]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
      {STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <div style={{
            flex: 1, textAlign: "center", padding: "5px 4px", borderRadius: 20,
            border: `1px solid ${states[i] === "done" ? "rgba(57,255,20,0.4)" : states[i] === "active" ? "rgba(79,168,199,0.7)" : "rgba(123,94,167,0.2)"}`,
            fontSize: 8, letterSpacing: "0.5px", whiteSpace: "nowrap",
            color: states[i] === "done" ? "#39FF14" : states[i] === "active" ? "#4fa8c7" : "rgba(180,200,220,0.4)",
            boxShadow: states[i] === "done" ? "0 0 8px rgba(57,255,20,0.15)" : states[i] === "active" ? "0 0 12px rgba(79,168,199,0.2)" : "none",
            transition: "all 0.5s",
          }}>{step.label}</div>
          {i < STEPS.length - 1 && (
            <span style={{ color: states[i] === "done" ? "rgba(57,255,20,0.5)" : "rgba(123,94,167,0.35)", fontSize: 9, transition: "color 0.5s" }}>›</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
