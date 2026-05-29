interface MilestoneDiamondProps {
  cx: number;
  cy: number;
  size?: number;
  colour?: string;
  label?: string;
  onClick?: () => void;
}

export function MilestoneDiamond({
  cx,
  cy,
  size = 14,
  colour = '#E07B2A',
  label,
  onClick,
}: MilestoneDiamondProps) {
  const half = size / 2;
  const points = `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`;

  return (
    <g
      className={onClick ? 'cursor-pointer' : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <polygon
        points={points}
        fill={colour}
        stroke="white"
        strokeWidth={1.5}
      />
      {label && (
        <text
          x={cx + half + 4}
          y={cy + 4}
          fontSize={11}
          fill="var(--color-text)"
          className="select-none"
        >
          {label.length > 18 ? label.slice(0, 17) + '…' : label}
        </text>
      )}
    </g>
  );
}
