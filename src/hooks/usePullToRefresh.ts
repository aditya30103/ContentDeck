import { useState, useEffect, useRef, useCallback } from 'react';
import { useMotionValue, type MotionValue } from 'framer-motion';

interface UsePullToRefreshReturn {
  pullDistance: MotionValue<number>;
  isPulling: boolean;
  isRefreshing: boolean;
}

/**
 * Hook for pull-to-refresh gesture on mobile.
 * Tracks touch events on a container, calculates pull distance,
 * and triggers callback when user pulls past 64px threshold.
 */
export function usePullToRefresh(
  scrollRef: React.RefObject<HTMLElement>,
  onRefresh: () => void | Promise<void>,
): UsePullToRefreshReturn {
  const [isPulling, setPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const pullDistance = useMotionValue(0);
  const THRESHOLD = 64; // pixels
  const RESISTANCE = 0.5; // Resistance factor for over-pull

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    if (touch) {
      startYRef.current = touch.clientY;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!e.touches.length) return;

      const container = scrollRef.current;

      // Only track pulls from top of the page (scrollTop at 0)
      const currentScroll = (container as unknown as { scrollTop?: number })?.scrollTop || 0;
      if (currentScroll > 0) {
        pullDistanceRef.current = 0;
        setPulling(false);
        pullDistance.set(0);
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;
      const currentY = touch.clientY;
      const diff = currentY - startYRef.current;

      // Only track downward pulls
      if (diff > 0) {
        // Apply resistance curve: distance decreases in sensitivity as it gets larger
        const resistedDistance = diff * RESISTANCE;
        pullDistanceRef.current = resistedDistance;
        setPulling(resistedDistance >= THRESHOLD);
        pullDistance.set(resistedDistance);
      } else {
        pullDistanceRef.current = 0;
        setPulling(false);
        pullDistance.set(0);
      }
    },
    [scrollRef, pullDistance, THRESHOLD, RESISTANCE],
  );

  const handleTouchEnd = useCallback(() => {
    if (pullDistanceRef.current >= THRESHOLD) {
      const result = onRefresh();
      if (result && typeof result.then === 'function') {
        setIsRefreshing(true);
        void result.finally(() => setIsRefreshing(false));
      } else {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
      }
    }
    // Reset
    pullDistanceRef.current = 0;
    setPulling(false);
    pullDistance.set(0);
  }, [onRefresh, pullDistance, THRESHOLD]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    pullDistance,
    isPulling,
    isRefreshing,
  };
}
