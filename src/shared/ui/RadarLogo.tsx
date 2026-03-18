import React, { useEffect, useMemo, useState } from "react";

type Props = {
  isActive?: boolean;
  size?: number;
};

type Target = {
  radius: number;
  angle: number; // degrees
  fontSize: number;
};

const CENTER = 90;
const OUTER_RADIUS = 72;
const ROTATION_MS = 3600; // полный оборот
const SECTOR_WIDTH = 48; // ширина сектора в градусах
const INITIAL_ANGLE = -20; // стартовое положение луча

const targets: Target[] = [
  { radius: 35, angle: -18, fontSize: 22 },
  { radius: 19, angle: 138, fontSize: 12 },
  { radius: 58, angle: 45, fontSize: 17 },
  { radius: 60, angle: 170, fontSize: 14 },
  { radius: 35, angle: -110, fontSize: 17 },
];

function polarToCartesian(radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(rad) * radius,
    y: CENTER + Math.sin(rad) * radius,
  };
}

function shortestAngleDiff(a: number, b: number) {
  let diff = ((a - b + 540) % 360) - 180;
  return Math.abs(diff);
}

function sectorPath(radius: number, halfAngleDeg: number) {
  const start = polarToCartesian(radius, -halfAngleDeg);
  const end = polarToCartesian(radius, halfAngleDeg);
  const largeArcFlag = halfAngleDeg * 2 > 180 ? 1 : 0;

  return [
    `M ${CENTER} ${CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

export const RadarLogo: React.FC<Props> = ({
  isActive = false,
  size = 170,
}) => {
  const [beamAngle, setBeamAngle] = useState(INITIAL_ANGLE);

  useEffect(() => {
    if (!isActive) {
      setBeamAngle(INITIAL_ANGLE);
      return;
    }

    let frameId = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - startedAt) % ROTATION_MS;
      const progress = elapsed / ROTATION_MS;
      const angle = INITIAL_ANGLE + progress * 360;
      setBeamAngle(angle);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isActive]);

  const beamTransform = useMemo(
    () => `rotate(${beamAngle} ${CENTER} ${CENTER})`,
    [beamAngle]
  );

  return (
    <div
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center shrink-0"
    >
      <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="radarBeamLineGradient" x1="0%" y1="100%" x2="0%" y2="0%">
  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.10" />
  <stop offset="55%" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="1" />
</linearGradient>

          <radialGradient id="radarCenterGlow" cx="50%" cy="50%" r="50%">
  <stop
    offset="0%"
    stopColor="hsl(var(--primary))"
    stopOpacity="1"
  />
  <stop
    offset="55%"
    stopColor="hsl(var(--primary))"
    stopOpacity="0.42"
  />
  <stop
    offset="100%"
    stopColor="hsl(var(--primary))"
    stopOpacity="0.08"
  />
</radialGradient>

          <filter id="radarGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* outer circle */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={OUTER_RADIUS}
          stroke="hsl(var(--primary))"
          strokeWidth="2.7"
          fill="none"
        />

        {/* inner circles */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r="47"
          stroke="hsl(var(--primary))"
          strokeWidth="1.05"
          fill="none"
          opacity="0.5"
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r="24"
          stroke="hsl(var(--primary))"
          strokeWidth="0.9"
          fill="none"
          opacity="0.36"
        />

        {/* axes */}
        <line
          x1="18"
          y1={CENTER}
          x2="162"
          y2={CENTER}
          stroke="hsl(var(--primary))"
          strokeWidth="0.9"
          opacity="0.18"
        />
        <line
          x1={CENTER}
          y1="18"
          x2={CENTER}
          y2="162"
          stroke="hsl(var(--primary))"
          strokeWidth="0.9"
          opacity="0.18"
        />

        {/* центр — усиленный */}
<circle
  cx={CENTER}
  cy={CENTER}
  r="13"
  fill="hsl(var(--primary) / 0.10)"
  filter="url(#radarGlow)"
/>

<circle
  cx={CENTER}
  cy={CENTER}
  r="8.5"
  fill="url(#radarCenterGlow)"
/>

<circle
  cx={CENTER}
  cy={CENTER}
  r="5.8"
  fill="hsl(var(--primary) / 0.85)"
/>

<circle
  cx={CENTER}
  cy={CENTER}
  r="3.2"
  fill="hsl(var(--primary))"
/>

        {/* ruble targets */}
        {targets.map((target, i) => {
          const pos = polarToCartesian(target.radius, target.angle);
          const diff = shortestAngleDiff(beamAngle, target.angle);

          // подсветка зависит от реального угла луча
          const spread = 15;
          const t = Math.max(0, 1 - diff / spread);
          const opacity = isActive ? 0.06 + t * 0.94 : 0.22;
          const glow = isActive ? t * 10 : 0;

          return (
            <text
              key={i}
              x={pos.x}
              y={pos.y}
              fontSize={target.fontSize}
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="hsl(var(--primary))"
              opacity={opacity}
              style={{
  filter:
    glow > 0
      ? `
        drop-shadow(0 0 ${glow * 0.6}px rgba(255, 191, 0, 0.95))
        drop-shadow(0 0 ${glow * 1.2}px rgba(255, 191, 0, 0.75))
        drop-shadow(0 0 ${glow * 2}px rgba(255, 191, 0, 0.45))
      `
      : "none",
}}
            >
              ₽
            </text>
          );
        })}

        {/* rotating sector + beam */}
<g transform={beamTransform}>
  {/* широкий внешний сектор */}
  <path
    d={sectorPath(OUTER_RADIUS - 1, 24)}
    fill="hsl(var(--primary))"
    opacity="0.07"
    filter="url(#radarGlow)"
  />

  {/* средний сектор плотнее */}
  <path
    d={sectorPath(73, 20)}
    fill="hsl(var(--primary))"
    opacity="0.11"
    filter="url(#radarGlow)"
  />

  {/* внутренний сектор ещё ярче */}
  <path
    d={sectorPath(47, 20)}
    fill="hsl(var(--primary))"
    opacity="0.16"
    filter="url(#radarGlow)"
  />

  {/* яркая грань сектора = сам луч */}
  <line
    x1={CENTER}
    y1={CENTER}
    x2={CENTER}
    y2={CENTER - (OUTER_RADIUS - 2)}
    stroke="url(#radarBeamLineGradient)"
    strokeWidth="8"
    strokeLinecap="round"
    filter="url(#radarGlow)"
  />

  
</g>
      </svg>
    </div>
  );
};