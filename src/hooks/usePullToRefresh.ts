import { useState, useEffect, useRef, useCallback } from 'react';
import { useMotionValue } from 'framer-motion';

interface UsePullToRefreshReturn {
  pullDistance: number;
  isPulling: boolean;
  pullY: any; // Framer Motion MotionValue
}

/**
 * Hook for pull-to-refresh gesture on mobile.
 * Tracks touch events on a container, calculates pull distance,
 * and triggers callback when user pulls past 64px threshold.
 */
export function usePullToRefresh(
  container: HTMLElement | null,
  onRefresh: () => void,
): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setPulling] = useState(false);
  const startYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const pullY = useMotionValue(0);
  const THRESHOLD = 64; // pixels
  const RESISTANCE = 0.5; // Resistance factor for over-pull

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!e.touches.length) return;
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!e.touches.length) return;

      // Only track pulls from top of the page (scrollTop at 0)
      const currentScroll = (container as any)?.scrollTop || 0;
      if (currentScroll > 0) {
        setPullDistance(0);
        pullDistanceRef.current = 0;
        setPulling(false);
        return;
      }

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      // Only track downward pulls
      if (diff > 0) {
        // Apply resistance curve: distance decreases in sensitivity as it gets larger
        const resistedDistance = diff * RESISTANCE;
        setPullDistance(resistedDistance);
        pullDistanceRef.current = resistedDistance;
        setPulling(resistedDistance >= THRESHOLD);
        pullY.set(resistedDistance);
      } else {
        setPullDistance(0);
        pullDistanceRef.current = 0;
        setPulling(false);
        pullY.set(0);
      }
    },
    [container, pullY, THRESHOLD, RESISTANCE],
  );

  const handleTouchEnd = useCallback(() => {
    if (pullDistanceRef.current >= THRESHOLD) {
      onRefresh();
    }
    // Reset
    setPullDistance(0);
    pullDistanceRef.current = 0;
    setPulling(false);
    pullY.set(0);
  }, [onRefresh, pullY, THRESHOLD]);

  useEffect(() => {
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [container, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    pullDistance,
    isPulling,
    pullY,
  };
}
