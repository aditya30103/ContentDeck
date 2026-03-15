import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type React from 'react';
import { usePullToRefresh } from '../usePullToRefresh';

describe('usePullToRefresh', () => {
  let containerEl: HTMLDivElement;
  let scrollRef: React.RefObject<HTMLElement>;

  beforeEach(() => {
    // Create a container element for the hook to attach listeners
    containerEl = document.createElement('div');
    document.body.appendChild(containerEl);
    scrollRef = { current: containerEl } as React.RefObject<HTMLElement>;
  });

  afterEach(() => {
    document.body.removeChild(containerEl);
  });

  it('initializes with pullDistance MotionValue at 0, isPulling false, isRefreshing false', () => {
    const { result } = renderHook(() => usePullToRefresh(scrollRef, vi.fn()));
    expect(result.current.pullDistance.get()).toBe(0);
    expect(result.current.isPulling).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
  });

  it('tracks pull distance as user drags down from top', () => {
    const mockOnRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh(scrollRef, mockOnRefresh));

    act(() => {
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientY: 100 } as Touch],
      });
      containerEl.dispatchEvent(touchStart);

      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientY: 150 } as Touch],
      });
      containerEl.dispatchEvent(touchMove);
    });

    // With 0.5 resistance, 50px of drag = 25px pull distance
    expect(result.current.pullDistance.get()).toBe(25);
  });

  it('sets isPulling to true when pull distance exceeds 64px threshold', () => {
    const mockOnRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh(scrollRef, mockOnRefresh));

    act(() => {
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientY: 100 } as Touch],
      });
      containerEl.dispatchEvent(touchStart);

      // Need 128px drag (0.5 resistance) to exceed 64px threshold: 128 * 0.5 = 64px
      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientY: 228 } as Touch],
      });
      containerEl.dispatchEvent(touchMove);
    });

    expect(result.current.isPulling).toBe(true);
  });

  it('calls onRefresh callback when released above 64px threshold', () => {
    const mockOnRefresh = vi.fn();
    renderHook(() => usePullToRefresh(scrollRef, mockOnRefresh));

    act(() => {
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientY: 100 } as Touch],
      });
      containerEl.dispatchEvent(touchStart);

      // Need 128px drag (0.5 resistance) to exceed 64px threshold: 128 * 0.5 = 64px
      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientY: 228 } as Touch],
      });
      containerEl.dispatchEvent(touchMove);

      const touchEnd = new TouchEvent('touchend');
      containerEl.dispatchEvent(touchEnd);
    });

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('resets pullDistance MotionValue and isPulling on touchend', () => {
    const mockOnRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh(scrollRef, mockOnRefresh));

    act(() => {
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientY: 100 } as Touch],
      });
      containerEl.dispatchEvent(touchStart);

      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientY: 150 } as Touch],
      });
      containerEl.dispatchEvent(touchMove);

      const touchEnd = new TouchEvent('touchend');
      containerEl.dispatchEvent(touchEnd);
    });

    expect(result.current.pullDistance.get()).toBe(0);
    expect(result.current.isPulling).toBe(false);
  });

  it('sets isRefreshing to true after onRefresh fires (void return)', () => {
    vi.useFakeTimers();
    const mockOnRefresh = vi.fn(() => undefined);
    const { result } = renderHook(() => usePullToRefresh(scrollRef, mockOnRefresh));

    act(() => {
      containerEl.dispatchEvent(
        new TouchEvent('touchstart', { touches: [{ clientY: 0 } as Touch] }),
      );
      containerEl.dispatchEvent(
        new TouchEvent('touchmove', { touches: [{ clientY: 130 } as Touch] }),
      );
      containerEl.dispatchEvent(new TouchEvent('touchend'));
    });

    expect(result.current.isRefreshing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isRefreshing).toBe(false);
    vi.useRealTimers();
  });

  it('does not call onRefresh if pull distance is below threshold', () => {
    const mockOnRefresh = vi.fn();
    renderHook(() => usePullToRefresh(scrollRef, mockOnRefresh));

    act(() => {
      containerEl.dispatchEvent(
        new TouchEvent('touchstart', { touches: [{ clientY: 100 } as Touch] }),
      );
      // Only 40px drag → 20px resisted distance (below 64px threshold)
      containerEl.dispatchEvent(
        new TouchEvent('touchmove', { touches: [{ clientY: 140 } as Touch] }),
      );
      containerEl.dispatchEvent(new TouchEvent('touchend'));
    });

    expect(mockOnRefresh).not.toHaveBeenCalled();
  });
});
