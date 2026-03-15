import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePullToRefresh } from '../usePullToRefresh';

describe('usePullToRefresh', () => {
  let containerEl: HTMLDivElement;

  beforeEach(() => {
    // Create a container element for the hook to attach listeners
    containerEl = document.createElement('div');
    document.body.appendChild(containerEl);
  });

  afterEach(() => {
    document.body.removeChild(containerEl);
  });

  it('initializes with pull distance 0 and isPulling false', () => {
    const { result } = renderHook(() => usePullToRefresh(containerEl, vi.fn()));
    expect(result.current.pullDistance).toBe(0);
    expect(result.current.isPulling).toBe(false);
  });

  it('tracks pull distance as user drags down from top', () => {
    const mockOnRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh(containerEl, mockOnRefresh));

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
    expect(result.current.pullDistance).toBe(25);
  });

  it('sets isPulling to true when pull distance exceeds 64px threshold', () => {
    const mockOnRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh(containerEl, mockOnRefresh));

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
    const { result } = renderHook(() => usePullToRefresh(containerEl, mockOnRefresh));

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

  it('resets pull distance and isPulling on touchend', () => {
    const mockOnRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh(containerEl, mockOnRefresh));

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

    expect(result.current.pullDistance).toBe(0);
    expect(result.current.isPulling).toBe(false);
  });
});
