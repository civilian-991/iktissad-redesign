/**
 * GrainFilter — Hidden SVG filter for paper grain texture.
 *
 * Usage:
 *   1. Render <GrainFilter /> once anywhere in the document (e.g. inside ReaderClient).
 *   2. Apply `filter: url(#paper-grain)` to any element you want to grain.
 *
 * The filter uses feTurbulence (fractalNoise) + feColorMatrix (desaturate) +
 * feBlend (multiply) to produce a subtle paper texture at very low opacity.
 */
export default function GrainFilter() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        visibility: 'hidden',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="paper-grain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          {/* Generate fractal noise base */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
            result="noise"
          />
          {/* Desaturate to grey */}
          <feColorMatrix
            type="saturate"
            values="0"
            in="noise"
            result="greyNoise"
          />
          {/* Blend with source graphic using multiply mode */}
          <feBlend
            in="SourceGraphic"
            in2="greyNoise"
            mode="multiply"
            result="blended"
          />
          {/* Composite back over original to preserve alpha */}
          <feComposite in="blended" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}
