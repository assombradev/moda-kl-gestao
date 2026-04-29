"use client";

/**
 * Logo estática com monograma "KL" e brilho rosa-coral sutil.
 */
export function FloatingLogo({ size = 48 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Brilho rosa-coral atrás do logo */}
      <div
        className="absolute inset-0 rounded-full bg-primary/30 blur-xl"
        style={{ width: size * 1.5, height: size * 1.5, left: -(size * 0.25), top: -(size * 0.25) }}
      />
      {/* Monograma KL com estilo serifado */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <text
          x="50%"
          y="54%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "22px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
          }}
        >
          KL
        </text>
      </svg>
    </div>
  );
}
