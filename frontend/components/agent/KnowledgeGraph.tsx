"use client";

const NODES = [
  { id:"news",  x:20,  y:36, label:"NEWS"  },
  { id:"ai",    x:72,  y:16, label:"AI"    },
  { id:"pool",  x:116, y:40, label:"POOL"  },
  { id:"exec",  x:168, y:18, label:"EXEC"  },
  { id:"chain", x:215, y:38, label:"CHAIN" },
];
const EDGES: [string,string][] = [["news","ai"],["ai","pool"],["pool","exec"],["exec","chain"],["ai","exec"],["news","pool"]];
// Fixed durations — computed at module level so server and client produce identical HTML
const EDGE_DURS = ["2.2", "2.8", "1.9", "3.1", "2.5", "3.4"];

export default function KnowledgeGraph() {
  return (
    <div style={{ position: "relative", height: 72 }}>
      <svg viewBox="0 0 232 72" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        {/* Edges */}
        {EDGES.map(([a, b], ei) => {
          const na = NODES.find(n => n.id === a)!;
          const nb = NODES.find(n => n.id === b)!;
          const dur = EDGE_DURS[ei];
          return (
            <g key={`${a}-${b}`}>
              <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="rgba(0,180,220,0.15)" strokeWidth="1" />
              <circle r="2.5" fill="#00DCFF" opacity="0.7">
                <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={`M${na.x},${na.y} L${nb.x},${nb.y}`} />
              </circle>
            </g>
          );
        })}
        {/* Nodes */}
        {NODES.map(n => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r="7" fill="rgba(0,220,255,0.08)" stroke="rgba(0,220,255,0.4)" strokeWidth="1" />
            <text x={n.x} y={n.y + 18} textAnchor="middle" fill="rgba(0,220,255,0.4)" fontSize="6" letterSpacing="1">{n.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
