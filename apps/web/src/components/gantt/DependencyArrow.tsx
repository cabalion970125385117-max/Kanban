interface DependencyArrowProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export function DependencyArrow({ fromX, fromY, toX, toY }: DependencyArrowProps) {
  const midX = (fromX + toX) / 2;
  const d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

  return (
    <g>
      <defs>
        <marker
          id="dep-arrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L6,3 z" fill="var(--color-text-muted)" />
        </marker>
      </defs>
      <path
        d={d}
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        markerEnd="url(#dep-arrow)"
        opacity={0.6}
      />
    </g>
  );
}
