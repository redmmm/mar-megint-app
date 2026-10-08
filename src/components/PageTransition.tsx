import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

type Direction = 'forward' | 'back' | 'neutral';

const getRouteDepth = (path: string): number => {
  if (path === '/') return 0;
  if (path.startsWith('/channel')) return 2; // subpage
  if (path.startsWith('/news')) return 1;
  if (path.startsWith('/weather')) return 1;
  if (path.startsWith('/skatemap') || path.startsWith('/skate-map')) return 1;
  if (path.startsWith('/login')) return 3;
  if (path.startsWith('/admin')) return 4;
  return 1;
};

const getTabOrder = (path: string): number => {
  if (path === '/') return 0;
  if (path.startsWith('/news')) return 1;
  if (path.startsWith('/weather')) return 2;
  if (path.startsWith('/skatemap') || path.startsWith('/skate-map')) return 3;
  return -1;
};

/**
 * Apple-style smooth directional page transition wrapper.
 * On route change:
 * 1. Exits current view with slide & scale (200ms)
 * 2. Swaps route and enters new view with Apple S-curve bezier (360ms)
 * 3. Directionally aware: going back slides right, going forward slides left.
 */
const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [direction, setDirection] = useState<Direction>('forward');

  const prevLocationRef = useRef(location);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (location.pathname === prevLocationRef.current.pathname) {
      return;
    }

    const prevPath = prevLocationRef.current.pathname;
    const currentPath = location.pathname;
    prevLocationRef.current = location;

    // Determine direction
    let dir: Direction = 'forward';
    const prevTab = getTabOrder(prevPath);
    const currTab = getTabOrder(currentPath);

    if (prevPath.startsWith('/channel') && currentPath === '/') {
      // Back to home from channel subpage
      dir = 'back';
    } else if (prevPath === '/' && currentPath.startsWith('/channel')) {
      // Forward to channel
      dir = 'forward';
    } else if (prevTab !== -1 && currTab !== -1) {
      // Between main nav tabs
      dir = currTab < prevTab ? 'back' : 'forward';
    } else {
      const prevDepth = getRouteDepth(prevPath);
      const currDepth = getRouteDepth(currentPath);
      dir = currDepth < prevDepth ? 'back' : 'forward';
    }

    setDirection(dir);
    setPhase('exit');

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Step 1: Smooth exit (200ms)
    timeoutRef.current = setTimeout(() => {
      // Step 2: Swap location to render new page and trigger enter
      setDisplayLocation(location);
      setPhase('enter');
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Step 3: Enter animation to idle (360ms)
      timeoutRef.current = setTimeout(() => {
        setPhase('idle');
      }, 360);
    }, 200);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location]);

  // Compute CSS styles based on transition phase & direction
  const getStyle = (): React.CSSProperties => {
    const easeAppleOut = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    const easeAppleExit = 'cubic-bezier(0.4, 0, 0.2, 1)';

    if (phase === 'exit') {
      const exitTranslateX = direction === 'back' ? '30px' : '-30px';
      return {
        opacity: 0,
        transform: `translateX(${exitTranslateX}) scale(0.985)`,
        transition: `opacity 0.2s ${easeAppleExit}, transform 0.2s ${easeAppleExit}`,
        willChange: 'opacity, transform',
        pointerEvents: 'none',
      };
    }

    if (phase === 'enter') {
      return {
        opacity: 1,
        transform: 'translateX(0px) scale(1)',
        transition: `opacity 0.36s ${easeAppleOut}, transform 0.36s ${easeAppleOut}`,
        willChange: 'opacity, transform',
      };
    }

    // Idle: remove transform and willChange completely so fixed-position descendants
    // are not captured by a transformed containing block on mobile devices
    return {};
  };

  // Clone Routes with the displayLocation so it keeps showing previous page during exit
  const content = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<{ location?: any }>, {
        location: displayLocation,
      })
    : children;

  return (
    <div
      ref={containerRef}
      style={getStyle()}
      className="min-h-screen w-full"
    >
      {content}
    </div>
  );
};

export default PageTransition;
