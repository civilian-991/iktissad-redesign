'use client';

import { useState } from 'react';
import { useRive } from '@rive-app/react-canvas';
import { RivePlaceholder } from './RivePlaceholder';

interface RiveCanvasProps {
  src: string;
}

/**
 * RiveCanvas — thin wrapper around useRive from @rive-app/react-canvas.
 *
 * This component exists as a separate file so it can be dynamically imported
 * by AnimatedCover, ensuring the Rive runtime (~300KB) is code-split and only
 * loaded when the animated cover is actually rendered.
 */
export default function RiveCanvas({ src }: RiveCanvasProps) {
  const [riveError, setRiveError] = useState(false);

  const { RiveComponent } = useRive({
    src,
    autoplay: true,
    onLoadError: () => setRiveError(true),
  });

  if (riveError) {
    return (
      <RivePlaceholder
        style={{
          position: 'absolute',
          inset: 0,
        }}
      />
    );
  }

  return (
    <RiveComponent
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        mixBlendMode: 'screen',
      }}
    />
  );
}
