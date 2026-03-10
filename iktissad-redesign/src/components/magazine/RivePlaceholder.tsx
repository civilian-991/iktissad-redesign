import type { CSSProperties } from 'react';

// Fallback animated element for when .riv file is not available
// Shows an animated gold gradient shimmer
// Used when Rive fails to load
export function RivePlaceholder({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background:
          'linear-gradient(135deg, rgba(221,168,83,0.05) 0%, rgba(221,168,83,0.2) 50%, rgba(221,168,83,0.05) 100%)',
        backgroundSize: '200% 200%',
        animation: 'shimmer 3s ease-in-out infinite',
        ...style,
      }}
    />
  );
}
