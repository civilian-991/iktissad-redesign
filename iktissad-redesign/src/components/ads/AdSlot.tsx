'use client';

import { useEffect, useRef } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    googletag: any;
  }
}

type AdSize = [number, number] | 'fluid';

interface AdSlotProps {
  /**
   * Full GAM ad unit path including network code.
   * Example: "/21775744923/iktissad/homepage-leaderboard"
   */
  slotPath: string;
  /**
   * One or more ad sizes to request.
   * Example: [[728, 90]] or [[300, 250], [336, 280]]
   */
  sizes: AdSize | AdSize[];
  /**
   * Unique div ID — must be unique per page render.
   * Convention: "gpt-slot-{position}" e.g. "gpt-slot-header"
   */
  id: string;
  className?: string;
}

/**
 * Renders a single Google Ad Manager ad slot.
 * Requires the GPT script to be loaded globally (done in layout.tsx).
 *
 * Usage:
 *   <AdSlot
 *     slotPath="/21775744923/iktissad/sidebar"
 *     sizes={[[300, 250], [336, 280]]}
 *     id="gpt-slot-sidebar"
 *   />
 */
export default function AdSlot({ slotPath, sizes, id, className }: AdSlotProps) {
  const slotRef = useRef<any>(null);

  useEffect(() => {
    const gt = window.googletag;
    if (!gt) return;

    gt.cmd.push(() => {
      const slot = gt.defineSlot(slotPath, sizes, id);
      if (!slot) return;
      slot.addService(gt.pubads());
      slotRef.current = slot;
      gt.display(id);
    });

    return () => {
      if (slotRef.current) {
        gt.cmd.push(() => {
          gt.destroySlots([slotRef.current]);
          slotRef.current = null;
        });
      }
    };
  }, [id, slotPath, sizes]);

  return <div id={id} className={className} />;
}
