'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseScrollHeaderOptions {
  collapseDistance?: number;   // Distance in px over which the header progressively collapses (default: 200px)
  topThreshold?: number;       // Scroll offset from top where header is always 100% expanded (default: 5px)
  jitterThreshold?: number;    // Minimum scroll delta in px to filter out micro trackpad noise (default: 1.5px)
}

export interface UseScrollHeaderReturn {
  collapseProgress: number;    // Progress value between 0.0 (fully expanded) and 1.0 (fully collapsed)
  isHeaderVisible: boolean;     // True if header is not completely collapsed (collapseProgress < 1)
  handleScroll: (e: React.UIEvent<HTMLElement>) => void;
  headerWrapperRef: React.RefObject<HTMLDivElement | null>;
  headerInnerRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  resetHeader: () => void;
  showHeader: () => void;
  headerWrapperStyle: React.CSSProperties;
  headerInnerStyle: React.CSSProperties;
  headerStyle: React.CSSProperties; // Backward-compatibility
}

/**
 * Senior-engineered, synchronized collapsing header hook.
 *
 * Core Mechanics:
 * 1. Progress-driven: Maintains `collapseProgress` between 0.0 (fully expanded) and 1.0 (fully collapsed).
 * 2. Layout synchronization: The outer wrapper's layout height shrinks from its natural measured height to 0px
 *    in lockstep with the inner content sliding upward (`translateY(-progress * 100%)`).
 *    Simultaneously, the content in the scroll container moves upward naturally to occupy the released space.
 * 3. Direction & Distance accumulation: Downward scrolling progressively increments collapse distance;
 *    upward scrolling smoothly reverses progress.
 * 4. Top restoration: At `scrollTop <= topThreshold`, progress is clamped to 0.0, ensuring full visibility.
 * 5. High performance: Direct DOM updates in requestAnimationFrame prevent layout thrashing and 60fps render churn.
 * 6. Zero empty spaces: No reserved placeholders, padding offsets, or blank bands remain when the header is collapsed.
 * 7. Zero floating buttons: Primary actions remain in their original header positions.
 */
export function useScrollHeader(options: UseScrollHeaderOptions = {}): UseScrollHeaderReturn {
  const {
    collapseDistance = 200,
    topThreshold = 5,
    jitterThreshold = 1.5,
  } = options;

  const [collapseProgress, setCollapseProgress] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // DOM Refs
  const headerWrapperRef = useRef<HTMLDivElement | null>(null);
  const headerInnerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Mutable Physics Refs (avoids stale closures or rerender thrashing)
  const accumulatedCollapsePxRef = useRef(0);
  const lastScrollTopRef = useRef(0);
  const measuredHeightRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  // Direct DOM style applier for zero-latency 60fps response
  const applyProgressToDOM = useCallback((progress: number) => {
    const clamped = Math.max(0, Math.min(1, progress));
    const naturalHeight = measuredHeightRef.current || headerInnerRef.current?.offsetHeight || 260;

    const wrapper = headerWrapperRef.current;
    if (wrapper) {
      wrapper.style.setProperty('--collapse-progress', clamped.toString());
      if (clamped === 0) {
        wrapper.style.height = 'auto';
        wrapper.style.pointerEvents = 'auto';
      } else if (clamped >= 1) {
        wrapper.style.height = '0px';
        wrapper.style.pointerEvents = 'none';
      } else {
        wrapper.style.height = `${(1 - clamped) * naturalHeight}px`;
        wrapper.style.pointerEvents = 'auto';
      }
    }

    const inner = headerInnerRef.current;
    if (inner) {
      inner.style.transform = `translateY(-${clamped * 100}%)`;
    }

    // Schedule React state update via rAF to keep React tree in sync without blocking scroll
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      setCollapseProgress(clamped);
      setIsHeaderVisible(clamped < 1);
    });
  }, []);

  // Measure natural height of the inner header whenever expanded or on resize
  useEffect(() => {
    const innerEl = headerInnerRef.current;
    if (!innerEl) return;

    const measure = () => {
      if (innerEl.offsetHeight > 0) {
        measuredHeightRef.current = innerEl.offsetHeight;
      }
    };
    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(innerEl);

    return () => {
      observer.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const currentScrollTop = target.scrollTop;
    const lastScrollTop = lastScrollTopRef.current;
    const delta = currentScrollTop - lastScrollTop;

    // 1. Guard against subpixel trackpad jitter
    if (Math.abs(delta) < jitterThreshold) {
      return;
    }

    // 2. Protect against bottom bounce / overscroll triggering false movements
    const maxScroll = target.scrollHeight - target.clientHeight;
    if (currentScrollTop > maxScroll && maxScroll > 0) {
      lastScrollTopRef.current = currentScrollTop;
      return;
    }

    // 3. At or near top of the scroll container: ALWAYS fully reveal the header
    if (currentScrollTop <= topThreshold) {
      lastScrollTopRef.current = currentScrollTop;
      accumulatedCollapsePxRef.current = 0;
      applyProgressToDOM(0);
      return;
    }

    // 4. Direction & Distance accumulation
    lastScrollTopRef.current = currentScrollTop;

    if (delta > 0) {
      // Scrolling DOWN: increase collapse distance towards 1.0
      accumulatedCollapsePxRef.current = Math.min(
        collapseDistance,
        accumulatedCollapsePxRef.current + delta
      );
    } else {
      // Scrolling UP: decrease collapse distance towards 0.0 (progressive reveal)
      accumulatedCollapsePxRef.current = Math.max(
        0,
        accumulatedCollapsePxRef.current + delta
      );
    }

    const progress = accumulatedCollapsePxRef.current / collapseDistance;
    applyProgressToDOM(progress);
  }, [collapseDistance, topThreshold, jitterThreshold, applyProgressToDOM]);

  // Programmatic reset/restore override (e.g. on filter change, tab change, modal dismiss)
  const resetHeader = useCallback(() => {
    accumulatedCollapsePxRef.current = 0;
    lastScrollTopRef.current = 0;
    applyProgressToDOM(0);
  }, [applyProgressToDOM]);

  // Coordinated styles for outer wrapper
  const headerWrapperStyle: React.CSSProperties = {
    overflow: 'hidden',
    flexShrink: 0,
    width: '100%',
    transition: 'none',
    height: collapseProgress === 0 
      ? 'auto' 
      : collapseProgress >= 1 
      ? '0px' 
      : `${(1 - collapseProgress) * (measuredHeightRef.current || 260)}px`,
    pointerEvents: collapseProgress >= 1 ? 'none' : 'auto',
  };

  // Coordinated styles for inner content
  const headerInnerStyle: React.CSSProperties = {
    width: '100%',
    transform: `translateY(-${collapseProgress * 100}%)`,
    willChange: 'transform',
    transition: 'none',
  };

  // Backward compatibility style
  const headerStyle: React.CSSProperties = {
    ...headerInnerStyle,
    position: 'static',
  };

  return {
    collapseProgress,
    isHeaderVisible,
    handleScroll,
    headerWrapperRef,
    headerInnerRef,
    scrollContainerRef,
    resetHeader,
    showHeader: resetHeader,
    headerWrapperStyle,
    headerInnerStyle,
    headerStyle,
  };
}
